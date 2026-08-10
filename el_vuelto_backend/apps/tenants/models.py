import uuid

from django.db import models

from .slugs import SLUG_MAX_LENGTH, unique_slug


class Tenant(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    nombre = models.CharField(max_length=200)
    # Generated ONCE from `nombre` (see save) and never recomputed: it is the
    # public identity of the business (`/login/<slug>`), so links already handed
    # out to cashiers must keep working even if the name is edited later.
    # `editable=False` keeps it out of ModelForms/admin — nobody types this.
    slug = models.CharField(max_length=SLUG_MAX_LENGTH, unique=True, editable=False)
    nit = models.CharField(max_length=20, unique=True)
    ciudad = models.CharField(max_length=100)
    correo = models.EmailField(unique=True)
    support_number = models.CharField(max_length=20, blank=True, null=True)
    activo = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "tenants"
        verbose_name = "Tenant"
        verbose_name_plural = "Tenants"

    def __str__(self):
        return f"{self.nombre} ({self.nit})"

    def save(self, *args, **kwargs):
        # Only when empty: a rename must NOT move the slug. Two businesses whose
        # names collapse to the same slug get a numeric suffix instead of
        # overwriting each other (`nombre` is not unique).
        if not self.slug:
            self.slug = unique_slug(
                self.nombre,
                lambda candidate: Tenant.objects.filter(slug=candidate)
                .exclude(pk=self.pk)
                .exists(),
            )
            # `update_fields` is set by callers that only meant to touch other
            # columns; without this the freshly generated slug would be dropped
            # from the UPDATE and the row would still violate NOT NULL/unique.
            update_fields = kwargs.get("update_fields")
            if update_fields is not None:
                kwargs["update_fields"] = {*update_fields, "slug"}
        super().save(*args, **kwargs)


class TenantDocument(models.Model):
    """Stores Cloudinary-hosted documents (logos, ID scans, etc.) for a tenant."""

    class DocumentType(models.TextChoices):
        LOGO = "logo", "Logo"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(
        Tenant,
        on_delete=models.CASCADE,
        related_name="documents",
    )
    document_type = models.CharField(
        max_length=50,
        choices=DocumentType.choices,
        default=DocumentType.LOGO,
    )
    cloudinary_public_id = models.CharField(max_length=255)
    cloudinary_url = models.URLField(max_length=500)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "tenant_documents"
        verbose_name = "Tenant Document"
        verbose_name_plural = "Tenant Documents"
        unique_together = [("tenant", "document_type")]

    def __str__(self):
        return f"{self.tenant.nombre} — {self.document_type}"


class TenantMixin(models.Model):
    """Abstract mixin that adds a tenant FK to any model."""

    tenant = models.ForeignKey(
        "tenants.Tenant",
        on_delete=models.CASCADE,
        related_name="%(app_label)s_%(class)s_set",
    )

    class Meta:
        abstract = True
