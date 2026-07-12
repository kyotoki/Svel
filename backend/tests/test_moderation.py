from unittest import mock

import httpx
import pytest

import moderation


def _sightengine_response(nudity_overrides: dict) -> dict:
    base = {
        "sexual_activity": 0.01,
        "sexual_display": 0.01,
        "erotica": 0.01,
        "very_suggestive": 0.01,
        "suggestive": 0.01,
        "mildly_suggestive": 0.01,
        "none": 0.99,
    }
    base.update(nudity_overrides)
    return {"status": "success", "nudity": base}


def _mock_httpx_response(json_body: dict, status_code: int = 200):
    response = httpx.Response(status_code, json=json_body, request=httpx.Request("POST", moderation.SIGHTENGINE_CHECK_URL))
    return response


@pytest.fixture(autouse=True)
def sightengine_credentials(monkeypatch):
    monkeypatch.setattr(moderation, "SIGHTENGINE_API_USER", "test_user")
    monkeypatch.setattr(moderation, "SIGHTENGINE_API_SECRET", "test_secret")


def test_clean_image_is_not_rejected():
    payload = _sightengine_response({})
    with mock.patch("httpx.post", return_value=_mock_httpx_response(payload)):
        result = moderation.check_image_for_nudity(b"fake-jpeg-bytes")

    assert result.rejected is False
    assert result.flagged_categories == {}


def test_swimwear_and_bikini_style_suggestive_content_is_not_rejected():
    """The whole point of nudity-2.1 over a flat classifier: ordinary
    dive/snorkel/beach photos (bikinis, wetsuits, etc.) score high on the
    *suggestive* bands, not the explicit ones, and must not be rejected."""
    payload = _sightengine_response(
        {"very_suggestive": 0.85, "suggestive": 0.9, "mildly_suggestive": 0.95, "none": 0.05}
    )
    with mock.patch("httpx.post", return_value=_mock_httpx_response(payload)):
        result = moderation.check_image_for_nudity(b"fake-jpeg-bytes")

    assert result.rejected is False
    assert result.flagged_categories == {}


@pytest.mark.parametrize("category", ["sexual_activity", "sexual_display", "erotica"])
def test_each_explicit_category_triggers_rejection_above_threshold(category):
    payload = _sightengine_response({category: 0.9})
    with mock.patch("httpx.post", return_value=_mock_httpx_response(payload)):
        result = moderation.check_image_for_nudity(b"fake-jpeg-bytes")

    assert result.rejected is True
    assert category in result.flagged_categories
    assert result.flagged_categories[category] == 0.9


def test_explicit_category_just_below_threshold_does_not_reject():
    payload = _sightengine_response({"erotica": moderation.NUDITY_THRESHOLD - 0.01})
    with mock.patch("httpx.post", return_value=_mock_httpx_response(payload)):
        result = moderation.check_image_for_nudity(b"fake-jpeg-bytes")

    assert result.rejected is False


def test_missing_credentials_raises_unavailable_without_making_a_request():
    with mock.patch("moderation.SIGHTENGINE_API_USER", None):
        with mock.patch("httpx.post") as mock_post:
            with pytest.raises(moderation.ModerationUnavailableError):
                moderation.check_image_for_nudity(b"fake-jpeg-bytes")
        mock_post.assert_not_called()


def test_network_failure_raises_unavailable():
    with mock.patch("httpx.post", side_effect=httpx.ConnectTimeout("timed out")):
        with pytest.raises(moderation.ModerationUnavailableError):
            moderation.check_image_for_nudity(b"fake-jpeg-bytes")


def test_non_success_status_raises_unavailable():
    payload = {"status": "failure", "error": {"message": "bad api_user"}}
    with mock.patch("httpx.post", return_value=_mock_httpx_response(payload)):
        with pytest.raises(moderation.ModerationUnavailableError):
            moderation.check_image_for_nudity(b"fake-jpeg-bytes")


def test_malformed_response_raises_unavailable():
    payload = {"status": "success"}  # missing "nudity" entirely
    with mock.patch("httpx.post", return_value=_mock_httpx_response(payload)):
        with pytest.raises(moderation.ModerationUnavailableError):
            moderation.check_image_for_nudity(b"fake-jpeg-bytes")


def test_http_error_status_raises_unavailable():
    with mock.patch("httpx.post", return_value=_mock_httpx_response({}, status_code=500)):
        with pytest.raises(moderation.ModerationUnavailableError):
            moderation.check_image_for_nudity(b"fake-jpeg-bytes")
