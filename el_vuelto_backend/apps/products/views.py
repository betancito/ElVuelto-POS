from rest_framework.decorators import action
from rest_framework.response import Response

from apps.tenants.viewsets import TenantModelViewSet
from apps.users.permissions import IsCajero

from .models import Category, Product
from .serializers import CategorySerializer, ProductPOSSerializer, ProductSerializer


class CategoryViewSet(TenantModelViewSet):
    queryset = Category.objects.all().order_by("nombre")
    serializer_class = CategorySerializer


class ProductViewSet(TenantModelViewSet):
    serializer_class = ProductSerializer

    def get_queryset(self):
        qs = Product.objects.filter(tenant=self.request.tenant).select_related("category")
        activo = self.request.query_params.get("activo")
        if activo is not None:
            qs = qs.filter(activo=activo.lower() in ("true", "1"))
        return qs.order_by("nombre")

    @action(detail=False, methods=["get"], url_path="pos", permission_classes=[IsCajero])
    def pos(self, request):
        """Returns minimal product data optimised for the POS screen."""
        products = Product.objects.filter(
            tenant=request.tenant, activo=True
        ).select_related("category").order_by("nombre")
        serializer = ProductPOSSerializer(products, many=True)
        return Response(serializer.data)
