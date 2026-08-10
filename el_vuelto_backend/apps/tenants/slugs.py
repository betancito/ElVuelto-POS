"""Slug generation for tenants — the single source of truth.

A tenant's slug is generated **once**, persisted, and read by everybody else.
It used to be recomputed on the fly in three different places (backend view,
POS logout, users page), with three different criteria: the backend *dropped*
accents (`"Café Bogotá"` → `"caf-bogot"`) while the frontend *transliterated*
them (`"cafe-bogota"`). Any business with a tilde or `ñ` sent its cashier to a
slug the backend could not resolve → "Sucursal no encontrada".

The criterion kept here is the transliterating one (it matches
`el_vuelto_frontend/src/utils/slugify.ts`), because it is the one that produces
readable URLs for Spanish names.

NOTE: this module is intentionally dependency-free (stdlib only) so the logic is
easy to keep in sync with the data migration that backfills existing rows. A
migration must not import it — see `apps/tenants/migrations/0004_tenant_slug.py`.
"""

import re
import unicodedata

# Mirrors `Tenant.slug`'s max_length. `nombre` is 200 chars, so the extra room
# is what keeps a collision suffix (`-2`, `-3`, ...) from overflowing.
SLUG_MAX_LENGTH = 220

# Used when a name transliterates to nothing at all (e.g. `"!!!"` or a name
# written entirely in a non-latin script). An empty slug would be unroutable and
# only one tenant could ever hold it.
FALLBACK_SLUG = "tenant"


def base_slug(nombre: str) -> str:
    """`"Panadería La Esperanza"` → `"panaderia-la-esperanza"`."""
    decomposed = unicodedata.normalize("NFD", nombre or "")
    without_marks = "".join(ch for ch in decomposed if not unicodedata.combining(ch))
    slug = re.sub(r"[^a-z0-9]+", "-", without_marks.lower()).strip("-")
    return (slug[:SLUG_MAX_LENGTH].strip("-")) or FALLBACK_SLUG


def unique_slug(nombre: str, is_taken) -> str:
    """Return `base_slug(nombre)`, suffixed (`-2`, `-3`, ...) until it is free.

    `is_taken` is a callable `(slug) -> bool` so the caller decides what "taken"
    means (the model excludes its own pk; the migration queries the historical
    model).
    """
    base = base_slug(nombre)
    candidate = base
    suffix = 2
    while is_taken(candidate):
        tail = f"-{suffix}"
        candidate = f"{base[:SLUG_MAX_LENGTH - len(tail)].strip('-')}{tail}"
        suffix += 1
    return candidate
