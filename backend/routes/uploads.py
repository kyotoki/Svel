import io
import logging

from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, status
from PIL import Image, UnidentifiedImageError
from pillow_heif import register_heif_opener
from sqlalchemy.orm import Session

import models
from auth import get_current_user_id
from database import get_db
from moderation import ModerationUnavailableError, check_image_for_nudity
from storage import ALLOWED_CONTENT_TYPES, MAX_UPLOAD_BYTES, save_photo

register_heif_opener()

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/uploads", tags=["uploads"])


@router.post("/", status_code=status.HTTP_201_CREATED)
async def upload_photo(
    request: Request,
    file: UploadFile,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Unsupported image type. Use JPEG, PNG, WEBP, or HEIC.",
        )

    contents = await file.read(MAX_UPLOAD_BYTES + 1)
    if len(contents) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Image exceeds the 10MB limit.",
        )
    if not contents:
        raise HTTPException(status_code=400, detail="Empty file upload.")

    # Decoding with Pillow (rather than trusting the client-supplied
    # content-type) confirms the bytes are really an image and not a
    # disguised payload, and re-encoding to JPEG normalizes every accepted
    # format - including HEIC from iPhone cameras - into something every
    # platform (native and web) can render from the same URL.
    try:
        image = Image.open(io.BytesIO(contents))
        image.load()
    except UnidentifiedImageError:
        raise HTTPException(status_code=400, detail="File is not a valid image.")

    buffer = io.BytesIO()
    image.convert("RGB").save(buffer, format="JPEG", quality=85)
    jpeg_bytes = buffer.getvalue()

    # Moderate the final re-encoded bytes (not the original upload) - that's
    # the actual artifact that would get stored and served. Rejected images
    # never reach save_photo, so they're never written to disk/S3 and never
    # get a URL at all.
    #
    # On a Sightengine outage/misconfiguration this fails OPEN (the photo is
    # stored unmoderated) rather than blocking uploads entirely - a
    # deliberate product decision, since these photos aren't publicly visible
    # anywhere yet (no social sharing has shipped), so a brief unmoderated
    # window is lower-risk than taking down the core log-a-dive-with-photo
    # flow over a third-party free-tier API hiccup. Every skipped upload is
    # logged and recorded (PhotoModeration.status == "skipped") specifically
    # so scripts/moderation_admin.py's `recheck` command can retroactively
    # re-scan it once Sightengine is reachable again - this is not a "skip
    # and forget" fallback.
    moderation_status = "checked"
    nudity_scores_json = None
    try:
        result = check_image_for_nudity(jpeg_bytes)
    except ModerationUnavailableError:
        logger.warning(
            "Photo moderation unavailable - storing unmoderated pending recheck",
            extra={"user_id": user_id},
            exc_info=True,
        )
        moderation_status = "skipped"
    else:
        if result.rejected:
            logger.info(
                "Photo rejected by moderation",
                extra={"user_id": user_id, "flagged_categories": result.flagged_categories},
            )
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=(
                    "This photo can't be uploaded because it appears to contain explicit content. "
                    "Please choose a different photo."
                ),
            )
        nudity_scores_json = result.scores_json

    photo_url = save_photo(user_id, jpeg_bytes, base_url=str(request.base_url))

    db.add(
        models.PhotoModeration(
            photo_url=photo_url,
            user_id=user_id,
            status=moderation_status,
            nudity_scores=nudity_scores_json,
        )
    )
    db.commit()

    return {"url": photo_url}
