from rest_framework import status
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.tenants.viewsets import TenantModelViewSet
from apps.users.permissions import IsAdmin, IsCajero
from elvuelto.cloudinary_uploads import (
    CATALOG_IMAGE_TRANSFORMATION,
    image_delivery_url,
    upload_optimized_image,
    validate_image_upload,
)

from .models import Category, Product
from .serializers import CategorySerializer, ProductPOSSerializer, ProductSerializer


class CategoryViewSet(TenantModelViewSet):
    queryset = Category.objects.all().order_by("nombre")
    serializer_class = CategorySerializer

    def get_permissions(self):
        # Cashier is read-only on the catalog: may list/retrieve categories,
        # but create/update/partial_update/destroy/upload_image stay admin-only.
        if self.action in ("list", "retrieve"):
            return [IsCajero()]
        return [IsAdmin()]

    @action(detail=True, methods=["post"], url_path="upload_image")
    def upload_image(self, request, pk=None):
        category = self.get_object()
        image = request.FILES.get("image")
        # Raises DRF ValidationError → 400 (missing file, wrong type, >10 MB).
        validate_image_upload(image)

        result = upload_optimized_image(
            image,
            folder="elvuelto/categories",
            public_id=f"category_{category.id}",
            transformation=CATALOG_IMAGE_TRANSFORMATION,
        )
        # `f_auto` URL, not `result["secure_url"]`: the stored asset is already
        # resized, and this serves it as WebP/AVIF where the browser allows it.
        imagen_url = image_delivery_url(result)

        category.imagen_url = imagen_url
        category.imagen_public_id = result["public_id"]
        category.save(update_fields=["imagen_url", "imagen_public_id"])

        return Response({"imagen_url": imagen_url}, status=status.HTTP_200_OK)


class ProductViewSet(TenantModelViewSet):
    permission_classes = [IsAdmin]
    serializer_class = ProductSerializer

    def get_queryset(self):
        # Overriding get_queryset drops TenantModelViewSet's guard, so call
        # _get_tenant() (require_tenant) explicitly: no tenant ⇒ 403.
        qs = Product.objects.filter(tenant=self._get_tenant()).select_related("category")
        activo = self.request.query_params.get("activo")
        if activo is not None:
            qs = qs.filter(activo=activo.lower() in ("true", "1"))
        return qs.order_by("nombre")

    @action(detail=True, methods=["post"], url_path="upload_image")
    def upload_image(self, request, pk=None):
        product = self.get_object()
        image = request.FILES.get("image")
        validate_image_upload(image)

        result = upload_optimized_image(
            image,
            folder="elvuelto/products",
            public_id=f"product_{product.id}",
            transformation=CATALOG_IMAGE_TRANSFORMATION,
        )
        imagen_url = image_delivery_url(result)

        product.imagen_url = imagen_url
        product.imagen_public_id = result["public_id"]
        product.save(update_fields=["imagen_url", "imagen_public_id"])

        return Response({"imagen_url": imagen_url}, status=status.HTTP_200_OK)

    @action(detail=False, methods=["get"], url_path="pos", permission_classes=[IsCajero])
    def pos(self, request):
        """Returns minimal product data optimised for the POS screen."""
        products = (
            Product.objects.filter(tenant=self._get_tenant(), activo=True)
            .select_related("category")
            .order_by("nombre")
        )
        serializer = ProductPOSSerializer(products, many=True)
        return Response(serializer.data)
