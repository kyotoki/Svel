from conftest import as_user, client, remove_auth_override, restore_auth_override


def create_dive(**overrides):
    payload = {
        "title": "Test Dive",
        "location_name": "Test Reef",
        "latitude": 1.0,
        "longitude": 2.0,
        "max_depth_meters": 15.0,
        "duration_minutes": 30,
        **overrides,
    }
    return client.post("/adventures/", json=payload)


def test_report_requires_authentication():
    remove_auth_override()
    try:
        resp = client.post("/reports/", json={"adventure_id": 1, "reason": "spam"})
        assert resp.status_code in (401, 403)
    finally:
        restore_auth_override()


def test_report_unknown_adventure_returns_404():
    as_user("user_a")
    resp = client.post("/reports/", json={"adventure_id": 999999, "reason": "spam"})
    assert resp.status_code == 404


def test_report_rejects_unknown_reason():
    as_user("user_a")
    adventure_id = create_dive().json()["id"]

    resp = client.post("/reports/", json={"adventure_id": adventure_id, "reason": "not_a_real_reason"})
    assert resp.status_code == 422


def test_report_whole_adventure():
    as_user("user_a")
    adventure_id = create_dive().json()["id"]

    as_user("user_b")
    resp = client.post(
        "/reports/",
        json={
            "adventure_id": adventure_id,
            "reason": "inappropriate_content",
            "details": "This doesn't look right.",
        },
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["adventure_id"] == adventure_id
    assert body["photo_url"] is None
    assert body["reason"] == "inappropriate_content"
    assert body["status"] == "pending"


def test_report_a_specific_photo():
    as_user("user_a")
    adventure_id = create_dive(photos=["http://example.com/a.jpg", "http://example.com/b.jpg"]).json()["id"]

    resp = client.post(
        "/reports/",
        json={
            "adventure_id": adventure_id,
            "photo_url": "http://example.com/b.jpg",
            "reason": "nudity_or_sexual_content",
        },
    )
    assert resp.status_code == 201
    assert resp.json()["photo_url"] == "http://example.com/b.jpg"


def test_reporting_your_own_content_is_allowed():
    """Not restricted by ownership - a user can report their own content
    (e.g. to flag it for their own removal request), and more importantly
    this mechanism is meant to keep working once social sharing makes other
    users' content visible, without needing an ownership carve-out later."""
    as_user("user_a")
    adventure_id = create_dive().json()["id"]

    resp = client.post("/reports/", json={"adventure_id": adventure_id, "reason": "other"})
    assert resp.status_code == 201
