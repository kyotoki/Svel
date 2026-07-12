from datetime import datetime, timezone
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class AdventureBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    location_name: str = Field(..., min_length=1, max_length=200)
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    max_depth_meters: float = Field(..., ge=0)
    duration_minutes: int = Field(..., ge=0)
    notes: Optional[str] = None
    # A list of already-uploaded photo URLs (each obtained beforehand via a
    # separate POST /uploads/ call per file). On the response side, the
    # `from_attributes` ORM object exposes this as a list of AdventurePhoto
    # rows rather than plain strings, so the before-validator below flattens
    # either shape down to a list of URL strings.
    photos: list[str] = Field(default_factory=list)
    # Open string rather than a closed enum: new activity types (fishing,
    # boating, surfing, ...) can be added later purely from the frontend/data
    # side, with no backend schema change required.
    activity_type: str = Field("scuba", min_length=1, max_length=30)
    tank_pressure_bar: Optional[float] = Field(None, ge=0)
    gas_mix: Optional[str] = Field(None, max_length=50)
    # A list of species ids (e.g. "fish-clownfish") from the frontend's
    # constants/marineLife.ts - same "open string, not a backend enum" choice
    # as activity_type above, and the same before-validator flattening shape
    # as photos above (ORM rows expose `.species_id`, not plain strings).
    species: list[str] = Field(default_factory=list, max_length=200)

    @field_validator("activity_type", mode="before")
    @classmethod
    def normalize_activity_type(cls, value):
        if isinstance(value, str):
            return value.strip().lower()
        return value

    @field_validator("tank_pressure_bar", "gas_mix", mode="before")
    @classmethod
    def blank_to_none(cls, value):
        if isinstance(value, str) and value.strip() == "":
            return None
        return value

    @field_validator("photos", mode="before")
    @classmethod
    def flatten_photo_urls(cls, value):
        if value is None:
            return []
        return [item.url if hasattr(item, "url") else item for item in value]

    @field_validator("species", mode="before")
    @classmethod
    def flatten_species_ids(cls, value):
        if value is None:
            return []
        return [item.species_id if hasattr(item, "species_id") else item for item in value]

    @field_validator("species")
    @classmethod
    def dedupe_species_ids(cls, value):
        # Preserves first-seen order rather than a plain set() - stable
        # output regardless of input order, and dict insertion order is
        # guaranteed in Python 3.7+.
        return list(dict.fromkeys(value))


class AdventureCreate(AdventureBase):
    # Defaults to today so direct API callers that omit it still get a sane
    # value - the frontend always sends its own explicitly selected date.
    date: str = Field(default_factory=lambda: datetime.now(timezone.utc).date().isoformat())

    @field_validator("date")
    @classmethod
    def validate_date_format(cls, value: str) -> str:
        try:
            datetime.strptime(value, "%Y-%m-%d")
        except ValueError as exc:
            raise ValueError("date must be formatted as YYYY-MM-DD") from exc
        return value


class Adventure(AdventureBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: str
    # Nullable here (unlike AdventureCreate) since rows written before this
    # column existed have no value - fallback_date_to_created_at backfills a
    # display value for those instead of leaving it None.
    date: Optional[str] = None
    created_at: datetime
    water_temp_c: Optional[float] = None
    wave_height_m: Optional[float] = None
    tide_height_m: Optional[float] = None

    @model_validator(mode="after")
    def fallback_date_to_created_at(self):
        if not self.date:
            self.date = self.created_at.date().isoformat()
        return self


class DiveStats(BaseModel):
    total_dives: int
    deepest_dive_meters: Optional[float] = None
    total_minutes_underwater: int
    countries_visited: int
    favorite_site: Optional[str] = None


class ActivityStats(BaseModel):
    activity_type: str
    total_trips: int
    total_minutes: int
    deepest_meters: Optional[float] = None
    average_bottom_time_minutes: Optional[float] = None
    favorite_site: Optional[str] = None


class UserProfileBase(BaseModel):
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    nickname: Optional[str] = Field(None, max_length=100)
    country_code: Optional[str] = Field(None, max_length=2)
    photo_url: Optional[str] = None

    @field_validator("nickname", "country_code", "photo_url", mode="before")
    @classmethod
    def blank_to_none(cls, value):
        if isinstance(value, str) and value.strip() == "":
            return None
        return value


class UserProfileCreate(UserProfileBase):
    pass


class UserProfile(UserProfileBase):
    model_config = ConfigDict(from_attributes=True)

    user_id: str


# A closed set (unlike activity_type's deliberately-open string) since these
# drive both moderation-admin triage and eventual app-store-required
# reporting-flow copy on the frontend - both want a fixed, known vocabulary
# rather than arbitrary free text as the primary signal. `details` below is
# where free text still belongs.
ContentReportReason = Literal[
    "nudity_or_sexual_content",
    "harassment_or_bullying",
    "spam",
    "inappropriate_content",
    "other",
]


class ContentReportCreate(BaseModel):
    adventure_id: int
    # Set when reporting one specific photo rather than the adventure as a
    # whole; omit to report the adventure in general (its title, notes, etc).
    photo_url: Optional[str] = None
    reason: ContentReportReason
    details: Optional[str] = Field(None, max_length=1000)


class ContentReport(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    adventure_id: Optional[int] = None
    photo_url: Optional[str] = None
    reason: str
    details: Optional[str] = None
    status: str
    created_at: datetime
