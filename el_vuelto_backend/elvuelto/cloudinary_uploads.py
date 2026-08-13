"""Shared image upload to Cloudinary: validate, then compress on the way in.

**Why this module and not an app.** Nothing here is about products or tenants —
both upload images, and neither should import from the other. It sits next to
`settings/`, where `cloudinary.config(...)` already runs (`settings/base.py`), so
the configuration and the only code that depends on it live together. It has no
models, so making it a Django app would buy nothing.

**What it fixes.** The three upload endpoints used to hand Cloudinary the raw
file: a 7 MB / 3000×2000 photo from a phone was stored, and served, at 7 MB. On
the POS — a screen that renders the whole catalogue at once, often over mobile
data in a shop — that is the difference between a grid that paints and one that
crawls.

**Measured, not assumed** (`cloudinary==1.44.2`, real uploads):

| | stored | served to a modern browser |
|---|---|---|
| before | 3000×2000, 7.106.009 B | 7.106.009 B |
| after  | 1000×667,    571.729 B |   542.206 B |

A photographic 2400×1800 test image went 205.717 B → 43.969 B stored, and
**22.332 B** served as WebP through `image_delivery_url()`.
"""

import logging

import cloudinary.exceptions
import cloudinary.uploader
import cloudinary.utils
from rest_framework import serializers

logger = logging.getLogger(__name__)

# Two profiles, deliberately separate even though the numbers match today: the
# point is that shrinking logos later must not touch catalogue images.
#
# `crop: "limit"` is the important one — it only ever scales DOWN. A 100×100
# icon stays 100×100 instead of being blown up to 1000×1000 and turned to mush.
# `quality: "auto:good"` lets Cloudinary pick the bitrate but biases towards
# looking right; `auto:eco`/`auto:low` visibly degrade product photos.
LOGO_TRANSFORMATION = {
    "width": 1000,
    "height": 1000,
    "crop": "limit",
    "quality": "auto:good",
}

CATALOG_IMAGE_TRANSFORMATION = {
    "width": 1000,
    "height": 1000,
    "crop": "limit",
    "quality": "auto:good",
}

# A phone photo is 3-8 MB; 10 MB leaves room for a big one while keeping a
# 500 MB "image" from ever reaching Cloudinary (and from occupying a worker
# while it uploads).
MAX_IMAGE_BYTES = 10 * 1024 * 1024


def validate_image_upload(file):
    """Raise DRF `ValidationError` (→ 400) unless `file` is a sane image.

    Both checks are cheap and happen **before** the network call, so a bad
    request fails fast instead of paying a round trip to Cloudinary.

    `content_type` is what the client claims, not proof — a renamed `.txt` can
    still say `image/jpeg`. That is fine: Cloudinary itself rejects a payload it
    cannot decode, and `upload_optimized_image` turns that into a 400 too. This
    check is here to give the obvious cases a clear message.
    """
    if file is None:
        raise serializers.ValidationError({"error": "No image provided."})

    content_type = (getattr(file, "content_type", "") or "").lower()
    if not content_type.startswith("image/"):
        raise serializers.ValidationError({"error": "El archivo debe ser una imagen."})

    size = getattr(file, "size", 0) or 0
    if size > MAX_IMAGE_BYTES:
        raise serializers.ValidationError(
            {"error": "La imagen no puede superar los 10 MB."}
        )


def upload_optimized_image(file, *, folder, public_id, transformation):
    """Upload `file`, resized and recompressed, and return Cloudinary's result.

    `transformation` travels as an **incoming transformation**: Cloudinary
    applies it before storing, so the stored asset is the small one and the
    original is never kept (`utils.build_upload_params`, utils.py:1166).
    Verified with a real upload — a 3000×2000 file comes back as 1000×667.

    A Cloudinary failure (an undecodable file, a network problem) becomes a
    **400** with a readable message instead of the 500 the bare SDK exception
    used to produce: DRF does not map `cloudinary.exceptions.Error`.
    """
    try:
        return cloudinary.uploader.upload(
            file,
            folder=folder,
            public_id=public_id,
            overwrite=True,
            resource_type="image",
            transformation=transformation,
        )
    except cloudinary.exceptions.Error as exc:
        raise serializers.ValidationError(
            {"error": f"No se pudo procesar la imagen: {exc}"}
        )


