from rest_framework import serializers

from .models import Category, Product, ProductType


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ["id", "tenant", "nombre", "created_at"]
        read_only_fields = ["id", "tenant", "created_at"]


class ProductSerializer(serializers.ModelSerializer):
    category_nombre = serializers.CharField(source="category.nombre", read_only=True)

    class Meta:
        model = Product
        fields = [
            "id",
            "tenant",
            "category",
            "category_nombre",
            "nombre",
            "tipo",
            "precio_venta",
            "precio_costo",
            "barcode",
            "proveedor",
            "stock_actual",
            "stock_minimo",
            "imagen",
            "activo",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "tenant", "created_at", "updated_at"]

    def validate(self, data):
        tipo = data.get("tipo", getattr(self.instance, "tipo", None))
        if tipo == ProductType.CON_CODIGO:
            required = {
                "barcode": data.get("barcode", getattr(self.instance, "barcode", None)),
                "precio_costo": data.get("precio_costo", getattr(self.instance, "precio_costo", None)),
                "proveedor": data.get("proveedor", getattr(self.instance, "proveedor", None)),
            }
            errors = {}
            if not required["barcode"]:
                errors["barcode"] = "Requerido para productos CON_CODIGO."
            if required["precio_costo"] is None:
                errors["precio_costo"] = "Requerido para productos CON_CODIGO."
            if not required["proveedor"]:
                errors["proveedor"] = "Requerido para productos CON_CODIGO."
            if errors:
                raise serializers.ValidationError(errors)
        return data

    def validate_category(self, value):
        """Ensure the category belongs to the same tenant."""
        if value is None:
            return value
        request = self.context.get("request")
        if request and request.tenant and value.tenant_id != request.tenant.id:
            raise serializers.ValidationError("La categoría no pertenece a este tenant.")
        return value


class ProductPOSSerializer(serializers.ModelSerializer):
    """Minimal serializer optimized for the POS screen."""

    category = serializers.CharField(source="category.nombre", read_only=True)

    class Meta:
        model = Product
        fields = [
            "id",
            "nombre",
            "tipo",
            "precio_venta",
            "barcode",
            "category",
            "stock_actual",
        ]
