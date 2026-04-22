from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import TenantBySlugView, TenantViewSet

router = DefaultRouter()
router.register(r"", TenantViewSet, basename="tenant")

urlpatterns = [
    # Public — no JWT required. Returns only {exists, nombre, logo_url}.
    path("check-by-slug/<str:slug>/", TenantBySlugView.as_view(), name="tenant-check-by-slug"),
] + router.urls
