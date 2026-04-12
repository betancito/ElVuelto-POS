import uuid

from django.db import models

from apps.tenants.models import TenantMixin


class MovementType(models.TextChoices):
    ENTRADA = "ENTRADA", "Entrada de inventario"
    SALIDA_VENTA = "SALIDA_VENTA", "Salida por venta"
    AJUSTE = "AJUSTE", "Ajuste de inventario"


class InventoryMovement(TenantMixin):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    product = models.ForeignKey(
        "products.Product",
        on_delete=models.PROTECT,
        related_name="movements",
    )
    user = models.ForeignKey(
        "users.User",
        on_delete=models.PROTECT,
        related_name="inventory_movements",
    )
    tipo_movimiento = models.CharField(max_length=20, choices=MovementType.choices)
    cantidad = models.IntegerField(
        help_text="Positive for ENTRADA, negative for SALIDA/AJUSTE."
    )
    precio_costo = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    proveedor = models.CharField(max_length=200, null=True, blank=True)
    nota = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "inventory_movements"
        verbose_name = "Movimiento de inventario"
        verbose_name_plural = "Movimientos de inventario"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.tipo_movimiento} | {self.product} | {self.cantidad}"
