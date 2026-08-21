from django.db import transaction
from django.db.models import F
from rest_framework import serializers

from apps.products.models import Product, ProductType
from apps.tenants.utils import require_tenant

from .models import InventoryMovement, MovementType


class InventoryMovementSerializer(serializers.ModelSerializer):
    product_nombre = serializers.CharField(source="product.nombre", read_only=True)
    user_nombre = serializers.CharField(source="user.nombre", read_only=True)

    class Meta:
        model = InventoryMovement
        fields = [
            "id",
            "tenant",
            "product",
            "product_nombre",
            "user",
            "user_nombre",
            "tipo_movimiento",
            "cantidad",
            "precio_costo",
            "proveedor",
            "nota",
            "created_at",
        ]
        read_only_fields = ["id", "tenant", "user", "created_at"]

    def validate_tipo_movimiento(self, value):
        if value == MovementType.SALIDA_VENTA:
            raise serializers.ValidationError(
                "SALIDA_VENTA movements are created automatically by the sales endpoint."
            )
        return value

    def validate(self, data):
        tipo = data.get("tipo_movimiento")
        cantidad = data.get("cantidad", 0)

        if tipo == MovementType.ENTRADA and cantidad <= 0:
            raise serializers.ValidationError(
                {"cantidad": "La cantidad debe ser positiva para movimientos ENTRADA."}
            )
        if tipo == MovementType.AJUSTE and cantidad == 0:
            raise serializers.ValidationError(
                {"cantidad": "La cantidad no puede ser cero para un AJUSTE."}
            )
        return data

    def validate_product(self, value):
        """Ensure product belongs to the request's tenant — fail-CLOSED.

        The old form (`if request and request.tenant and ...`) skipped the whole
        check exactly when there was no tenant, letting another tenant's product
        through. Absence of context must close the door, not open it.
        """
        request = self.context.get("request")
        if request is None:
            raise serializers.ValidationError(
                "No hay contexto de petición para validar el tenant del producto."
            )
        if value.tenant_id != require_tenant(request).id:
            raise serializers.ValidationError("El producto no pertenece a este tenant.")
        return value

    @transaction.atomic
    def create(self, validated_data):
        """Apply the movement. A movement that *removes* stock may not push it
        below zero; one that *adds* stock is always allowed.

        The guard is **directional**, and that matters since sales were allowed
        to go negative (`ADR-SALES-20260816-stock-negativo-permitido`). The old
        rule looked only at the result, so with `stock_actual = -10` a partial
        `ENTRADA` of +5 landed on -5 and was **rejected** — the shop could fall
        into the hole but only climb out in a single jump that covered the whole
        debt. Any positive `cantidad` can only improve the situation, so it goes
        through even when the stock is still negative afterwards.

        A negative `AJUSTE` keeps the old treatment (an `AJUSTE` of -99 over a
        stock of 5 must not leave -94): a sale is a fact that already happened,
        a manual adjustment is somebody typing.

        The product row is locked with `select_for_update()` inside the
        transaction, the same treatment the sale gives it: without the lock two
        simultaneous adjustments would both read the old stock and both pass.
        """
        product = Product.objects.select_for_update().get(pk=validated_data["product"].pk)
        cantidad = validated_data["cantidad"]
        resultante = product.stock_actual + cantidad
        if cantidad < 0 and resultante < 0:
            raise serializers.ValidationError(
                {
                    "cantidad": (
                        f"El movimiento dejaría el stock en {resultante}. "
                        f"Disponible de '{product.nombre}': {product.stock_actual}."
                    )
                }
            )

        movement = super().create(validated_data)
        # Atomically update stock using F() expressions — no race conditions
        Product.objects.filter(pk=movement.product_id).update(
            stock_actual=F("stock_actual") + movement.cantidad
        )
        return movement


class StockSerializer(serializers.ModelSerializer):
    bajo_minimo = serializers.SerializerMethodField()
    category_id = serializers.UUIDField(source="category.id", allow_null=True, read_only=True)
    category_nombre = serializers.CharField(source="category.nombre", allow_null=True, read_only=True)

    class Meta:
        model = Product
        fields = [
            "id",
            "nombre",
            "barcode",
            "stock_actual",
            "stock_minimo",
            "bajo_minimo",
            "precio_costo",
            "proveedor",
            "imagen_url",
            "category_id",
            "category_nombre",
        ]

    def get_bajo_minimo(self, obj):
        return obj.stock_actual < obj.stock_minimo
