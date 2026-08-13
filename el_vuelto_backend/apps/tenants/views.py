from datetime import datetime
from zoneinfo import ZoneInfo

from django.db.models import Sum
from django.http import Http404
from django.shortcuts import get_object_or_404
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.users.permissions import IsSuperAdmin
from apps.users.throttles import TenantSlugIPThrottle
from elvuelto.cloudinary_uploads import (
    LOGO_TRANSFORMATION,
    destroy_image,
    image_delivery_url,
    upload_optimized_image,
    validate_image_upload,
)

from .models import Tenant, TenantDocument
from .viewsets import METHODS_WITHOUT_PUT
from .serializers import TenantCreateSerializer, TenantSerializer

# Same zone the reports module uses (apps/reports/views.py). A "month" is a
# calendar month as the shopkeeper experiences it, not as UTC sees it.
BOGOTA_TZ = ZoneInfo("America/Bogota")


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
        # Raises DRF ValidationError → 400 (missing file, wrong type, >10 MB).
        validate_image_upload(image)

        result = upload_optimized_image(
            image,
            folder="elvuelto/tenants/logos",
            public_id=f"tenant_{tenant.id}_logo",
            transformation=LOGO_TRANSFORMATION,
        )
        # The logo is rendered on the staff login page and embedded in the
        # credentials PDF, so it is worth serving in a modern format too.
        logo_url = image_delivery_url(result)

        TenantDocument.objects.update_or_create(
            tenant=tenant,
            document_type=TenantDocument.DocumentType.LOGO,
            defaults={
                "cloudinary_public_id": result["public_id"],
                "cloudinary_url": logo_url,
            },
        )

        return Response({"logo_url": logo_url}, status=status.HTTP_200_OK)

    @action(detail=True, methods=["delete"], url_path="logo",
            permission_classes=[IsSuperAdmin])
    def delete_logo(self, request, pk=None):
        """Remove a tenant's logo — the asset and the row that points at it.

        **Idempotent by design: always 204, even with no logo to remove.** A
        DELETE states a desired end state ("this business has no logo"), and
        that state is reached either way. Returning 404 for "there was nothing"
        would turn a double click — or a retry after a dropped connection —
        into a spurious error on an operation that in fact succeeded.

        `unique_together = ("tenant", "document_type")` (`models.py:78`) is what
        makes `.first()` exhaustive here: there is at most one LOGO row.

        The Cloudinary call is best effort and deliberately cannot fail the
        request (see `destroy_image`), but it runs **before** `doc.delete()` so
        that an unexpected exception — anything the SDK does not wrap — leaves
        the row intact and the state consistent, rather than a business whose
        logo is gone from the UI while still stored and billed for.
        """
        tenant = self.get_object()
        doc = tenant.documents.filter(
            document_type=TenantDocument.DocumentType.LOGO
        ).first()

        if doc is not None:
            destroy_image(doc.cloudinary_public_id)
            doc.delete()

        return Response(status=status.HTTP_204_NO_CONTENT)


# ── SUPERADMIN, scoped to ONE tenant by URL ──────────────────────────────────
#
# A SUPERADMIN has `tenant=None`, so `request.tenant` is always `None` and every
# tenant-scoped endpoint answers 403 through `require_tenant` — by design (the
# access model keeps platform staff out of business data). These three views are
# the explicit, bounded exception: the tenant comes from the **URL**, never from
# `request.tenant`, and each one re-derives its scope from that id alone.
#
# What this is NOT: impersonation. No token is issued, no session is created,
# nothing here lets a SUPERADMIN act "as" the tenant. They read a support
# dashboard and can rotate one credential; that is the whole surface.
#
# The invariant that matters: **a `tenant_id` in the URL cannot reach a row that
# belongs to a different tenant.** Every queryset below filters by it.


class SuperAdminTenantScopedView(APIView):
    """Base for the SUPERADMIN views that address one tenant by URL.

    Centralises the two things each of them must not forget: the permission, and
    resolving `tenant_id` into a real row (404 instead of a 500 or, worse, a
    queryset filtered by a non-existent id that silently returns nothing).
    """

    permission_classes = [IsSuperAdmin]

    @staticmethod
    def get_tenant(tenant_id):
        return get_object_or_404(Tenant, pk=tenant_id)


class TenantUsersView(SuperAdminTenantScopedView):
    """GET /api/tenants/<tenant_id>/users/ — staff of one business."""

    def get(self, request, tenant_id):
        from apps.users.models import User
        from apps.users.serializers import UserSerializer

        tenant = self.get_tenant(tenant_id)
        users = User.objects.filter(tenant=tenant).order_by("nombre")
        # Same serializer as /api/users/ on purpose: the support screen shows
        # the same rows the tenant's own admin sees, so there is one shape to
        # keep in sync instead of two.
        return Response(UserSerializer(users, many=True).data)


class TenantUserResetPasswordView(SuperAdminTenantScopedView):
    """POST /api/tenants/<tenant_id>/users/<user_id>/reset_password/"""

    def post(self, request, tenant_id, user_id):
        from apps.users.models import User
        from apps.users.serializers import generate_new_password

        tenant = self.get_tenant(tenant_id)
        # THE guard of this module: the filter carries BOTH ids, so a `user_id`
        # belonging to another business simply does not match and the caller
        # gets a 404. Looking the user up by pk alone and then checking the
        # tenant would be equivalent only if nobody ever forgets the check —
        # this way the query itself cannot express the wrong thing.
        user = User.objects.filter(pk=user_id, tenant=tenant).first()
        if user is None:
            raise Http404("No existe ese usuario en este negocio.")

        new_password = generate_new_password(user.rol)
        user.set_password(new_password)
        user.save()
        # `CHECK_REVOKE_TOKEN` is on, so changing the hash also kills every token
        # this user already had (see CLAUDE.md). Nothing to do here for that.
        return Response({"new_password": new_password})


class TenantMetricsView(SuperAdminTenantScopedView):
    """GET /api/tenants/<tenant_id>/metrics/ — support snapshot of one business."""

    def get(self, request, tenant_id):
        from apps.sales.models import Sale
        from apps.users.models import User, UserRole

        tenant = self.get_tenant(tenant_id)

        # "Today" and "this month" as the shopkeeper lives them: `USE_TZ` is on
        # and rows are stored in UTC, so a sale at 8pm Bogotá is already
        # *tomorrow* in UTC. `__date` with an explicit tzinfo is the same
        # criterion the reports module uses.
        hoy = datetime.now(BOGOTA_TZ).date()
        primero_del_mes = hoy.replace(day=1)

        ventas = Sale.objects.filter(tenant=tenant)
        ventas_mes = ventas.filter(
            created_at__date__gte=primero_del_mes, created_at__date__lte=hoy
        ).aggregate(total=Sum("total"))["total"]
        ventas_hoy = ventas.filter(created_at__date=hoy).aggregate(total=Sum("total"))["total"]

        return Response(
            {
                # `Sum` returns None with no rows; a brand-new business must read
                # 0, not `null` — the UI would print "null" and a chart would
                # break on it.
                "ventas_mes": float(ventas_mes or 0),
                "ventas_hoy": float(ventas_hoy or 0),
                "num_admins": User.objects.filter(tenant=tenant, rol=UserRole.ADMIN).count(),
                "num_cajeros": User.objects.filter(tenant=tenant, rol=UserRole.CAJERO).count(),
                "fecha_alta": tenant.created_at,
                "activo": tenant.activo,
            }
        )
