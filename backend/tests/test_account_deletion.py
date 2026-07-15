from unittest import mock

import pytest

import models
import storage as storage_module
from conftest import (
    TestingSessionLocal,
    as_user,
    client,
    remove_auth_override,
    reset_current_user,
    restore_auth_override,
)
from routes import account as account_module


@pytest.fixture(autouse=True)
def isolated_upload_root(tmp_path, monkeypatch):
    monkeypatch.setattr(storage_module, "USE_S3", False)
    monkeypatch.setattr(storage_module, "UPLOAD_ROOT", tmp_path)
    reset_current_user()
    yield tmp_path


@pytest.fixture(autouse=True)
def fake_clerk_secret_key(monkeypatch):
    # routes/account.py imports CLERK_SECRET_KEY directly from auth.py
    # (unlike the other routes, which only ever see it indirectly through
    # the overridden get_current_user_id dependency) - it needs a truthy
    # value here or every deletion in this file 500s before ever reaching
    # the (also mocked) Clerk call below.
    monkeypatch.setattr(account_module, "CLERK_SECRET_KEY", "sk_test_fake_for_tests")


def create_dive(**overrides):
    payload = {
        "title": "Test Dive",
        "location_name": "Test Reef",
        "latitude": 1.0,
        "longitude": 2.0,
        "max_depth_meters": 15.0,
        "duration_minutes": 30,
        "species": ["fish-clownfish"],
        **overrides,
    }
    return client.post("/adventures/", json=payload)


def upload_photo():
    resp = client.post(
        "/uploads/",
        files={"file": ("dive.png", _png_bytes(), "image/png")},
    )
    assert resp.status_code == 201
    return resp.json()["url"]


def _png_bytes() -> bytes:
    import io

    from PIL import Image

    buffer = io.BytesIO()
    Image.new("RGB", (4, 4), color="cyan").save(buffer, format="PNG")
    return buffer.getvalue()


def test_deletion_removes_everything_the_user_owns():
    as_user("user_a")

    attached_photo_url = upload_photo()
    orphaned_photo_url = upload_photo()  # uploaded, never attached to any adventure

    dive_resp = create_dive(photos=[attached_photo_url])
    assert dive_resp.status_code == 201
    dive_id = dive_resp.json()["id"]

    client.put("/profile/me", json={"first_name": "A", "last_name": "Diver"})
    report_resp = client.post(
        "/reports/",
        json={"adventure_id": dive_id, "reason": "spam", "details": "looks staged"},
    )
    assert report_resp.status_code == 201
    report_id = report_resp.json()["id"]

    db = TestingSessionLocal()
    try:
        assert db.query(models.Adventure).filter_by(user_id="user_a").count() == 1
        assert db.query(models.AdventureSpecies).filter_by(adventure_id=dive_id).count() == 1
        assert db.query(models.PhotoModeration).filter_by(user_id="user_a").count() == 2
        assert db.get(models.UserProfile, "user_a") is not None
        assert db.get(models.ContentReport, report_id).reporter_user_id == "user_a"
    finally:
        db.close()

    fake_clerk = mock.Mock()
    with mock.patch.object(account_module, "Clerk", return_value=fake_clerk):
        resp = client.delete("/account/me")

    assert resp.status_code == 204
    fake_clerk.users.delete.assert_called_once_with(user_id="user_a")

    db = TestingSessionLocal()
    try:
        assert db.query(models.Adventure).filter_by(user_id="user_a").count() == 0
        assert db.query(models.AdventureSpecies).filter_by(adventure_id=dive_id).count() == 0
        assert db.query(models.PhotoModeration).filter_by(user_id="user_a").count() == 0
        assert db.get(models.UserProfile, "user_a") is None

        # Anonymized, not deleted: the report itself, the content it points
        # at, and its moderation state all survive the reporter's deletion -
        # only the identifying link back to the (now-gone) reporter is gone.
        report = db.get(models.ContentReport, report_id)
        assert report is not None
        assert report.reporter_user_id is None
        assert report.adventure_id == dive_id
        assert report.reason == "spam"
        assert report.details == "looks staged"
        assert report.status == "pending"
    finally:
        db.close()

    # The actual files, not just the DB rows - both the attached photo and
    # the one that was uploaded but never attached to any adventure.
    from urllib.parse import urlparse

    from storage import UPLOAD_ROOT

    for url in (attached_photo_url, orphaned_photo_url):
        relative_path = urlparse(url).path.removeprefix("/uploads/")
        assert not (UPLOAD_ROOT / relative_path).exists()


