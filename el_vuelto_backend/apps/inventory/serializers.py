from django.db.models import F
from rest_framework import serializers

from apps.products.models import Product, ProductType

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
        """Ensure product belongs to the request's tenant."""
        request = self.context.get("request")
        if request and request.tenant and value.tenant_id != request.tenant.id:
            raise serializers.ValidationError("El producto no pertenece a este tenant.")
        return value

    def create(self, validated_data):
        movement = super().create(validated_data)
        # Atomically update stock using F() expressions — no race conditions
        Product.objects.filter(pk=movement.product_id).update(
            stock_actual=F("stock_actual") + movement.cantidad
        )
        return movement


class StockSerializer(serializers.ModelSerializer):
    bajo_minimo = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            "id",
            "nombre",
            "barcode",
            "stock_actual",
            "stock_minimo",
            "bajo_minimo",
            "proveedor",
        ]

    def get_bajo_minimo(self, obj):
        return obj.stock_actual < obj.stock_minimo
