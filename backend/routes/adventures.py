from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

import models
import schemas
from auth import get_current_user_id
from database import get_db
from marine_weather import fetch_marine_conditions
from storage import delete_photo

router = APIRouter(prefix="/adventures", tags=["adventures"])

MAX_PAGE_SIZE = 100


def _effective_date(adventure: models.Adventure) -> str:
    """The adventure's own date, or its creation date for legacy rows without one."""
    return adventure.date or adventure.created_at.date().isoformat()


@router.get("/", response_model=List[schemas.Adventure])
def list_adventures(
    limit: int = Query(50, ge=1, le=MAX_PAGE_SIZE),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    adventures = (
        db.query(models.Adventure)
        .filter(models.Adventure.user_id == user_id)
        .order_by(models.Adventure.id.desc())
        .all()
    )
    # Sort chronologically by the adventure's own date (Python's sort is
    # stable, so the id-desc order above still breaks ties on the same date),
    # then paginate in-memory since the sort key isn't a plain database column.
    adventures.sort(key=_effective_date, reverse=True)
    return adventures[offset : offset + limit]


@router.get("/{adventure_id}", response_model=schemas.Adventure)
def get_adventure(
    adventure_id: int,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    adventure = db.get(models.Adventure, adventure_id)
    if adventure is None or adventure.user_id != user_id:
        raise HTTPException(status_code=404, detail="Adventure not found")
    return adventure


@router.post("/", response_model=schemas.Adventure, status_code=201)
def create_adventure(
    adventure: schemas.AdventureCreate,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    conditions = fetch_marine_conditions(adventure.latitude, adventure.longitude)
    adventure_data = adventure.model_dump(exclude={"photos", "species"})
    db_adventure = models.Adventure(
        **adventure_data,
        user_id=user_id,
        water_temp_c=conditions["water_temp_c"] if conditions else None,
        wave_height_m=conditions["wave_height_m"] if conditions else None,
        tide_height_m=conditions["tide_height_m"] if conditions else None,
    )
    db_adventure.photos = [
        models.AdventurePhoto(url=url, position=position)
        for position, url in enumerate(adventure.photos)
    ]
    db_adventure.species = [
        models.AdventureSpecies(species_id=species_id) for species_id in adventure.species
    ]
    db.add(db_adventure)
    db.commit()
    db.refresh(db_adventure)
    return db_adventure


@router.delete("/{adventure_id}", status_code=204)
def delete_adventure(
    adventure_id: int,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    adventure = db.get(models.Adventure, adventure_id)
    if adventure is None or adventure.user_id != user_id:
        raise HTTPException(status_code=404, detail="Adventure not found")

    for photo in adventure.photos:
        delete_photo(photo.url)

    db.delete(adventure)
    db.commit()
    return None
