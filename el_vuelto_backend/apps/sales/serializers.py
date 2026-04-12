from decimal import Decimal

from django.db import transaction
from django.db.models import F
from rest_framework import serializers

from apps.inventory.models import InventoryMovement, MovementType
from apps.products.models import Product, ProductType

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
        read_only_fields = ["id", "tenant", "user", "total", "cambio", "created_at"]


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
        """Fetch and validate all products in one query."""
        product_ids = [str(item["product"]) for item in items_data]
        products = {
            str(p.id): p
            for p in Product.objects.filter(
                id__in=product_ids, tenant=tenant, activo=True
            ).select_for_update()
        }

        errors = []
        for item in items_data:
            pid = str(item["product"])
            if pid not in products:
                errors.append(f"Producto {pid} no encontrado o inactivo.")
                continue
            product = products[pid]
            if product.tipo == ProductType.CON_CODIGO:
                if product.stock_actual < item["cantidad"]:
                    errors.append(
                        f"Stock insuficiente para '{product.nombre}': "
                        f"disponible {product.stock_actual}, solicitado {item['cantidad']}."
                    )
        if errors:
            raise serializers.ValidationError({"items": errors})

        return products

    @transaction.atomic
    def create(self, validated_data):
        request = self.context["request"]
        tenant = request.tenant
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
