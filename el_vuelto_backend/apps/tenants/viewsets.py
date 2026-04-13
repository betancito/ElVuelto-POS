from rest_framework import viewsets
from rest_framework.exceptions import PermissionDenied


class TenantModelViewSet(viewsets.ModelViewSet):
    """
    Base viewset that enforces tenant isolation on every query.

    Subclasses MUST define `queryset` pointing to the full model queryset.
    This class automatically adds `.filter(tenant=request.tenant)` so that
    cross-tenant data leakage is impossible at the API layer.
    """

    def _get_tenant(self):
        tenant = self.request.tenant
        if tenant is None:
            raise PermissionDenied("Tenant context is required for this resource.")
        return tenant

    def get_queryset(self):
        return super().get_queryset().filter(tenant=self._get_tenant())

    def perform_create(self, serializer):
        serializer.save(tenant=self._get_tenant())
