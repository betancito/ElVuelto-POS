from decimal import Decimal

from rest_framework import serializers

from apps.tenants.utils import require_tenant

from .models import Category, Product, ProductType


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ["id", "tenant", "nombre", "imagen_url", "created_at"]
        read_only_fields = ["id", "tenant", "imagen_url", "created_at"]


class ProductSerializer(serializers.ModelSerializer):
    category_nombre = serializers.CharField(source="category.nombre", read_only=True)
    # Declared explicitly only to own the message: the model's MinValueValidator
    # already reaches DRF, but its default text is generic. Floor is 0, not a
    # positive number — a $0 product is a legitimate promo/combo; a negative one
    # makes the POS give money away.
    precio_venta = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        min_value=Decimal("0"),
        error_messages={"min_value": "El precio de venta no puede ser negativo."},
    )
    precio_costo = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        required=False,
        allow_null=True,
        min_value=Decimal("0"),
        error_messages={"min_value": "El precio de costo no puede ser negativo."},
    )

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
            "imagen_url",
            "activo",
            "created_at",
            "updated_at",
        ]
        # `stock_actual` is read-only: stock is meant to move through
        # `InventoryMovement`, the one path with `F()`, a row lock and an audit
        # trail. Marking it read-only stops a client from *sending* a value —
        # see `update()` below for the other half, which stops this serializer
        # from rewriting the column when the client sent something else.
        #
        # It became urgent when `MinValueValidator(0)` came off the model
        # (ADR-SALES-20260816-stock-negativo-permitido): DRF derives a field's
        # `min_value` from the model validators, so dropping it also dropped the
        # serializer's floor and `PATCH {"stock_actual": -9999}` started
        # answering 200 where it used to answer 400. The frontend never sent the
        # field (`ProductPayload` in `productsApi.ts` does not list it), so
        # closing it costs nothing.
        read_only_fields = [
            "id",
            "tenant",
            "stock_actual",
            "imagen_url",
            "created_at",
            "updated_at",
        ]

    def update(self, instance, validated_data):
        """Write **only** the fields the client sent.

        `ModelSerializer.update()` ends in a bare `instance.save()`, and a
        `save()` without `update_fields` writes *every* concrete column —
        including `stock_actual`, with whatever value the instance held when the
        request loaded it. Marking the field read-only does not help: the column
        still travels in the UPDATE.

        That is a lost update, and it is deterministic, not a rare race: the
        admin opens the edit modal on a product with stock 20 and saves a price
        change while a cashier rings up 3 units. The PATCH's SELECT reads 20; the
        sale commits 17 through `F()`; the PATCH's UPDATE — which was queued on
        the sale's row lock — writes 20 back. `Sale`, `SaleItem` and
        `InventoryMovement` all record the sale, and the stock says it never
        happened.

        It matters more since sales may run the stock negative
        (`ADR-SALES-20260816-stock-negativo-permitido`): a negative is now a
        liability the shop reads to know what `ENTRADA` it owes, so clobbering it
        can erase a debt — or resurrect one a partial `ENTRADA` already settled.

        `updated_at` is listed explicitly because `auto_now` only fires for
        fields present in `update_fields`.
        """
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save(update_fields=[*validated_data.keys(), "updated_at"])
        return instance

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
        """Ensure the category belongs to the request's tenant — fail-CLOSED.

        The old form (`if request and request.tenant and ...`) skipped the check
        exactly when there was no tenant, letting another tenant's category
        through. Absence of context must close the door, not open it.
        """
        if value is None:
            return value
        request = self.context.get("request")
        if request is None:
            raise serializers.ValidationError(
                "No hay contexto de petición para validar el tenant de la categoría."
            )
        if value.tenant_id != require_tenant(request).id:
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
            "imagen_url",
        ]