def test_deletion_does_not_touch_another_users_data():
    as_user("user_a")
    create_dive(title="A's Dive")

    as_user("user_b")
    b_dive = create_dive(title="B's Dive").json()["id"]
    client.put("/profile/me", json={"first_name": "B", "last_name": "Diver"})

    fake_clerk = mock.Mock()
    with mock.patch.object(account_module, "Clerk", return_value=fake_clerk):
        resp = client.delete("/account/me")
    assert resp.status_code == 204

    db = TestingSessionLocal()
    try:
        assert db.query(models.Adventure).filter_by(user_id="user_a").count() == 1
        assert db.get(models.Adventure, b_dive) is None
    finally:
        db.close()

    as_user("user_a")
    resp = client.get("/adventures/")
    assert {a["title"] for a in resp.json()} == {"A's Dive"}


def test_a_reported_adventure_belonging_to_someone_else_survives_the_reporters_deletion():
    as_user("user_a")
    dive_id = create_dive(title="A's Dive").json()["id"]

    as_user("user_b")
    report_resp = client.post(
        "/reports/", json={"adventure_id": dive_id, "reason": "spam", "details": None}
    )
    report_id = report_resp.json()["id"]

    fake_clerk = mock.Mock()
    with mock.patch.object(account_module, "Clerk", return_value=fake_clerk):
        resp = client.delete("/account/me")
    assert resp.status_code == 204

    db = TestingSessionLocal()
    try:
        # user_b's reporter link is anonymized (they deleted their account)...
        assert db.query(models.ContentReport).filter_by(reporter_user_id="user_b").count() == 0
        # ...but the report itself survives, still pointing at the reported
        # adventure - this is the actual safety-record behavior being tested
        # here, not just that user_b's link is gone.
        report = db.get(models.ContentReport, report_id)
        assert report is not None
        assert report.reporter_user_id is None
        assert report.adventure_id == dive_id
        # ...and the adventure they reported, which belongs to user_a (not
        # user_b), is untouched.
        assert db.get(models.Adventure, dive_id) is not None
    finally:
        db.close()


def test_local_data_is_gone_even_if_the_clerk_deletion_call_fails():
    as_user("user_a")
    create_dive()

    fake_clerk = mock.Mock()
    fake_clerk.users.delete.side_effect = RuntimeError("Clerk API unreachable")
    with mock.patch.object(account_module, "Clerk", return_value=fake_clerk):
        resp = client.delete("/account/me")

    assert resp.status_code == 502

    db = TestingSessionLocal()
    try:
        # Local cleanup already committed before the Clerk call ran, so it's
        # gone regardless of the Clerk-side failure - see delete_my_account's
        # docstring for why this ordering was chosen.
        assert db.query(models.Adventure).filter_by(user_id="user_a").count() == 0
    finally:
        db.close()


def test_deleting_account_removes_the_profile_photo_from_storage_not_just_adventure_photos():
    # Matches the real frontend flow (hooks/useProfileData.ts's
    # handleAvatarPress): upload first to get a real URL, then set it as
    # the profile's photo_url via PUT /profile/me - not an adventure photo,
    # and not merely an orphaned upload either. Proven directly against the
    # actual storage backend (local-disk here, the same storage.py code
    # path R2 uses in production/staging - see isolated_upload_root above),
    # not inferred from PhotoModeration cleanup being shared with adventures.
    as_user("user_a")
    photo_url = upload_photo()

    profile_resp = client.put(
        "/profile/me",
        json={"first_name": "A", "last_name": "Diver", "photo_url": photo_url},
    )
    assert profile_resp.status_code == 200
    assert profile_resp.json()["photo_url"] == photo_url

    from urllib.parse import urlparse

    from storage import UPLOAD_ROOT

    photo_path = UPLOAD_ROOT / urlparse(photo_url).path.removeprefix("/uploads/")
    assert photo_path.exists(), "sanity check failed: photo should exist on disk before deletion"

    fake_clerk = mock.Mock()
    with mock.patch.object(account_module, "Clerk", return_value=fake_clerk):
        resp = client.delete("/account/me")
    assert resp.status_code == 204

    assert not photo_path.exists(), "profile photo file was not deleted from storage on account deletion"

    db = TestingSessionLocal()
    try:
        assert db.get(models.UserProfile, "user_a") is None
        assert db.query(models.PhotoModeration).filter_by(user_id="user_a").count() == 0
    finally:
        db.close()


def test_unauthenticated_deletion_is_rejected():
    remove_auth_override()
    try:
        resp = client.delete("/account/me")
        assert resp.status_code in (401, 403)
    finally:
        restore_auth_override()
