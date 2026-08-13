/** Client-side mirror of the backend's shared image guard.
 *
 *  The authority is `validate_image_upload` in `elvuelto/cloudinary_uploads.py`
 *  — every upload endpoint (product, category, tenant logo) runs it, and it is
 *  what actually returns the 400. This exists only so an obviously bad file
 *  fails instantly instead of after a round trip that uploads megabytes to be
 *  rejected.
 *
 *  Same pattern as `generatePassword.ts` mirroring `password_policy.py`: the
 *  number lives in one place on each side, imported rather than retyped. It was
 *  inline in `TenantDetailPage.tsx` before the create/edit modals needed it too,
 *  which would have made it three copies of the same 10.
 */

/** Mirrors `MAX_IMAGE_BYTES` in `elvuelto/cloudinary_uploads.py`. */
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024

/** Returns the error message to show, or `null` when the file looks fine.
 *
 *  Messages are verbatim from the backend so the same file produces the same
 *  wording whether it was caught here or there.
 */
export function validateImageFile(file: File): string | null {
  if (!file.type.startsWith('image/')) {
    return 'El archivo debe ser una imagen.'
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return 'La imagen no puede superar los 10 MB.'
  }
  return null
}
