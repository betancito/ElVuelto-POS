from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import InventoryMovementViewSet, StockView

router = DefaultRouter()
router.register(r"movements", InventoryMovementViewSet, basename="movement")

urlpatterns = router.urls + [
    path("stock/", StockView.as_view(), name="inventory-stock"),
]
