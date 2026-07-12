from datetime import datetime, timedelta, timezone
from unittest import mock

import httpx
import pytest

import models
from conftest import TestingSessionLocal, as_user, client
from moderation import ModerationResult, ModerationUnavailableError
from scripts import moderation_admin


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


def make_report(db, **overrides):
    report = models.ContentReport(
        reporter_user_id="user_b",
        adventure_id=overrides.pop("adventure_id"),
        photo_url=overrides.pop("photo_url", None),
        reason=overrides.pop("reason", "spam"),
        **overrides,
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    return report


# ---------------------------------------------------------------------------
# Reports: list / resolve
# ---------------------------------------------------------------------------


def test_list_pending_reports_excludes_resolved():
    as_user("user_a")
    adventure_id = create_dive().json()["id"]

    db = TestingSessionLocal()
    try:
        pending = make_report(db, adventure_id=adventure_id)
        resolved = make_report(db, adventure_id=adventure_id, reason="other")
        resolved.status = "dismissed"
        db.commit()

        results = moderation_admin.list_pending_reports(db)
        assert [r.id for r in results] == [pending.id]
    finally:
        db.close()


def test_resolve_dismiss_leaves_content_in_place():
    as_user("user_a")
    adventure_id = create_dive().json()["id"]

    db = TestingSessionLocal()
    try:
        report = make_report(db, adventure_id=adventure_id)

        resolved = moderation_admin.resolve_report(db, report.id, "dismiss", reviewer_note="looks fine")
        assert resolved.status == "dismissed"
        assert resolved.reviewer_note == "looks fine"
        assert resolved.reviewed_at is not None
        assert db.get(models.Adventure, adventure_id) is not None
    finally:
        db.close()


def test_resolve_remove_deletes_the_whole_adventure_when_no_photo_named():
    as_user("user_a")
    adventure_id = create_dive().json()["id"]

    db = TestingSessionLocal()
    try:
        report = make_report(db, adventure_id=adventure_id)

        with mock.patch.object(moderation_admin, "delete_photo") as mock_delete_photo:
            resolved = moderation_admin.resolve_report(db, report.id, "remove")

        assert resolved.status == "removed"
        assert db.get(models.Adventure, adventure_id) is None
        mock_delete_photo.assert_not_called()  # this adventure had no photos
    finally:
        db.close()


def test_resolve_remove_deletes_only_the_named_photo():
    as_user("user_a")
    adventure_id = create_dive(
        photos=["http://example.com/keep.jpg", "http://example.com/remove.jpg"]
    ).json()["id"]

    db = TestingSessionLocal()
    try:
        report = make_report(db, adventure_id=adventure_id, photo_url="http://example.com/remove.jpg")

        with mock.patch.object(moderation_admin, "delete_photo") as mock_delete_photo:
            moderation_admin.resolve_report(db, report.id, "remove")

        mock_delete_photo.assert_called_once_with("http://example.com/remove.jpg")

        adventure = db.get(models.Adventure, adventure_id)
        assert adventure is not None  # the adventure itself survives
        remaining_urls = {p.url for p in adventure.photos}
        assert remaining_urls == {"http://example.com/keep.jpg"}
    finally:
        db.close()


def test_resolve_unknown_report_raises():
    db = TestingSessionLocal()
    try:
        with pytest.raises(LookupError):
            moderation_admin.resolve_report(db, 999999, "dismiss")
    finally:
        db.close()


def test_resolve_already_resolved_report_raises():
    as_user("user_a")
    adventure_id = create_dive().json()["id"]

    db = TestingSessionLocal()
    try:
        report = make_report(db, adventure_id=adventure_id)
        moderation_admin.resolve_report(db, report.id, "dismiss")

        with pytest.raises(ValueError):
            moderation_admin.resolve_report(db, report.id, "dismiss")
    finally:
        db.close()


# ---------------------------------------------------------------------------
# Recheck
# ---------------------------------------------------------------------------


def _make_skipped_row(db, photo_url="http://example.com/skipped.jpg", age=timedelta(0)):
    row = models.PhotoModeration(
        photo_url=photo_url,
        user_id="user_a",
        status="skipped",
        created_at=datetime.now(timezone.utc) - age,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def test_recheck_marks_clean_photo_as_checked():
    db = TestingSessionLocal()
    try:
        row = _make_skipped_row(db)
        clean_result = ModerationResult(rejected=False, scores={"none": 0.99}, flagged_categories={})

        with mock.patch.object(moderation_admin, "_fetch_photo_bytes", return_value=b"jpeg-bytes"):
            with mock.patch.object(moderation_admin, "check_image_for_nudity", return_value=clean_result):
                summary = moderation_admin.recheck_skipped_photos(db)

        assert summary.rechecked == 1
        assert summary.rejected_and_removed == []
        db.refresh(row)
        assert row.status == "checked"
        assert row.rechecked_at is not None
    finally:
        db.close()


def test_recheck_removes_a_photo_that_now_scores_explicit():
    as_user("user_a")
    adventure_id = create_dive(photos=["http://example.com/flagged.jpg"]).json()["id"]

    db = TestingSessionLocal()
    try:
        _make_skipped_row(db, photo_url="http://example.com/flagged.jpg")
        rejected_result = ModerationResult(
            rejected=True, scores={"erotica": 0.9}, flagged_categories={"erotica": 0.9}
        )

        with mock.patch.object(moderation_admin, "_fetch_photo_bytes", return_value=b"jpeg-bytes"):
            with mock.patch.object(moderation_admin, "check_image_for_nudity", return_value=rejected_result):
                with mock.patch.object(moderation_admin, "delete_photo") as mock_delete_photo:
                    summary = moderation_admin.recheck_skipped_photos(db)

        assert summary.rejected_and_removed == ["http://example.com/flagged.jpg"]
        mock_delete_photo.assert_called_once_with("http://example.com/flagged.jpg")

        adventure = db.get(models.Adventure, adventure_id)
        assert adventure.photos == []
    finally:
        db.close()


def test_recheck_leaves_status_skipped_when_still_unavailable():
    db = TestingSessionLocal()
    try:
        row = _make_skipped_row(db)

        with mock.patch.object(moderation_admin, "_fetch_photo_bytes", return_value=b"jpeg-bytes"):
            with mock.patch.object(
                moderation_admin, "check_image_for_nudity", side_effect=ModerationUnavailableError("still down")
            ):
                summary = moderation_admin.recheck_skipped_photos(db)

        assert summary.rechecked == 0
        assert summary.still_unavailable == 1
        db.refresh(row)
        assert row.status == "skipped"
    finally:
        db.close()


def test_recheck_leaves_status_skipped_when_fetching_the_stored_photo_fails():
    """The photo itself might be unreachable (storage hiccup), independent of
    Sightengine's own availability - either way this must not crash the run
    or lose the row."""
    db = TestingSessionLocal()
    try:
        row = _make_skipped_row(db)

        with mock.patch.object(
            moderation_admin, "_fetch_photo_bytes", side_effect=httpx.ConnectError("unreachable")
        ):
            summary = moderation_admin.recheck_skipped_photos(db)

        assert summary.still_unavailable == 1
        db.refresh(row)
        assert row.status == "skipped"
    finally:
        db.close()


# ---------------------------------------------------------------------------
# 24h backlog alert
# ---------------------------------------------------------------------------


def test_alert_flags_only_photos_older_than_the_threshold(caplog):
    db = TestingSessionLocal()
    try:
        _make_skipped_row(db, photo_url="http://example.com/fresh.jpg", age=timedelta(hours=1))
        _make_skipped_row(db, photo_url="http://example.com/stale.jpg", age=timedelta(hours=25))

        stale = moderation_admin.alert_on_stale_skipped_photos(db)

        assert [row.photo_url for row in stale] == ["http://example.com/stale.jpg"]
    finally:
        db.close()


def test_alert_logs_a_warning_when_backlog_exists(caplog):
    db = TestingSessionLocal()
    try:
        _make_skipped_row(db, age=timedelta(hours=48))

        with caplog.at_level("WARNING", logger="scripts.moderation_admin"):
            moderation_admin.alert_on_stale_skipped_photos(db)

        assert any("backlog" in record.message.lower() for record in caplog.records)
    finally:
        db.close()


def test_alert_is_silent_when_nothing_is_stale(caplog):
    db = TestingSessionLocal()
    try:
        _make_skipped_row(db, age=timedelta(hours=1))

        with caplog.at_level("WARNING", logger="scripts.moderation_admin"):
            stale = moderation_admin.alert_on_stale_skipped_photos(db)

        assert stale == []
        assert caplog.records == []
    finally:
        db.close()
