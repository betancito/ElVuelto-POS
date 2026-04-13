from rest_framework import viewsets
from rest_framework.permissions import AllowAny

from apps.users.permissions import IsSuperAdmin

from .models import Tenant
from .serializers import TenantCreateSerializer, TenantSerializer


class TenantViewSet(viewsets.ModelViewSet):
    """CRUD for Tenants — list is public (used by login page); all other actions require superadmin."""

    queryset = Tenant.objects.all().order_by("nombre")

    def get_permissions(self):
        if self.action == "list":
            return [AllowAny()]
        return [IsSuperAdmin()]

    def get_serializer_class(self):
        if self.action == "create":
            return TenantCreateSerializer
        return TenantSerializer
