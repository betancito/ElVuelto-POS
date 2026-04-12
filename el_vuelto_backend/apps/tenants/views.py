from rest_framework import viewsets

from apps.users.permissions import IsSuperAdmin

from .models import Tenant
from .serializers import TenantCreateSerializer, TenantSerializer


class TenantViewSet(viewsets.ModelViewSet):
    """CRUD for Tenants — superadmin only. No tenant filtering applied here."""

    queryset = Tenant.objects.all().order_by("nombre")
    permission_classes = [IsSuperAdmin]

    def get_serializer_class(self):
        if self.action == "create":
            return TenantCreateSerializer
        return TenantSerializer
