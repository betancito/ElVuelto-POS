from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    CashierLoginView,
    CustomTokenObtainPairView,
    MeView,
    ThrottledTokenRefreshView,
    UpdateMeView,
    UserViewSet,
)

router = DefaultRouter()
router.register(r"users", UserViewSet, basename="user")

urlpatterns = [
    path("auth/login/", CustomTokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("auth/login/cashier/", CashierLoginView.as_view(), name="cashier-login"),
    path("auth/refresh/", ThrottledTokenRefreshView.as_view(), name="token_refresh"),
    path("auth/me/", MeView.as_view(), name="auth_me"),
    path("auth/me/update/", UpdateMeView.as_view(), name="auth_me_update"),
    path("", include(router.urls)),
]
