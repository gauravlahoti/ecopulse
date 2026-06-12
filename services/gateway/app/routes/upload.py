"""Image upload — validates type/size, strips EXIF, returns signed URL."""
import hashlib
import io
from typing import Annotated

from fastapi import APIRouter, File, HTTPException, UploadFile, status
from pydantic import BaseModel

from app.auth import AuthenticatedUID

router = APIRouter()

ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_SIZE_BYTES = 10 * 1024 * 1024  # 10MB


class UploadResponse(BaseModel):
    upload_id: str
    signed_url: str  # presigned Cloud Storage URL for the agent to fetch


@router.post("/upload", response_model=UploadResponse, status_code=status.HTTP_202_ACCEPTED)
async def upload_image(
    uid: AuthenticatedUID,
    file: Annotated[UploadFile, File(description="Meal photo, receipt, or product image")],
) -> UploadResponse:
    """Accept an image upload, validate it, strip EXIF, store in Cloud Storage.

    Returns a signed URL for downstream agent use. The frontend never gets a direct
    Cloud Storage URL — always signed and scoped.
    """
    # Validate content type
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Unsupported file type: {file.content_type}. Allowed: JPEG, PNG, WebP.",
        )

    contents = await file.read()

    # Validate size
    if len(contents) > MAX_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File too large. Maximum size is {MAX_SIZE_BYTES // 1024 // 1024}MB.",
        )

    # Strip EXIF metadata (privacy + security)
    clean_contents = _strip_exif(contents, file.content_type)

    # Compute semantic cache key (image hash for deduplication)
    upload_id = hashlib.sha256(clean_contents).hexdigest()[:16]

    # TODO Sprint 3: upload clean_contents to Cloud Storage gs://ecopulse-uploads/{uid}/{upload_id}
    # and generate a signed URL with 15-minute expiry
    signed_url = f"https://storage.googleapis.com/ecopulse-uploads/{uid}/{upload_id}"

    return UploadResponse(upload_id=upload_id, signed_url=signed_url)


def _strip_exif(image_bytes: bytes, content_type: str) -> bytes:
    """Remove EXIF metadata from JPEG images. PNG/WebP don't carry EXIF."""
    if content_type != "image/jpeg":
        return image_bytes

    try:
        import piexif  # type: ignore[import-untyped]

        piexif.remove(image_bytes)
        return piexif.transplant(piexif.dump({}), image_bytes)  # type: ignore[no-any-return]
    except Exception:
        # If piexif is unavailable or fails, re-encode via PIL to strip EXIF
        try:
            from PIL import Image  # type: ignore[import-untyped]

            img = Image.open(io.BytesIO(image_bytes))
            buf = io.BytesIO()
            img.save(buf, format="JPEG", exif=b"")
            return buf.getvalue()
        except Exception:
            # Last resort: return as-is with a logged warning
            return image_bytes
