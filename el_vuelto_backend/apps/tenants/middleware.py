from django.utils.functional import SimpleLazyObject
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import AccessToken


def _resolve_tenant(request):
    auth_header = request.META.get("HTTP_AUTHORIZATION", "")
    if not auth_header.startswith("Bearer "):
        return None
    raw_token = auth_header.split(" ", 1)[1]
    try:
        token = AccessToken(raw_token)
        tenant_id = token.get("tenant_id")
        if not tenant_id:
            return None
        from apps.tenants.models import Tenant

        return Tenant.objects.filter(id=tenant_id, activo=True).first()
    except (TokenError, Exception):
        return None


class TenantMiddleware:
    """Injects request.tenant from the JWT payload. Evaluated lazily."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        request.tenant = SimpleLazyObject(lambda: _resolve_tenant(request))
        return self.get_response(request)
