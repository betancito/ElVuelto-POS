from django.db.models import Q
from rest_framework import mixins, status, viewsets
from rest_framework.response import Response

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
        output = SaleSerializer(sale, context={"request": request})
        return Response(output.data, status=status.HTTP_201_CREATED)
