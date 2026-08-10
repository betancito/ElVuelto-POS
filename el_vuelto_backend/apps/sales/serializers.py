from collections import defaultdict
from decimal import Decimal

from django.db import transaction
from django.db.models import F
from rest_framework import serializers

from apps.inventory.models import InventoryMovement, MovementType
from apps.products.models import Product, ProductType
from apps.tenants.utils import require_tenant

from .models import PaymentMethod, Sale, SaleItem


class SaleItemInputSerializer(serializers.Serializer):
    """Used only for input during sale creation."""

    product = serializers.UUIDField()
    cantidad = serializers.IntegerField(min_value=1)


class SaleItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = SaleItem
        fields = [
            "id",
            "product",
            "product_nombre",
            "precio_unitario",
            "cantidad",
            "subtotal",
        ]


class SaleSerializer(serializers.ModelSerializer):
    items = SaleItemSerializer(many=True, read_only=True)
    user_nombre = serializers.CharField(source="user.nombre", read_only=True)

    class Meta:
        model = Sale
        fields = [
            "id",
            "codigo",
            "tenant",
            "user",
            "user_nombre",
            "total",
            "metodo_pago",
            "monto_recibido",
            "cambio",
            "items",
            "created_at",
        ]
        read_only_fields = ["id", "codigo", "tenant", "user", "total", "cambio", "created_at"]


class SaleCreateSerializer(serializers.Serializer):
    """Validates and processes an entire sale in a single atomic transaction."""

    items = SaleItemInputSerializer(many=True, min_length=1)
    metodo_pago = serializers.ChoiceField(choices=PaymentMethod.choices)
    monto_recibido = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        required=False,
        allow_null=True,
    )

    def validate(self, data):
        metodo_pago = data["metodo_pago"]
        monto_recibido = data.get("monto_recibido")

        if metodo_pago == PaymentMethod.EFECTIVO:
            if monto_recibido is None:
                raise serializers.ValidationError(
                    {"monto_recibido": "Requerido para pagos en EFECTIVO."}
                )
        return data

    def _resolve_products(self, items_data, tenant):
        """Fetch and validate all products in one query.

        The client may send the same product on more than one line, so stock is
        checked against the **sum** per product, never line by line: with a stock
        of 5, two lines of 3 each pass `3 <= 5` on their own and the sale then
        decrements twice, leaving stock at -1. The server does not trust the
        shape of the payload.
        """
        requested = defaultdict(int)
        for item in items_data:
            requested[str(item["product"])] += item["cantidad"]

        products = {
            str(p.id): p
            for p in Product.objects.filter(
                id__in=list(requested), tenant=tenant, activo=True
            ).select_for_update()
        }

        errors = []
        for pid, cantidad_total in requested.items():
            if pid not in products:
                errors.append(f"Producto {pid} no encontrado o inactivo.")
                continue
            product = products[pid]
            if product.tipo == ProductType.CON_CODIGO:
                if product.stock_actual < cantidad_total:
                    errors.append(
                        f"Stock insuficiente para '{product.nombre}': "
                        f"disponible {product.stock_actual}, solicitado {cantidad_total}."
                    )
        if errors:
            raise serializers.ValidationError({"items": errors})

        return products

    @transaction.atomic
    def create(self, validated_data):
        request = self.context["request"]
        # No tenant ⇒ 403 before any lock or write: _resolve_products() filters
        # products by this tenant, so a None here would blow up mid-transaction.
        tenant = require_tenant(request)
        user = request.user
        items_data = validated_data["items"]
        metodo_pago = validated_data["metodo_pago"]
        monto_recibido = validated_data.get("monto_recibido")

        products = self._resolve_products(items_data, tenant)

        # Calculate total
        total = Decimal("0.00")
        for item in items_data:
            product = products[str(item["product"])]
            total += product.precio_venta * item["cantidad"]

        # Guard: cash payment must cover the server-recalculated total.
        # Runs before any write, so raising here reverts the select_for_update
        # locks with no persisted rows. NEQUI_TRANSFERENCIA is unaffected.
        if (
            metodo_pago == PaymentMethod.EFECTIVO
            and monto_recibido is not None
            and monto_recibido < total
        ):
            raise serializers.ValidationError(
                {"monto_recibido": f"El monto recibido ({monto_recibido}) es menor que el total ({total})."}
            )

        cambio = None
        if metodo_pago == PaymentMethod.EFECTIVO and monto_recibido is not None:
            cambio = monto_recibido - total

        sale = Sale.objects.create(
            tenant=tenant,
            user=user,
            total=total,
            metodo_pago=metodo_pago,
            monto_recibido=monto_recibido,
            cambio=cambio,
        )

        for item in items_data:
            product = products[str(item["product"])]
            subtotal = product.precio_venta * item["cantidad"]

            SaleItem.objects.create(
                sale=sale,
                product=product,
                product_nombre=product.nombre,
                precio_unitario=product.precio_venta,
                cantidad=item["cantidad"],
                subtotal=subtotal,
            )

            # Decrement stock atomically for inventory-tracked products
            if product.tipo == ProductType.CON_CODIGO:
                InventoryMovement.objects.create(
                    tenant=tenant,
                    product=product,
                    user=user,
                    tipo_movimiento=MovementType.SALIDA_VENTA,
                    cantidad=-item["cantidad"],
                )
                Product.objects.filter(pk=product.pk).update(
                    stock_actual=F("stock_actual") - item["cantidad"]
                )

        return sale
