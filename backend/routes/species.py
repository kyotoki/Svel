import json
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

import models
from auth import get_current_user_id
from database import get_db
from gbif_species import fetch_nearby_species

router = APIRouter(prefix="/species", tags=["species"])

# Species-occurrence patterns near a given location don't meaningfully shift
# week to week, so a cached GBIF response stays useful for a long time -
# 30 days trades a little staleness for far fewer upstream calls.
CACHE_TTL = timedelta(days=30)

# Roughly matches gbif_species.SEARCH_RADIUS_KM (a 0.5 degree cell is
# ~55km on a side at the equator, shrinking with longitude at higher
# latitudes) - close enough that dive sites sharing a cache cell also
# share a broadly similar species pool.
BUCKET_SIZE_DEGREES = 0.5


def _bucket(value: float) -> float:
    return round(value / BUCKET_SIZE_DEGREES) * BUCKET_SIZE_DEGREES


@router.get("/nearby")
def get_nearby_species(
    latitude: float = Query(..., ge=-90, le=90),
    longitude: float = Query(..., ge=-180, le=180),
    # Accepted for forward compatibility with a future freshwater/fishing
    # feature, but currently a no-op here: GBIF is queried the same way
    # either way (kingdom Animalia, no habitat filter - see
    # gbif_species.ANIMALIA_KINGDOM_KEY), because the actual marine-vs-not
    # narrowing happens on the frontend, which matches these raw results
    # against whichever curated species vocabulary is active for the
    # adventure's activity type (see utils/nearbySpecies.ts). This endpoint
    # stays a generic "what's been recorded near here" proxy so adding that
    # second vocabulary later doesn't require a second endpoint or query path.
    marine_only: bool = Query(True),
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    lat_bucket = _bucket(latitude)
    lon_bucket = _bucket(longitude)

    cached = (
        db.query(models.SpeciesLocationCache)
        .filter_by(lat_bucket=lat_bucket, lon_bucket=lon_bucket)
        .first()
    )
    now = datetime.now(timezone.utc)
    if cached is not None and _as_utc(cached.fetched_at) > now - CACHE_TTL:
        return json.loads(cached.payload_json)

    results = fetch_nearby_species(latitude, longitude)
    payload_json = json.dumps(results)

    if cached is not None:
        cached.payload_json = payload_json
        cached.fetched_at = now
    else:
        db.add(
            models.SpeciesLocationCache(
                lat_bucket=lat_bucket,
                lon_bucket=lon_bucket,
                payload_json=payload_json,
                fetched_at=now,
            )
        )
    db.commit()

    return results


def _as_utc(value: datetime) -> datetime:
    # SQLite (used locally) drops tzinfo on round-trip through a plain
    # DateTime column, even though it was written as UTC-aware - without
    # this, comparing it against an aware `now` below raises instead of
    # just working the same way it does against Postgres.
    return value if value.tzinfo is not None else value.replace(tzinfo=timezone.utc)