def destroy_image(public_id):
    """Delete a stored asset from Cloudinary. Best effort — **never raises**.

    Returns True only if Cloudinary confirms the asset is gone.

    **Why this one swallows what `upload_optimized_image` raises.** Its caller
    (`TenantViewSet.delete_logo`) deletes the `TenantDocument` row right after.
    Letting a Cloudinary hiccup fail the whole request would mean a superadmin
    cannot remove a logo because of a CDN problem — while the orphan left
    behind is bounded and **self-healing**: every upload here reuses a
    deterministic `public_id` (`tenant_<uuid>_logo`) with `overwrite=True`, so
    the next logo uploaded for that tenant writes over the orphan. The row is
    what the app reads; the asset is bookkeeping. Deleting the row is the
    outcome the user asked for, and it must not hinge on a third party.

    **`except Exception` is deliberate — `except cloudinary.exceptions.Error`
    is NOT enough.** An adversarial review caught this and it was reproduced
    against the installed `cloudinary==1.44.2`: `uploader.call_api` calls
    `utils.sign_request` (`uploader.py:882`) and `utils.cloudinary_api_url`
    (`:892`) **before** opening its own `try:` (`:902`), and both raise a plain
    **`ValueError`** ("Must supply api_key" / "api_secret" / "cloud_name" —
    `utils.py:619,622,910`), which does not inherit from
    `cloudinary.exceptions.Error`. `settings/base.py` reads the three
    credentials with `default=""`, so an environment that lost its `.env` boots
    fine and breaks only here. With the narrower `except` that `ValueError`
    escaped, DRF did not map it (it maps no `ValueError` — same gotcha as the
    query params, see `CLAUDE.md`), the DELETE answered **500**, and since
    `doc.delete()` runs *after* this call the row survived — the logo could then
    never be removed, from any screen. That is exactly the failure mode "best
    effort" exists to prevent, so the net is total on purpose.

    `invalidate=True` purges the CDN copies too: the delivery URL carries a
    version, but the old version stays cacheable on its own URL. It is a
    *request*, not a guarantee — the edge may keep serving the old bytes for a
    while after the origin is gone, so never use "fetch the old URL" as proof
    that a delete worked; ask the Admin API.
    """
    try:
        result = cloudinary.uploader.destroy(
            public_id,
            resource_type="image",
            invalidate=True,
        )
    except Exception as exc:
        logger.warning("Cloudinary destroy failed for %s: %s", public_id, exc)
        return False

    # "ok" when deleted, "not found" when it was already gone — both leave the
    # caller free to drop the row, only the first is a confirmed deletion.
    return result.get("result") == "ok"


def image_delivery_url(upload_result):
    """Delivery URL with `f_auto` **and the asset's version**.

    Takes the whole `upload()` result (not just the public_id) because both
    pieces matter:

    1. **`f_auto` — why not just use `result["secure_url"]`.** `fetch_format`
       is a *delivery* feature: it reads the browser's `Accept` header and
       serves WebP/AVIF. As an incoming transformation it does nothing, and the
       URL `upload()` returns carries no transformation segment at all (checked:
       a plain `/upload/v123/folder/id.jpg`). Measured on the same stored asset:
       43.969 B from the plain URL versus **22.332 B** as WebP from this one,
       with a JPEG still served to clients that do not advertise WebP.

    2. **`version` — why it must not be omitted.** Every upload here reuses a
       deterministic `public_id` (`product_<uuid>`), so replacing a product's
       photo writes over the same path. Without the version the URL is
       byte-identical before and after, and the CDN happily keeps serving the
       old image — this actually bit during verification: a 100×100 upload came
       back as the 1000×750 photo uploaded seconds earlier under the same id.
       `secure_url` avoided this by including `v<timestamp>`; this rebuilds that
       property instead of dropping it.
    """
    return cloudinary.utils.cloudinary_url(
        upload_result["public_id"],
        fetch_format="auto",
        quality="auto:good",
        version=upload_result.get("version"),
        secure=True,
    )[0]
