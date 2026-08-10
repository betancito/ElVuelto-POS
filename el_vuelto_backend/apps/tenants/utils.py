from rest_framework.exceptions import PermissionDenied


def require_tenant(request):
    """Return ``request.tenant`` or raise 403 when there is no tenant context.

    Every tenant-scoped endpoint (plain ``APIView`` or otherwise) must call this
    instead of dereferencing ``request.tenant`` directly. ``request.tenant`` is
    ``None`` for a SUPERADMIN (who has no tenant and must impersonate to see
    tenant data — access-model ADR) and for an inactive/invalid tenant. Without
    this guard such requests either 500 (dereferencing ``None``) or silently
    return empty, ambiguous data.

    Gotcha: ``request.tenant`` is a ``SimpleLazyObject`` (see
    ``TenantMiddleware``). ``lazy is None`` is **always** False — ``is`` compares
    the proxy's identity and never triggers evaluation — so the None case must be
    detected via truthiness (a resolved ``None`` is falsy), never ``is None``.
    """
    tenant = request.tenant
    if not tenant:
        raise PermissionDenied("Tenant context is required for this resource.")
    return tenant
