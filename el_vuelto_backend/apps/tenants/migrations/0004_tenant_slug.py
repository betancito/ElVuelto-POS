"""Persist `Tenant.slug` and backfill every existing tenant.

Three places used to recompute "nombre → slug" on the fly with two different
criteria (see `apps/tenants/slugs.py`), so a business with a tilde got a
different slug depending on who asked. From here on the slug is a stored column.

The algorithm is **inlined** on purpose: a data migration must not depend on the
current state of the app's modules (same reasoning as
`apps/users/migrations/0005_clear_is_staff_on_tenant_admins.py`). If
`apps/tenants/slugs.py` ever changes, this file keeps reproducing the behaviour
that was correct the day the column was created — that is the point, existing
slugs must not move.
"""

import re
import unicodedata

from django.db import migrations, models

SLUG_MAX_LENGTH = 220
FALLBACK_SLUG = "tenant"


def _base_slug(nombre):
    decomposed = unicodedata.normalize("NFD", nombre or "")
    without_marks = "".join(ch for ch in decomposed if not unicodedata.combining(ch))
    slug = re.sub(r"[^a-z0-9]+", "-", without_marks.lower()).strip("-")
    return (slug[:SLUG_MAX_LENGTH].strip("-")) or FALLBACK_SLUG


def backfill_slugs(apps, schema_editor):
    """Assign a unique slug to every existing tenant.

    Ordered by `created_at` so the outcome is deterministic: if two tenants
    collapse to the same base slug, the older one keeps the clean slug and the
    newer one gets the suffix — in every environment, in the same way.
    """
    Tenant = apps.get_model("tenants", "Tenant")
    taken = set()
    updated = 0
    for tenant in Tenant.objects.all().order_by("created_at"):
        base = _base_slug(tenant.nombre)
        candidate = base
        suffix = 2
        while candidate in taken:
            tail = f"-{suffix}"
            candidate = f"{base[:SLUG_MAX_LENGTH - len(tail)].strip('-')}{tail}"
            suffix += 1
        taken.add(candidate)
        # `update` instead of `save`: the historical model has no custom save,
        # and this skips `auto_now` so a backfill does not look like a business
        # edit on `updated_at`.
        Tenant.objects.filter(pk=tenant.pk).update(slug=candidate)
        updated += 1
    print(f"    → slug backfilled on {updated} tenant(s)")


class Migration(migrations.Migration):

    dependencies = [
        ("tenants", "0003_remove_tenant_logo_tenant_support_number"),
    ]

    operations = [
        # Added without `unique` first: existing rows would all land on the same
        # empty default and the constraint would fail before the backfill runs.
        migrations.AddField(
            model_name="tenant",
            name="slug",
            field=models.CharField(default="", editable=False, max_length=SLUG_MAX_LENGTH),
            preserve_default=False,
        ),
        migrations.RunPython(
            backfill_slugs,
            # No reverse: dropping the column is the reverse of AddField below,
            # and there is no sensible way to "un-assign" slugs.
            reverse_code=migrations.RunPython.noop,
        ),
        migrations.AlterField(
            model_name="tenant",
            name="slug",
            field=models.CharField(editable=False, max_length=SLUG_MAX_LENGTH, unique=True),
        ),
    ]
