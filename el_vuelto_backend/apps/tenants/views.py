import cloudinary.uploader
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from apps.users.permissions import IsSuperAdmin

from .models import Tenant, TenantDocument
from .serializers import TenantCreateSerializer, TenantSerializer


class TenantViewSet(viewsets.ModelViewSet):
    """CRUD for Tenants — list is public (used by login page); all other actions require superadmin."""

    queryset = Tenant.objects.prefetch_related("documents").all().order_by("nombre")

    def get_permissions(self):
        if self.action == "list":
            return [AllowAny()]
        return [IsSuperAdmin()]

    def get_serializer_class(self):
        if self.action == "create":
            return TenantCreateSerializer
        return TenantSerializer

    @action(detail=True, methods=["post"], url_path="upload_logo",
            permission_classes=[IsSuperAdmin])
    def upload_logo(self, request, pk=None):
        tenant = self.get_object()
        image = request.FILES.get("logo")
        if not image:
            return Response({"error": "No image provided."}, status=status.HTTP_400_BAD_REQUEST)

        result = cloudinary.uploader.upload(
            image,
            folder="elvuelto/tenants/logos",
            public_id=f"tenant_{tenant.id}_logo",
            overwrite=True,
            resource_type="image",
        )

        TenantDocument.objects.update_or_create(
            tenant=tenant,
            document_type=TenantDocument.DocumentType.LOGO,
            defaults={
                "cloudinary_public_id": result["public_id"],
                "cloudinary_url": result["secure_url"],
            },
        )

        return Response({"logo_url": result["secure_url"]}, status=status.HTTP_200_OK)
