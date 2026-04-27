import random
import string
import uuid

from django.db import models

from apps.tenants.models import TenantMixin


class PaymentMethod(models.TextChoices):
    EFECTIVO = "EFECTIVO", "Efectivo"
    NEQUI_TRANSFERENCIA = "NEQUI_TRANSFERENCIA", "Nequi / Transferencia"


class Sale(TenantMixin):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    codigo = models.CharField(max_length=10, unique=True, blank=True, editable=False)
    user = models.ForeignKey(
        "users.User",
        on_delete=models.PROTECT,
        related_name="sales",
    )
    total = models.DecimalField(max_digits=10, decimal_places=2)
    metodo_pago = models.CharField(max_length=30, choices=PaymentMethod.choices)
    monto_recibido = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    cambio = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "sales"
        verbose_name = "Venta"
        verbose_name_plural = "Ventas"
        ordering = ["-created_at"]

    def save(self, *args, **kwargs):
        if not self.codigo:
            while True:
                code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=7))
                if not Sale.objects.filter(codigo=code).exists():
                    self.codigo = code
                    break
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Venta {self.codigo} | {self.total} | {self.metodo_pago}"


class SaleItem(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    sale = models.ForeignKey(Sale, on_delete=models.CASCADE, related_name="items")
    product = models.ForeignKey(
        "products.Product",
        on_delete=models.PROTECT,
        related_name="sale_items",
    )
    product_nombre = models.CharField(max_length=200)
    precio_unitario = models.DecimalField(max_digits=10, decimal_places=2)
    cantidad = models.IntegerField()
    subtotal = models.DecimalField(max_digits=10, decimal_places=2)

    class Meta:
        db_table = "sale_items"
        verbose_name = "Ítem de venta"
        verbose_name_plural = "Ítems de venta"

    def __str__(self):
        return f"{self.product_nombre} x{self.cantidad}"
