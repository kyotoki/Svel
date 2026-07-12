import io
from unittest import mock

import pytest
from PIL import Image

import models
import storage as storage_module
from conftest import TestingSessionLocal, as_user, client, remove_auth_override, reset_current_user, restore_auth_override
from moderation import ModerationResult, ModerationUnavailableError
from routes import uploads as uploads_module


@pytest.fixture(autouse=True)
def isolated_upload_root(tmp_path, monkeypatch):
    # Forces the local-disk branch regardless of ambient S3_* env vars, so
    # this suite deterministically covers the disk-fallback path whether it's
    # run bare or inside the Docker stack (where S3_BUCKET_NAME is set).
    monkeypatch.setattr(storage_module, "USE_S3", False)
    monkeypatch.setattr(storage_module, "UPLOAD_ROOT", tmp_path)
    reset_current_user()
    yield tmp_path


def make_png_bytes() -> bytes:
    buffer = io.BytesIO()
    Image.new("RGB", (4, 4), color="cyan").save(buffer, format="PNG")
    return buffer.getvalue()


def test_valid_image_upload_is_converted_and_stored(isolated_upload_root):
    as_user("user_a")
    resp = client.post(
        "/uploads/",
        files={"file": ("dive.png", make_png_bytes(), "image/png")},
    )
    assert resp.status_code == 201
    url = resp.json()["url"]
    assert "/uploads/user_a/" in url
    assert url.endswith(".jpg")

    stored_files = list((isolated_upload_root / "user_a").glob("*.jpg"))
    assert len(stored_files) == 1
    # Re-opening confirms it was actually re-encoded as a real JPEG, not just renamed.
    with Image.open(stored_files[0]) as saved:
        assert saved.format == "JPEG"


def test_rejects_disallowed_content_type():
    resp = client.post(
        "/uploads/",
        files={"file": ("dive.pdf", b"%PDF-1.4 not an image", "application/pdf")},
    )
    assert resp.status_code == 415


def test_rejects_content_that_is_not_actually_an_image():
    resp = client.post(
        "/uploads/",
        files={"file": ("dive.jpg", b"this is not image data", "image/jpeg")},
    )
    assert resp.status_code == 400


def test_rejects_oversized_upload(monkeypatch):
    monkeypatch.setattr(uploads_module, "MAX_UPLOAD_BYTES", 10)
    resp = client.post(
        "/uploads/",
        files={"file": ("dive.png", make_png_bytes(), "image/png")},
    )
    assert resp.status_code == 413


def test_upload_requires_authentication():
    remove_auth_override()
    try:
        resp = client.post(
            "/uploads/",
            files={"file": ("dive.png", make_png_bytes(), "image/png")},
        )
        assert resp.status_code in (401, 403)
    finally:
        restore_auth_override()


def test_two_users_photos_are_stored_separately(isolated_upload_root):
    as_user("user_a")
    client.post("/uploads/", files={"file": ("a.png", make_png_bytes(), "image/png")})

    as_user("user_b")
    client.post("/uploads/", files={"file": ("b.png", make_png_bytes(), "image/png")})

    assert len(list((isolated_upload_root / "user_a").glob("*.jpg"))) == 1
    assert len(list((isolated_upload_root / "user_b").glob("*.jpg"))) == 1


def test_successful_upload_records_a_checked_moderation_row(isolated_upload_root):
    as_user("user_a")
    resp = client.post(
        "/uploads/",
        files={"file": ("dive.png", make_png_bytes(), "image/png")},
    )
    assert resp.status_code == 201
    url = resp.json()["url"]

    db = TestingSessionLocal()
    try:
        row = db.query(models.PhotoModeration).filter(models.PhotoModeration.photo_url == url).one()
        assert row.status == "checked"
        assert row.user_id == "user_a"
        assert row.nudity_scores is not None
    finally:
        db.close()


def test_flagged_image_is_rejected_before_storage(isolated_upload_root):
    """The core moderation contract: an image Sightengine scores as explicit
    must never reach save_photo (no file on disk, no URL, no DB row) and must
    return a clear, non-500 error rather than silently dropping the photo."""
    as_user("user_a")
    rejected_result = ModerationResult(
        rejected=True,
        scores={"sexual_activity": 0.02, "sexual_display": 0.91, "erotica": 0.4, "none": 0.01},
        flagged_categories={"sexual_display": 0.91},
    )
    with mock.patch.object(uploads_module, "check_image_for_nudity", return_value=rejected_result):
        resp = client.post(
            "/uploads/",
            files={"file": ("dive.png", make_png_bytes(), "image/png")},
        )

    assert resp.status_code == 422
    assert "explicit content" in resp.json()["detail"]

    # Nothing was written to storage.
    assert list((isolated_upload_root / "user_a").glob("*.jpg")) == []

    # No moderation row either - a rejected upload was never "stored", so
    # there's nothing to have a row about (see PhotoModeration's docstring).
    db = TestingSessionLocal()
    try:
        assert db.query(models.PhotoModeration).count() == 0
    finally:
        db.close()


def test_upload_fails_open_when_moderation_is_unavailable(isolated_upload_root):
    """A Sightengine outage/misconfiguration must not block uploads (the
    product decision documented in routes/uploads.py) - the photo is stored,
    but flagged for a later recheck rather than silently treated as clean."""
    as_user("user_a")
    with mock.patch.object(
        uploads_module, "check_image_for_nudity", side_effect=ModerationUnavailableError("boom")
    ):
        resp = client.post(
            "/uploads/",
            files={"file": ("dive.png", make_png_bytes(), "image/png")},
        )

    assert resp.status_code == 201
    url = resp.json()["url"]
    assert len(list((isolated_upload_root / "user_a").glob("*.jpg"))) == 1

    db = TestingSessionLocal()
    try:
        row = db.query(models.PhotoModeration).filter(models.PhotoModeration.photo_url == url).one()
        assert row.status == "skipped"
        assert row.nudity_scores is None
    finally:
        db.close()
