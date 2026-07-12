from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.orm import relationship

from database import Base


class Adventure(Base):
    __tablename__ = "adventures"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(String, nullable=False, index=True)
    title = Column(String, nullable=False)
    # The date the adventure took place (YYYY-MM-DD, user-selected) - distinct
    # from created_at, which is when the record was inserted. Nullable so
    # legacy rows predating this column don't break; the API layer falls back
    # to created_at for those.
    date = Column(String, nullable=True)
    # `default` (evaluated in Python at INSERT time) covers rows on databases
    # migrated via ALTER TABLE, where SQLite's ALTER syntax can't attach a
    # CURRENT_TIMESTAMP default to the column; `server_default` handles inserts
    # from outside the ORM on freshly created tables.
    created_at = Column(
        DateTime, nullable=False, default=lambda: datetime.now(timezone.utc), server_default=func.now()
    )
    location_name = Column(String, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    max_depth_meters = Column(Float, nullable=False)
    duration_minutes = Column(Integer, nullable=False)
    notes = Column(Text, nullable=True)
    # Superseded by the `photos` relationship below (one adventure can now
    # have many photos) - left in place, unused, so existing SQLite files
    # don't need a destructive column drop. The migration backfills any
    # legacy value here into a single `adventure_photos` row instead.
    photo_url = Column(String, nullable=True)
    water_temp_c = Column(Float, nullable=True)
    wave_height_m = Column(Float, nullable=True)
    tide_height_m = Column(Float, nullable=True)
    activity_type = Column(String, nullable=False, default="scuba", server_default="scuba")
    tank_pressure_bar = Column(Float, nullable=True)
    gas_mix = Column(String, nullable=True)

    photos = relationship(
        "AdventurePhoto",
        order_by="AdventurePhoto.position",
        cascade="all, delete-orphan",
    )
    species = relationship(
        "AdventureSpecies",
        cascade="all, delete-orphan",
    )


class AdventurePhoto(Base):
    __tablename__ = "adventure_photos"

    id = Column(Integer, primary_key=True, autoincrement=True)
    adventure_id = Column(Integer, ForeignKey("adventures.id", ondelete="CASCADE"), nullable=False, index=True)
    url = Column(String, nullable=False)
    position = Column(Integer, nullable=False, default=0)


class AdventureSpecies(Base):
    """One row per species tagged as spotted during a given adventure -
    mirrors AdventurePhoto's one-to-many shape exactly.

    `species_id` references constants/marineLife.ts's Species.id on the
    frontend (e.g. "fish-clownfish") but is deliberately an unconstrained
    string here, not a backend enum or lookup table - the same choice
    already made for `Adventure.activity_type`, so the frontend's curated
    species list can keep growing without a backend migration."""

    __tablename__ = "adventure_species"
    __table_args__ = (UniqueConstraint("adventure_id", "species_id", name="uq_adventure_species"),)

    id = Column(Integer, primary_key=True, autoincrement=True)
    adventure_id = Column(Integer, ForeignKey("adventures.id", ondelete="CASCADE"), nullable=False, index=True)
    species_id = Column(String, nullable=False, index=True)


class SpeciesLocationCache(Base):
    """Caches GBIF's "what species have been recorded near here" response
    (see gbif_species.py) per general location, so the species picker's
    nearby-suggestions feature doesn't re-hit GBIF on every open of the same
    dive site - see routes/species.py for the cache lookup/write and its TTL.

    Keyed on a coarse lat/lon grid cell (rounded to the nearest 0.5 degree,
    roughly matching gbif_species.SEARCH_RADIUS_KM), not the adventure's
    exact coordinates, so multiple dive sites within the same reef system or
    bay share one cached GBIF call instead of each re-querying individually.
    """

    __tablename__ = "species_location_cache"
    __table_args__ = (
        UniqueConstraint("lat_bucket", "lon_bucket", name="uq_species_location_cache_bucket"),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    lat_bucket = Column(Float, nullable=False, index=True)
    lon_bucket = Column(Float, nullable=False, index=True)
    # JSON-serialized list[gbif_species.NearbySpecies] - stored as opaque text
    # rather than a normalized table since it's write-once-read-many cache
    # data, not something ever queried by its own fields.
    payload_json = Column(Text, nullable=False)
    fetched_at = Column(
        DateTime, nullable=False, default=lambda: datetime.now(timezone.utc), server_default=func.now()
    )


class PhotoModeration(Base):
    """One row per successfully-uploaded photo, recording what the automated
    moderation check (see moderation.py) found - independent of whether the
    photo ever gets attached to an adventure, since POST /uploads/ itself
    never writes to the adventures/adventure_photos tables (a photo only
    becomes an AdventurePhoto row later, if and when its URL is included in
    an adventure create/update payload).

    A row here always means the photo WAS stored - rejected uploads never
    reach save_photo, so they never get a row (or a URL) at all.
    """

    __tablename__ = "photo_moderation"

    id = Column(Integer, primary_key=True, autoincrement=True)
    photo_url = Column(String, nullable=False, unique=True, index=True)
    user_id = Column(String, nullable=False, index=True)
    # "checked" = Sightengine ran and scored below the rejection threshold.
    # "skipped" = Sightengine was unreachable/misconfigured at upload time,
    # so the photo was allowed through unmoderated (fail-open - see
    # routes/uploads.py) pending a retroactive recheck (see
    # scripts/moderation_admin.py's `recheck` command).
    status = Column(String, nullable=False, index=True)
    # JSON-serialized raw Sightengine nudity-2.1 scores, when status ==
    # "checked" - kept for audit trail and so a human reviewing a report (see
    # ContentReport below) can see what the automated check actually found.
    nudity_scores = Column(Text, nullable=True)
    created_at = Column(
        DateTime, nullable=False, default=lambda: datetime.now(timezone.utc), server_default=func.now()
    )
    # Set when a `recheck` pass re-submits a "skipped" row to Sightengine -
    # left null for rows that were checked synchronously at upload time.
    rechecked_at = Column(DateTime, nullable=True)


class ContentReport(Base):
    """A user-submitted "report this content" action - see routes/reports.py.

    No social/public sharing exists yet, so today a report can only
    realistically come from a photo's own uploader, but the mechanism is
    built to work for any authenticated user against any adventure_id ahead
    of that feature shipping (this is table-stakes UGC-app functionality for
    app store review, per Apple App Store Review Guideline 1.2 and similar
    Play Store policy - better to have it working before it's load-bearing
    than to bolt it on under a launch deadline).
    """

    __tablename__ = "content_reports"

    id = Column(Integer, primary_key=True, autoincrement=True)
    reporter_user_id = Column(String, nullable=False, index=True)
    # Nullable + SET NULL (not CASCADE): a report is a moderation audit
    # record in its own right - e.g. "this was reported and then removed
    # because of it" - so it should outlive the adventure it was filed
    # against, not disappear the moment that adventure is deleted (which
    # would also delete the very evidence a removal was justified).
    adventure_id = Column(
        Integer, ForeignKey("adventures.id", ondelete="SET NULL"), nullable=True, index=True
    )
    # Set when the report is about one specific photo rather than the
    # adventure as a whole (e.g. its title/notes) - null means "the adventure
    # in general."
    photo_url = Column(String, nullable=True)
    reason = Column(String, nullable=False)
    details = Column(Text, nullable=True)
    # "pending" | "removed" | "dismissed" - set by the admin script
    # (scripts/moderation_admin.py), never by the reporting API itself.
    status = Column(String, nullable=False, default="pending", server_default="pending", index=True)
    created_at = Column(
        DateTime, nullable=False, default=lambda: datetime.now(timezone.utc), server_default=func.now()
    )
    reviewed_at = Column(DateTime, nullable=True)
    reviewer_note = Column(Text, nullable=True)


class UserProfile(Base):
    """One-time onboarding profile fields, keyed by Clerk user id.

    Absence of a row for a given user_id is the signal that they haven't
    completed onboarding yet (see routes/profile.py).
    """

    __tablename__ = "user_profiles"

    user_id = Column(String, primary_key=True)
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    nickname = Column(String, nullable=True)
    country_code = Column(String, nullable=True)
    photo_url = Column(String, nullable=True)
    created_at = Column(
        DateTime, nullable=False, default=lambda: datetime.now(timezone.utc), server_default=func.now()
    )
