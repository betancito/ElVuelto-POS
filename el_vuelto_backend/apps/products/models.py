import uuid
from decimal import Decimal

from django.core.validators import MinValueValidator
from django.db import models

from apps.tenants.models import TenantMixin


class ProductType(models.TextChoices):
    SIN_CODIGO = "SIN_CODIGO", "Sin código de barras"
    CON_CODIGO = "CON_CODIGO", "Con código de barras"


class Category(TenantMixin):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    nombre = models.CharField(max_length=100)
    imagen_url = models.URLField(max_length=500, null=True, blank=True)
    imagen_public_id = models.CharField(max_length=255, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "product_categories"
        verbose_name = "Categoría"
        verbose_name_plural = "Categorías"
        unique_together = [("tenant", "nombre")]

    def __str__(self):
        return self.nombre


class Product(TenantMixin):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    category = models.ForeignKey(
        Category,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="products",
    )
    nombre = models.CharField(max_length=200)
    tipo = models.CharField(max_length=20, choices=ProductType.choices)
    # Money has a floor of 0 — and so does `stock_minimo`, but NOT
    # `stock_actual`; see the note on that field below. A negative
    # `precio_venta` made the POS compute a negative total and hand `cambio` to
    # the customer — the register paying out for a sale it never charged. These
    # validators are the second layer: DRF enforces them too (ModelSerializer
    # copies model validators into the serializer field's `min_value`), and they
    # are what protects the paths that never touch DRF — `/admin/` and any
    # `full_clean()` from a management command or the shell.
    # Zero is allowed on purpose: a $0 line is a legitimate promo/combo/sample.
    precio_venta = models.DecimalField(
        max_digits=10, decimal_places=2, validators=[MinValueValidator(Decimal("0"))]
    )
    precio_costo = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(Decimal("0"))],
    )
    barcode = models.CharField(max_length=100, null=True, blank=True)
    proveedor = models.CharField(max_length=200, null=True, blank=True)
    # No `MinValueValidator(0)` here, unlike every other number on this model:
    # a sale is allowed to drive the stock negative when the shop sold goods it
    # had not registered yet (ADR-SALES-20260816-stock-negativo-permitido). The
    # validator would not stop that — sales write through `F()` and `.update()`,
    # which never call `full_clean()` — it would only make the model lie, and
    # lock an admin out of `/admin/` for any product sitting at -10.
    # `stock_minimo` keeps its floor: that one really is a number a human types.
    stock_actual = models.IntegerField(default=0)
    stock_minimo = models.IntegerField(default=0, validators=[MinValueValidator(0)])
    imagen_url = models.URLField(max_length=500, null=True, blank=True)
    imagen_public_id = models.CharField(max_length=255, null=True, blank=True)
    activo = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "products"
        verbose_name = "Producto"
        verbose_name_plural = "Productos"
        constraints = [
            models.UniqueConstraint(
                fields=["tenant", "barcode"],
                condition=models.Q(barcode__isnull=False),
                name="unique_tenant_barcode",
            )
        ]

    def __str__(self):
        return self.nombre
