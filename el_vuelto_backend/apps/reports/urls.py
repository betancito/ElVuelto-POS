from django.urls import path

from .views import SalesDetailExportView, SummaryReportView, TopProductosView, VentasPorHoraView

urlpatterns = [
    path("summary/", SummaryReportView.as_view(), name="report-summary"),
    path("ventas-por-hora/", VentasPorHoraView.as_view(), name="report-ventas-por-hora"),
    path("top-productos/", TopProductosView.as_view(), name="report-top-productos"),
    path("sales-detail/", SalesDetailExportView.as_view(), name="report-sales-detail"),
]
