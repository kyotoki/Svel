from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

import models
import schemas
from auth import get_current_user_id
from database import get_db

router = APIRouter(prefix="/reports", tags=["reports"])


@router.post("/", response_model=schemas.ContentReport, status_code=status.HTTP_201_CREATED)
def create_report(
    report: schemas.ContentReportCreate,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    """Log a "report this content" action for later manual review.

    No social/public sharing exists yet, so today this can only realistically
    be reached from a user's own content, but it's intentionally unrestricted
    by ownership - any authenticated user can report any adventure_id, ahead
    of a future feed/social feature actually making other users' content
    reachable. Reviewing and acting on reports is a manual, admin-only
    process for now - see scripts/moderation_admin.py.
    """
    adventure = db.get(models.Adventure, report.adventure_id)
    if adventure is None:
        raise HTTPException(status_code=404, detail="Adventure not found")

    db_report = models.ContentReport(
        reporter_user_id=user_id,
        adventure_id=report.adventure_id,
        photo_url=report.photo_url,
        reason=report.reason,
        details=report.details,
    )
    db.add(db_report)
    db.commit()
    db.refresh(db_report)
    return db_report
