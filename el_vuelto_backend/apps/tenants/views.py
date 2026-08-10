import cloudinary.uploader
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.users.permissions import IsSuperAdmin
from apps.users.throttles import TenantSlugIPThrottle

from .models import Tenant, TenantDocument
from .viewsets import METHODS_WITHOUT_PUT
from .serializers import TenantCreateSerializer, TenantSerializer


class TenantBySlugView(APIView):
    """
    Public endpoint used by the staff login page.
    Returns only the minimum info needed to render the branded login UI —
    no sensitive business data (NIT, correo, ciudad, etc.) is exposed.
    """

    permission_classes = [AllowAny]
    authentication_classes = []
    # Public and unauthenticated: it hands out the tenant UUID that the cashier
    # login requires, so it is the first step of a brute force and it also lets
    # someone enumerate which businesses exist.
    throttle_classes = [TenantSlugIPThrottle]

    def get(self, request, slug: str):
        # Indexed lookup on the persisted column. This used to scan every active
        # tenant in Python and recompute the slug on each request, keeping the
        # first match — with no `unique` on `nombre`, the "winner" between two
        # colliding businesses was not even stable across requests.
        tenant = (
            Tenant.objects.prefetch_related("documents")
            .filter(slug=slug, activo=True)
            .first()
        )
        if tenant is None:
            return Response({"exists": False, "nombre": None, "logo_url": None})

        doc = tenant.documents.filter(
            document_type=TenantDocument.DocumentType.LOGO
        ).first()
        return Response(
            {
                "exists": True,
                "id": str(tenant.id),
                "nombre": tenant.nombre,
                "logo_url": doc.cloudinary_url if doc else None,
            }
        )


class TenantViewSet(viewsets.ModelViewSet):
    """CRUD for Tenants — all actions require superadmin."""

    queryset = Tenant.objects.prefetch_related("documents").all().order_by("nombre")
    # No PUT: a multipart PUT omitting `activo` would silently deactivate the
    # tenant — 403 on every endpoint and `exists:false` on its login page.
    http_method_names = METHODS_WITHOUT_PUT

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
