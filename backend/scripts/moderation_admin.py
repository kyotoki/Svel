"""Admin-only content moderation tooling - no UI, run directly.

This is the documented "direct-database or API-based process" for reviewing
reported content and retroactively rechecking photos that were stored
unmoderated because Sightengine was unreachable at upload time (see
routes/uploads.py's fail-open behavior and moderation.py). There is no admin
role/auth system in this app yet, so this is a script you run yourself
against the same database the API uses - not a new authenticated endpoint.

Usage (from backend/, with the venv active and .env loaded):

    # See what's waiting for a human decision.
    python -m scripts.moderation_admin reports list

    # Remove the reported content (the specific photo if the report named
    # one, otherwise the whole adventure) and mark the report resolved.
    python -m scripts.moderation_admin reports resolve 4 --action remove --note "confirmed explicit"

    # Mark a report reviewed with no action taken (e.g. a bad-faith report).
    python -m scripts.moderation_admin reports resolve 5 --action dismiss --note "not a violation"

    # Re-scan every photo that was stored unmoderated (Sightengine was down
    # at upload time), removing any that now score as explicit. Also warns
    # about anything that's been unscanned for more than 24 hours, whether or
    # not this particular run could reach Sightengine for it. Safe to run
    # repeatedly - run this by hand for now given current volume; wiring it
    # to cron/a scheduled task is a config change, not a code change, once
    # that's worth setting up.
    python -m scripts.moderation_admin recheck
"""

import argparse
import logging
import sys
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone

import httpx
from sqlalchemy.orm import Session

import models
from database import SessionLocal
from logging_config import configure_logging
from moderation import ModerationUnavailableError, check_image_for_nudity
from storage import delete_photo

configure_logging()
logger = logging.getLogger(__name__)

STALE_SKIPPED_THRESHOLD = timedelta(hours=24)
FETCH_TIMEOUT_SECONDS = 15.0

VALID_RESOLUTIONS = ("remove", "dismiss")


# ---------------------------------------------------------------------------
# Reports: list / resolve
# ---------------------------------------------------------------------------


def list_pending_reports(db: Session) -> list[models.ContentReport]:
    return (
        db.query(models.ContentReport)
        .filter(models.ContentReport.status == "pending")
        .order_by(models.ContentReport.created_at.asc())
        .all()
    )


def resolve_report(
    db: Session,
    report_id: int,
    action: str,
    *,
    reviewer_note: str | None = None,
) -> models.ContentReport:
    """action is "remove" (delete the reported content, mark status="removed")
    or "dismiss" (no content change, mark status="dismissed")."""
    if action not in VALID_RESOLUTIONS:
        raise ValueError(f"action must be one of {VALID_RESOLUTIONS}, got {action!r}")

    report = db.get(models.ContentReport, report_id)
    if report is None:
        raise LookupError(f"No report with id={report_id}")
    if report.status != "pending":
        raise ValueError(f"Report {report_id} is already resolved (status={report.status!r})")

    if action == "remove":
        _remove_reported_content(db, report)
        report.status = "removed"
    else:
        report.status = "dismissed"

    report.reviewed_at = datetime.now(timezone.utc)
    report.reviewer_note = reviewer_note
    db.commit()
    db.refresh(report)
    return report


def _remove_reported_content(db: Session, report: models.ContentReport) -> None:
    if report.photo_url:
        _delete_photo_everywhere(db, report.photo_url)
        return

    if report.adventure_id is None:
        # The adventure was already deleted some other way (e.g. the user
        # deleted it themselves) before this report was resolved - nothing
        # left to remove.
        return

    adventure = db.get(models.Adventure, report.adventure_id)
    if adventure is None:
        return
    for photo in adventure.photos:
        delete_photo(photo.url)
    db.delete(adventure)


def _delete_photo_everywhere(db: Session, photo_url: str) -> None:
    """Removes one photo: any AdventurePhoto rows referencing it, and the
    stored object itself. Leaves the rest of its adventure (if any) intact -
    used when a report names a specific photo rather than the whole
    adventure."""
    matching = db.query(models.AdventurePhoto).filter(models.AdventurePhoto.url == photo_url).all()
    for row in matching:
        db.delete(row)
    delete_photo(photo_url)


# ---------------------------------------------------------------------------
# Recheck: retroactively re-scan photos stored while Sightengine was down
# ---------------------------------------------------------------------------


@dataclass
class RecheckSummary:
    rechecked: int = 0
    rejected_and_removed: list[str] = field(default_factory=list)
    still_unavailable: int = 0
    stale: list[models.PhotoModeration] = field(default_factory=list)


