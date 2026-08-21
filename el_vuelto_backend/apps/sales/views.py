from django.db.models import Q
from rest_framework import mixins, status, viewsets
from rest_framework.response import Response

from apps.products.models import Product
from apps.tenants.date_params import parse_date_range
from apps.tenants.utils import require_tenant
from apps.users.permissions import IsCajero, IsAdmin

from .models import Sale
from .serializers import SaleCreateSerializer, SaleSerializer


class SaleViewSet(
    mixins.CreateModelMixin,
    mixins.RetrieveModelMixin,
    mixins.ListModelMixin,
    viewsets.GenericViewSet,
):
    """
    POST /api/sales/         — Create a complete sale (CAJERO+).
    GET  /api/sales/         — List sales with optional filters.
    GET  /api/sales/{id}/    — Single sale detail for receipt reprint.
    """

    def get_permissions(self):
        if self.action == "create":
            return [IsCajero()]
        return [IsAdmin()]

    def get_queryset(self):
        # No tenant ⇒ 403 (never an unfiltered/ambiguous queryset). Resolving the
        # lazy tenant first also avoids the TypeError a None proxy raises in filter().
        qs = Sale.objects.filter(
            tenant=require_tenant(self.request)
        ).prefetch_related("items").select_related("user")

        # Raw strings in a date lookup raise Django's ValidationError, which DRF
        # does NOT map → 500. Parsed here so a bad date is a 400 on its field.
        # Half a range is intentional: each bound filters open-ended.
        fecha_inicio, fecha_fin = parse_date_range(self.request.query_params)
        metodo_pago = self.request.query_params.get("metodo_pago")
        user_id = self.request.query_params.get("user")

        if fecha_inicio:
            qs = qs.filter(created_at__date__gte=fecha_inicio)
        if fecha_fin:
            qs = qs.filter(created_at__date__lte=fecha_fin)
        if metodo_pago:
            qs = qs.filter(metodo_pago=metodo_pago)
        if user_id:
            qs = qs.filter(user_id=user_id)

        search = self.request.query_params.get("search")
        if search:
            qs = qs.filter(
                Q(codigo__icontains=search) | Q(user__nombre__icontains=search)
            )

        return qs

    def get_serializer_class(self):
        if self.action == "create":
            return SaleCreateSerializer
        return SaleSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        sale = serializer.save()
        data = SaleSerializer(sale, context={"request": request}).data

        # Which products this sale left below zero. Sales no longer refuse to
        # oversell (ADR-SALES-20260816-stock-negativo-permitido), so this is the
        # only thing that tells the cashier a `ENTRADA` is now owed — the POS
        # prints it on the success modal.
        #
        # Added here rather than on `SaleSerializer` on purpose: on `list` and
        # `retrieve` the same key would be a stale photo of a stock that has
        # moved since, which is worse than not having it. Scoped to this sale's
        # own items, so it cannot leak another tenant's rows.
        negativos = list(
            Product.objects.filter(
                id__in=sale.items.values_list("product_id", flat=True),
                stock_actual__lt=0,
            ).values("id", "nombre", "stock_actual")
        )
        data["stock_negativo"] = [
            {"id": str(p["id"]), "nombre": p["nombre"], "stock_actual": p["stock_actual"]}
            for p in negativos
        ]
        return Response(data, status=status.HTTP_201_CREATED)
