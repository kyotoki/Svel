import json

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import models
import schemas
from auth import get_current_user_id
from database import get_db

router = APIRouter(prefix="/profile", tags=["profile"])


def _to_schema(db_profile: models.UserProfile) -> schemas.UserProfile:
    """Deserializes the JSON-text certifications/gear columns into real
    lists for the API response - see models.py's UserProfile docstring for
    why they're stored as raw Text rather than a hybrid property."""
    return schemas.UserProfile(
        user_id=db_profile.user_id,
        first_name=db_profile.first_name,
        last_name=db_profile.last_name,
        nickname=db_profile.nickname,
        country_code=db_profile.country_code,
        photo_url=db_profile.photo_url,
        bio=db_profile.bio,
        certifications=json.loads(db_profile.certifications) if db_profile.certifications else [],
        gear=json.loads(db_profile.gear) if db_profile.gear else [],
    )


@router.get("/me", response_model=schemas.UserProfile)
def get_my_profile(
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    # A missing row is the signal the frontend uses to route a user into the
    # one-time onboarding flow, so a 404 here is an expected, normal response
    # rather than an error condition.
    profile = db.get(models.UserProfile, user_id)
    if profile is None:
        raise HTTPException(status_code=404, detail="Profile not found")
    return _to_schema(profile)


@router.put("/me", response_model=schemas.UserProfile)
def upsert_my_profile(
    profile: schemas.UserProfileCreate,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    data = profile.model_dump(exclude={"certifications", "gear"})
    data["certifications"] = json.dumps(profile.certifications)
    data["gear"] = json.dumps([item.model_dump() for item in profile.gear])

    db_profile = db.get(models.UserProfile, user_id)
    if db_profile is None:
        db_profile = models.UserProfile(user_id=user_id, **data)
        db.add(db_profile)
    else:
        for field, value in data.items():
            setattr(db_profile, field, value)
    db.commit()
    db.refresh(db_profile)
    return _to_schema(db_profile)
