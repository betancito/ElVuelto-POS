from django.urls import path

from .views import SummaryReportView, TopProductosView, VentasPorHoraView

urlpatterns = [
    path("summary/", SummaryReportView.as_view(), name="report-summary"),
    path("ventas-por-hora/", VentasPorHoraView.as_view(), name="report-ventas-por-hora"),
    path("top-productos/", TopProductosView.as_view(), name="report-top-productos"),
]
