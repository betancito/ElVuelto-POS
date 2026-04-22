import re

import cloudinary.uploader
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.users.permissions import IsSuperAdmin

from .models import Tenant, TenantDocument
from .serializers import TenantCreateSerializer, TenantSerializer


def _nombre_to_slug(nombre: str) -> str:
    return re.sub(r"[^a-z0-9-]", "", nombre.lower().replace(" ", "-"))


class TenantBySlugView(APIView):
    """
    Public endpoint used by the staff login page.
    Returns only the minimum info needed to render the branded login UI —
    no sensitive business data (NIT, correo, ciudad, etc.) is exposed.
    """

    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request, slug: str):
        for tenant in Tenant.objects.prefetch_related("documents").filter(activo=True):
            if _nombre_to_slug(tenant.nombre) == slug:
                doc = tenant.documents.filter(
                    document_type=TenantDocument.DocumentType.LOGO
                ).first()
                return Response(
                    {
                        "exists": True,
                        "nombre": tenant.nombre,
                        "logo_url": doc.cloudinary_url if doc else None,
                    }
                )
        return Response({"exists": False, "nombre": None, "logo_url": None})


class TenantViewSet(viewsets.ModelViewSet):
    """CRUD for Tenants — all actions require superadmin."""

    queryset = Tenant.objects.prefetch_related("documents").all().order_by("nombre")

    def get_permissions(self):
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
