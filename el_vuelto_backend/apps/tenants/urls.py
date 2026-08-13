from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    TenantBySlugView,
    TenantMetricsView,
    TenantUserResetPasswordView,
    TenantUsersView,
    TenantViewSet,
)

router = DefaultRouter()
router.register(r"", TenantViewSet, basename="tenant")

urlpatterns = [
    # Public — no JWT required. Returns only {exists, nombre, logo_url}.
    path("check-by-slug/<str:slug>/", TenantBySlugView.as_view(), name="tenant-check-by-slug"),
    # SUPERADMIN-only, scoped to one tenant by URL (see views.py).
    #
    # Declared before `router.urls` for readability, not out of necessity: the
    # router's detail route is `^(?P<pk>[^/.]+)/$`, anchored at `$`, so it can
    # never match `<id>/users/` no matter the order (verified by resolving both
    # orderings). What *does* matter is the `<uuid:...>` converter: a non-UUID id
    # is then a 404 from the resolver instead of reaching the ORM and raising
    # `ValidationError` → 500.
    path(
        "<uuid:tenant_id>/users/",
        TenantUsersView.as_view(),
        name="tenant-users",
    ),
    path(
        "<uuid:tenant_id>/users/<uuid:user_id>/reset_password/",
        TenantUserResetPasswordView.as_view(),
        name="tenant-user-reset-password",
    ),
    path(
        "<uuid:tenant_id>/metrics/",
        TenantMetricsView.as_view(),
        name="tenant-metrics",
    ),
] + router.urls
