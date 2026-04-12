from rest_framework import mixins, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.products.models import Product, ProductType
from apps.tenants.viewsets import TenantModelViewSet
from apps.users.permissions import IsAdmin

from .models import InventoryMovement
from .serializers import InventoryMovementSerializer, StockSerializer


class InventoryMovementViewSet(
    mixins.CreateModelMixin,
    mixins.ListModelMixin,
    viewsets.GenericViewSet,
):
    """
    POST  /api/inventory/movements/  — Admin only, creates ENTRADA or AJUSTE movements.
    GET   /api/inventory/movements/  — Lists movements, filterable by product and date.
    """

    serializer_class = InventoryMovementSerializer
    permission_classes = [IsAdmin]

    def get_queryset(self):
        qs = InventoryMovement.objects.filter(
            tenant=self.request.tenant
        ).select_related("product", "user")

        product_id = self.request.query_params.get("product")
        fecha_inicio = self.request.query_params.get("fecha_inicio")
        fecha_fin = self.request.query_params.get("fecha_fin")

        if product_id:
            qs = qs.filter(product_id=product_id)
        if fecha_inicio:
            qs = qs.filter(created_at__date__gte=fecha_inicio)
        if fecha_fin:
            qs = qs.filter(created_at__date__lte=fecha_fin)

        return qs

    def perform_create(self, serializer):
        serializer.save(tenant=self.request.tenant, user=self.request.user)


class StockView(APIView):
    """GET /api/inventory/stock/ — Current stock for all CON_CODIGO products."""

    permission_classes = [IsAdmin]

    def get(self, request):
        products = Product.objects.filter(
            tenant=request.tenant,
            tipo=ProductType.CON_CODIGO,
            activo=True,
        ).order_by("nombre")
        serializer = StockSerializer(products, many=True)
        return Response(serializer.data)
