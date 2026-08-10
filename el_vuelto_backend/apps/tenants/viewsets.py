from rest_framework import viewsets

from .utils import require_tenant

# Django's default list minus "put". PUT is disabled API-wide on purpose:
# DRF 3.15's `BooleanField.default_empty_html = False` is applied by
# `Field.get_value` whenever the input is HTML (form/multipart) and the
# serializer is NOT partial — so a multipart PUT that simply omits a boolean
# **silently sets it to False**. A superadmin renaming a business would switch
# `activo` off and take it offline. The frontend only ever uses POST/PATCH, so
# refusing PUT costs nothing and kills the whole class of bug.
METHODS_WITHOUT_PUT = ["get", "post", "patch", "delete", "head", "options", "trace"]


class TenantModelViewSet(viewsets.ModelViewSet):
    """
    Base viewset that enforces tenant isolation on every query.

    Subclasses MUST define `queryset` pointing to the full model queryset.
    This class automatically adds `.filter(tenant=request.tenant)` so that
    cross-tenant data leakage is impossible at the API layer.
    """

    http_method_names = METHODS_WITHOUT_PUT

    def _get_tenant(self):
        return require_tenant(self.request)

    def get_queryset(self):
        return super().get_queryset().filter(tenant=self._get_tenant())

    def perform_create(self, serializer):
        serializer.save(tenant=self._get_tenant())
