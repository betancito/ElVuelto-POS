import uuid

from django.db import models

from apps.tenants.models import TenantMixin


class ProductType(models.TextChoices):
    SIN_CODIGO = "SIN_CODIGO", "Sin código de barras"
    CON_CODIGO = "CON_CODIGO", "Con código de barras"


class Category(TenantMixin):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    nombre = models.CharField(max_length=100)
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
    precio_venta = models.DecimalField(max_digits=10, decimal_places=2)
    precio_costo = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    barcode = models.CharField(max_length=100, null=True, blank=True)
    proveedor = models.CharField(max_length=200, null=True, blank=True)
    stock_actual = models.IntegerField(default=0)
    stock_minimo = models.IntegerField(default=0)
    imagen = models.ImageField(upload_to="products/", null=True, blank=True)
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
