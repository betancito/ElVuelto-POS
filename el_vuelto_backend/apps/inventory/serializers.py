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
        """Apply the movement, refusing to leave `stock_actual` below zero.

        The rule is about the **result**, not the sign: a negative `AJUSTE` is
        legitimate (correcting shrinkage), what it cannot do is push the stock
        negative. Sales already guard their own path; inventory is the other door
        and had no check at all — an `AJUSTE` of -99 over a stock of 5 left -94.

        The product row is locked with `select_for_update()` inside the
        transaction, the same treatment the sale gives it: without the lock two
        simultaneous adjustments would both read the old stock and both pass.
        """
        product = Product.objects.select_for_update().get(pk=validated_data["product"].pk)
        cantidad = validated_data["cantidad"]
        resultante = product.stock_actual + cantidad
        if resultante < 0:
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