def _fetch_photo_bytes(photo_url: str) -> bytes:
    response = httpx.get(photo_url, timeout=FETCH_TIMEOUT_SECONDS)
    response.raise_for_status()
    return response.content


def recheck_skipped_photos(db: Session) -> RecheckSummary:
    summary = RecheckSummary()
    skipped = db.query(models.PhotoModeration).filter(models.PhotoModeration.status == "skipped").all()

    for row in skipped:
        try:
            image_bytes = _fetch_photo_bytes(row.photo_url)
            result = check_image_for_nudity(image_bytes)
        except (ModerationUnavailableError, httpx.HTTPError):
            logger.warning(
                "Recheck could not reach Sightengine or the stored photo - will retry next run",
                extra={"photo_url": row.photo_url},
                exc_info=True,
            )
            summary.still_unavailable += 1
            continue

        row.status = "checked"
        row.nudity_scores = result.scores_json
        row.rechecked_at = datetime.now(timezone.utc)
        summary.rechecked += 1

        if result.rejected:
            logger.warning(
                "Recheck found a previously-unmoderated photo now scores as explicit - removing",
                extra={"photo_url": row.photo_url, "flagged_categories": result.flagged_categories},
            )
            _delete_photo_everywhere(db, row.photo_url)
            summary.rejected_and_removed.append(row.photo_url)

    db.commit()

    summary.stale = alert_on_stale_skipped_photos(db)
    return summary


def alert_on_stale_skipped_photos(
    db: Session, *, older_than: timedelta = STALE_SKIPPED_THRESHOLD
) -> list[models.PhotoModeration]:
    """Logs a warning (not an exception - this must never crash the caller)
    for every photo that's been sitting unmoderated longer than `older_than`,
    so a Sightengine outage that outlasts a day doesn't silently accumulate
    an unscanned backlog. Returns the stale rows so a caller (or a test) can
    inspect them directly instead of parsing logs."""
    cutoff = datetime.now(timezone.utc) - older_than
    stale = (
        db.query(models.PhotoModeration)
        .filter(models.PhotoModeration.status == "skipped")
        .filter(models.PhotoModeration.created_at < cutoff)
        .all()
    )
    if stale:
        logger.warning(
            "Moderation backlog: %d photo(s) have been unscanned for more than %s",
            len(stale),
            older_than,
            extra={"photo_urls": [row.photo_url for row in stale]},
        )
    return stale


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------


def _cmd_reports_list(args: argparse.Namespace) -> None:
    db = SessionLocal()
    try:
        reports = list_pending_reports(db)
        if not reports:
            print("No pending reports.")
            return
        for r in reports:
            print(
                f"[{r.id}] adventure_id={r.adventure_id} photo_url={r.photo_url or '(whole adventure)'} "
                f"reason={r.reason} reported_by={r.reporter_user_id} at={r.created_at.isoformat()}"
            )
            if r.details:
                print(f"      details: {r.details}")
    finally:
        db.close()


def _cmd_reports_resolve(args: argparse.Namespace) -> None:
    db = SessionLocal()
    try:
        report = resolve_report(db, args.report_id, args.action, reviewer_note=args.note)
        print(f"Report {report.id} -> {report.status}")
    except (LookupError, ValueError) as exc:
        print(f"Error: {exc}", file=sys.stderr)
        sys.exit(1)
    finally:
        db.close()


def _cmd_recheck(args: argparse.Namespace) -> None:
    db = SessionLocal()
    try:
        summary = recheck_skipped_photos(db)
        print(f"Rechecked: {summary.rechecked}")
        print(f"Removed (now scored explicit): {len(summary.rejected_and_removed)}")
        for url in summary.rejected_and_removed:
            print(f"  - {url}")
        print(f"Still unavailable this run: {summary.still_unavailable}")
        print(f"Stale (>24h unscanned) after this run: {len(summary.stale)}")
    finally:
        db.close()


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    subparsers = parser.add_subparsers(dest="command", required=True)

    reports_parser = subparsers.add_parser("reports", help="Review reported content.")
    reports_sub = reports_parser.add_subparsers(dest="reports_command", required=True)

    reports_sub.add_parser("list", help="List pending reports.").set_defaults(func=_cmd_reports_list)

    resolve_parser = reports_sub.add_parser("resolve", help="Resolve a pending report.")
    resolve_parser.add_argument("report_id", type=int)
    resolve_parser.add_argument("--action", choices=VALID_RESOLUTIONS, required=True)
    resolve_parser.add_argument("--note", default=None, help="Optional reviewer note.")
    resolve_parser.set_defaults(func=_cmd_reports_resolve)

    subparsers.add_parser(
        "recheck", help="Re-scan photos stored while Sightengine was unreachable."
    ).set_defaults(func=_cmd_recheck)

    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
