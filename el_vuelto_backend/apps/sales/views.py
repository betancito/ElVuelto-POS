from rest_framework import mixins, status, viewsets
from rest_framework.response import Response

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
        qs = Sale.objects.filter(
            tenant=self.request.tenant
        ).prefetch_related("items").select_related("user")

        fecha_inicio = self.request.query_params.get("fecha_inicio")
        fecha_fin = self.request.query_params.get("fecha_fin")
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
