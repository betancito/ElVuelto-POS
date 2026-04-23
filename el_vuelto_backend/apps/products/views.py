import cloudinary.uploader
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.tenants.viewsets import TenantModelViewSet
from apps.users.permissions import IsCajero

from .models import Category, Product
from .serializers import CategorySerializer, ProductPOSSerializer, ProductSerializer


class CategoryViewSet(TenantModelViewSet):
    queryset = Category.objects.all().order_by("nombre")
    serializer_class = CategorySerializer

    @action(detail=True, methods=["post"], url_path="upload_image")
    def upload_image(self, request, pk=None):
        category = self.get_object()
        image = request.FILES.get("image")
        if not image:
            return Response({"error": "No image provided."}, status=status.HTTP_400_BAD_REQUEST)

        result = cloudinary.uploader.upload(
            image,
            folder="elvuelto/categories",
            public_id=f"category_{category.id}",
            overwrite=True,
            resource_type="image",
        )

        category.imagen_url = result["secure_url"]
        category.imagen_public_id = result["public_id"]
        category.save(update_fields=["imagen_url", "imagen_public_id"])

        return Response({"imagen_url": result["secure_url"]}, status=status.HTTP_200_OK)


class ProductViewSet(TenantModelViewSet):
    serializer_class = ProductSerializer

    def get_queryset(self):
        qs = Product.objects.filter(tenant=self.request.tenant).select_related("category")
        activo = self.request.query_params.get("activo")
        if activo is not None:
            qs = qs.filter(activo=activo.lower() in ("true", "1"))
        return qs.order_by("nombre")

    @action(detail=True, methods=["post"], url_path="upload_image")
    def upload_image(self, request, pk=None):
        product = self.get_object()
        image = request.FILES.get("image")
        if not image:
            return Response({"error": "No image provided."}, status=status.HTTP_400_BAD_REQUEST)

        result = cloudinary.uploader.upload(
            image,
            folder="elvuelto/products",
            public_id=f"product_{product.id}",
            overwrite=True,
            resource_type="image",
        )

        product.imagen_url = result["secure_url"]
        product.imagen_public_id = result["public_id"]
        product.save(update_fields=["imagen_url", "imagen_public_id"])

        return Response({"imagen_url": result["secure_url"]}, status=status.HTTP_200_OK)

    @action(detail=False, methods=["get"], url_path="pos", permission_classes=[IsCajero])
    def pos(self, request):
        """Returns minimal product data optimised for the POS screen."""
        products = (
            Product.objects.filter(tenant=request.tenant, activo=True)
            .select_related("category")
            .order_by("nombre")
        )
        serializer = ProductPOSSerializer(products, many=True)
        return Response(serializer.data)
