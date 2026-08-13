from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

from elvuelto.docs_views import DocsLoginView, DocsRedocView, DocsSchemaView, DocsSwaggerView

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include("apps.users.urls")),
    path("api/tenants/", include("apps.tenants.urls")),
    path("api/products/", include("apps.products.urls")),
    path("api/inventory/", include("apps.inventory.urls")),
    path("api/sales/", include("apps.sales.urls")),
    path("api/reports/", include("apps.reports.urls")),
    # API docs — gated by DOCS_API_KEY, see elvuelto/docs_auth.py.
    path("api/schema/", DocsSchemaView.as_view(), name="schema"),
    path("docs/login/", DocsLoginView.as_view(), name="docs-login"),
    path("docs/", DocsSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    path("redoc/", DocsRedocView.as_view(url_name="schema"), name="redoc"),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
