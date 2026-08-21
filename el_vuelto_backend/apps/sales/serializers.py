from decimal import Decimal

from django.db import transaction
from django.db.models import F
from rest_framework import serializers

from apps.inventory.models import InventoryMovement, MovementType
from apps.products.models import Product, ProductType
from apps.tenants.utils import require_tenant

from .models import PaymentMethod, Sale, SaleItem

# Largest value `Sale.total` can hold — it is `DecimalField(max_digits=10,
# decimal_places=2)`, so 8 digits before the point. Derived rather than typed so
# it follows the model if the column ever widens.
MAX_SALE_TOTAL = Decimal(10) ** (Sale._meta.get_field("total").max_digits - 2) - Decimal("0.01")


class SaleItemInputSerializer(serializers.Serializer):
    """Used only for input during sale creation."""

    product = serializers.UUIDField()
    # The stock check used to be the de-facto ceiling on `cantidad`: you could
    # not sell 30.000 units of something that had 20. Now that a sale may run
    # the stock negative, nothing bounds it, so a slipped digit becomes a real
    # sale. 10.000 on one line is far past any counter sale.
    #
    # This cap does **not** protect `Sale.total` from overflowing — 10.000 units
    # of a $10.000 product already exceeds `numeric(10, 2)`, and `items` has no
    # length limit — so the actual overflow guard lives in `create()`, on the
    # computed total. This one only catches the typo early, on the field.
    cantidad = serializers.IntegerField(min_value=1, max_value=10_000)


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
        """Fetch and lock all products in one query.

        **A sale is never refused for lack of stock.** Selling more units than
        are registered drives `stock_actual` negative on purpose: the shop really
        handed the goods over, and the alternative — blocking the till until
        somebody records an arrival — stops the business from trading. The
        negative is the reminder that a `ENTRADA` is owed; `SaleViewSet.create`
        reports which products ended below zero so the cashier sees it, and
        Inventory surfaces them for the admin. See
        `ADR-SALES-20260816-stock-negativo-permitido` in the cerebro.

        What this used to do besides rejecting was **sum the quantities per
        product**, because a client may repeat a product across lines and the
        sum was what got compared against the stock. With the comparison gone
        that sum has no reader: `create()` prices and decrements **line by
        line** (`total += precio * item["cantidad"]`, one `F()` update per
        item), and duplicate lines decrementing twice is now the correct
        outcome, not the bug it used to be. So this collects the distinct ids
        and nothing else — keeping the old `defaultdict` of sums here would be
        dead arithmetic dressed up as a safety net.
        """
        # `dict.fromkeys` and not a `set`: it dedupes the same way but keeps the
        # order the client sent, so the "no encontrado o inactivo" errors below
        # come back in a stable order instead of whatever the hash gives today.
        product_ids = list(dict.fromkeys(str(item["product"]) for item in items_data))

        products = {
            str(p.id): p
            for p in Product.objects.filter(
                id__in=product_ids, tenant=tenant, activo=True
            ).select_for_update()
        }

        # The only thing that can still reject a line: a product that does not
        # belong to this tenant, does not exist, or is inactive.
        errors = [
            f"Producto {pid} no encontrado o inactivo."
            for pid in product_ids
            if pid not in products
        ]
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

        # Guard: the total must fit in `Sale.total` — `numeric(10, 2)`, so at
        # most 99.999.999,99. Checked on the **computed total** and not on the
        # quantities, because no per-line cap can bound it: 10.000 units of a
        # $10.000 product overflows on a single line, and `items` has no length
        # limit either. Without this the write raises `DataError` and DRF, which
        # does not map it, turns it into a 500. Runs before any row is written.
        if total > MAX_SALE_TOTAL:
            raise serializers.ValidationError(
                {
                    "items": [
                        f"El total de la venta ({total}) supera el máximo permitido "
                        f"({MAX_SALE_TOTAL}). Divide la venta."
                    ]
                }
            )

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
