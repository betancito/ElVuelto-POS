import uuid

from django.db import models


class Tenant(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    nombre = models.CharField(max_length=200)
    nit = models.CharField(max_length=20, unique=True)
    ciudad = models.CharField(max_length=100)
    correo = models.EmailField(unique=True)
    logo = models.ImageField(upload_to="tenants/logos/", null=True, blank=True)
    activo = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "tenants"
        verbose_name = "Tenant"
        verbose_name_plural = "Tenants"

    def __str__(self):
        return f"{self.nombre} ({self.nit})"


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
