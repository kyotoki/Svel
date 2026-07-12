import json
import os
from dataclasses import dataclass, field

import httpx
from dotenv import load_dotenv

load_dotenv()

SIGHTENGINE_API_USER = os.getenv("SIGHTENGINE_API_USER")
SIGHTENGINE_API_SECRET = os.getenv("SIGHTENGINE_API_SECRET")
SIGHTENGINE_CHECK_URL = "https://api.sightengine.com/1.0/check.json"
NUDITY_MODEL = "nudity-2.1"
REQUEST_TIMEOUT_SECONDS = 10.0

# nudity-2.1 returns 7 intensity bands, most to least explicit:
#   sexual_activity > sexual_display > erotica > very_suggestive > suggestive
#   > mildly_suggestive > none
# Only the three most explicit bands reject an upload. very_suggestive,
# suggestive, and mildly_suggestive are exactly the bands that catch ordinary
# swimwear/bikini/beach photos (Sightengine's own docs list "bikini",
# "swimwear_one_piece", "cleavage" etc. as *suggestive*-class triggers, not
# explicit ones) - normal, expected content for a dive/snorkel app, not
# something to reject. This is the whole reason nudity-2.1 (a context-aware
# model) was chosen over a flat/binary nudity classifier.
EXPLICIT_CATEGORIES = ("sexual_activity", "sexual_display", "erotica")

DEFAULT_NUDITY_THRESHOLD = 0.5
# A score in [0, 1]; Sightengine's own examples treat ~0.5+ as a meaningful
# signal for a category. Not a scientifically derived cutoff - tune this via
# the env var based on real false-positive/false-negative experience once
# there's real upload volume to look at (see the honesty note in
# check_image_for_nudity's docstring).
NUDITY_THRESHOLD = float(os.getenv("MODERATION_NUDITY_THRESHOLD", DEFAULT_NUDITY_THRESHOLD))


class ModerationUnavailableError(Exception):
    """Sightengine couldn't be reached, isn't configured, or returned something
    we can't interpret. Deliberately a distinct exception from "the image was
    rejected" - callers decide separately how to handle unavailability (see
    routes/uploads.py, which fails open per an explicit product decision)."""


@dataclass
class ModerationResult:
    rejected: bool
    # Every intensity-band score Sightengine returned, e.g.
    # {"sexual_activity": 0.01, ..., "none": 0.97}.
    scores: dict = field(default_factory=dict)
    # The subset of EXPLICIT_CATEGORIES that met/exceeded the threshold -
    # empty when not rejected. Included in the rejection error and persisted
    # to PhotoModeration so a human reviewing a report can see exactly why.
    flagged_categories: dict = field(default_factory=dict)

    @property
    def scores_json(self) -> str:
        return json.dumps(self.scores)


def check_image_for_nudity(image_bytes: bytes) -> ModerationResult:
    """Score an image with Sightengine's nudity-2.1 model and decide whether
    it should be rejected.

    Honesty about limitations (the caller-facing docs/UI should reflect this,
    not just this docstring): this is Sightengine's general-purpose nudity
    model, not something trained specifically on dive/snorkel/beach photos.
    It will not catch 100% of genuinely explicit content (false negatives -
    unusual poses, heavy filters/edits, or non-photographic content can slip
    past any automated classifier) and it will occasionally flag borderline-
    but-legitimate photos as explicit (false positives - e.g. a close-up,
    tightly-cropped, or unusually-lit swimwear photo can score higher than a
    typical one). The EXPLICIT_CATEGORIES/threshold choice here is tuned to
    minimize false positives on ordinary dive-app content at the cost of
    being somewhat more permissive - this is a first line of defense, not a
    guarantee, which is exactly why the manual report/removal path
    (routes/reports.py, scripts/moderation_admin.py) exists alongside it.

    Raises ModerationUnavailableError if Sightengine can't be reached, isn't
    configured, or its response can't be parsed as expected - never returns a
    "safe by default" result for a failure, so callers can't accidentally
    treat an error as a clean scan.
    """
    if not SIGHTENGINE_API_USER or not SIGHTENGINE_API_SECRET:
        raise ModerationUnavailableError("SIGHTENGINE_API_USER/SIGHTENGINE_API_SECRET are not configured.")

    try:
        response = httpx.post(
            SIGHTENGINE_CHECK_URL,
            data={
                "models": NUDITY_MODEL,
                "api_user": SIGHTENGINE_API_USER,
                "api_secret": SIGHTENGINE_API_SECRET,
            },
            files={"media": ("photo.jpg", image_bytes, "image/jpeg")},
            timeout=REQUEST_TIMEOUT_SECONDS,
        )
        response.raise_for_status()
        payload = response.json()
    except (httpx.HTTPError, ValueError) as exc:
        raise ModerationUnavailableError(f"Sightengine request failed: {exc}") from exc

    if payload.get("status") != "success":
        raise ModerationUnavailableError(f"Sightengine returned a non-success response: {payload}")

    nudity_scores = payload.get("nudity")
    if not isinstance(nudity_scores, dict):
        raise ModerationUnavailableError(f"Sightengine response missing 'nudity' scores: {payload}")

    flagged = {
        category: nudity_scores[category]
        for category in EXPLICIT_CATEGORIES
        if isinstance(nudity_scores.get(category), (int, float)) and nudity_scores[category] >= NUDITY_THRESHOLD
    }

    return ModerationResult(rejected=bool(flagged), scores=nudity_scores, flagged_categories=flagged)
