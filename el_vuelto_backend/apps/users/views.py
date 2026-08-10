from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.validators import validate_email
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from apps.tenants.utils import require_tenant
from apps.tenants.viewsets import METHODS_WITHOUT_PUT

from .models import User, UserRole
from .password_policy import length_error_for, min_length_for
from .permissions import IsAdmin
from .throttles import (
    LoginIdentityBurstThrottle,
    LoginIdentityDailyThrottle,
    LoginIPThrottle,
    TokenRefreshIPThrottle,
)
from .serializers import (
    ActiveUserTokenRefreshSerializer,
    CashierLoginSerializer,
    CustomTokenObtainPairSerializer,
    UserCreateSerializer,
    UserSerializer,
    generate_new_password,
)


LOGIN_THROTTLES = [
    LoginIdentityBurstThrottle,
    LoginIdentityDailyThrottle,
    LoginIPThrottle,
]


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer
    throttle_classes = LOGIN_THROTTLES


class ThrottledTokenRefreshView(TokenRefreshView):
    """`TokenRefreshView` with a rate limit and an active-user check.

    The base class has neither: it would hand a fresh access token to a
    deactivated user (see `ActiveUserTokenRefreshSerializer`).
    """

    serializer_class = ActiveUserTokenRefreshSerializer
    throttle_classes = [TokenRefreshIPThrottle]


class CashierLoginView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    # The POS login is the brute-force target: public tenant UUID + non-secret
    # cédula + 4-digit PIN. See apps/users/throttles.py.
    throttle_classes = LOGIN_THROTTLES

    def post(self, request):
        serializer = CashierLoginSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        return Response(serializer.validated_data)


class MeView(APIView):
    def get(self, request):
        return Response(UserSerializer(request.user).data)


class UpdateMeView(APIView):
    """PATCH /api/auth/me/update/ — update own nombre, correo, or password."""

    def patch(self, request):
        user = request.user
        data = request.data

        if "nombre" in data:
            nombre = (data["nombre"] or "").strip()
            if len(nombre) < 2:
                return Response(
                    {"nombre": "Mínimo 2 caracteres."}, status=status.HTTP_400_BAD_REQUEST
                )
            user.nombre = nombre

        if "correo" in data:
            # Normalise BEFORE deciding anything: `"   "` is truthy, so the old
            # `data["correo"].strip() if data["correo"] else None` stored an empty
            # string instead of NULL — and `correo` is unique, so the *second*
            # user doing it hit `IntegrityError` (a 500 DRF does not map). Same
            # normalisation as `UserCreateSerializer.validate`.
            correo = (data["correo"] or "").strip() or None
            if not correo:
                # Two independent reasons to refuse, both about lockout:
                # (a) the per-role invariant — an administrator always has a
                #     correo (same rule as UserCreateSerializer / User.clean);
                # (b) whatever the rol, `correo` is USERNAME_FIELD and the only
                #     login that does not use it is the cashier flow, which needs
                #     `cedula` AND `tenant_id` (CashierLoginSerializer). Someone
                #     without both has no way back in — a SUPERADMIN has neither.
                if user.rol in (UserRole.ADMIN, UserRole.SUPERADMIN):
                    return Response(
                        {"correo": "El correo es obligatorio para administradores."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                if not (user.cedula and user.tenant_id):
                    return Response(
                        {"correo": "No puedes quedarte sin correo: es tu única forma de iniciar sesión."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
            if correo:
                try:
                    validate_email(correo)
                except DjangoValidationError:
                    return Response(
                        {"correo": "Correo inválido."}, status=status.HTTP_400_BAD_REQUEST
                    )
                if User.objects.filter(correo=correo).exclude(pk=user.pk).exists():
                    return Response(
                        {"correo": "Ya existe un usuario con este correo."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
            user.correo = correo

        if "new_password" in data:
            current_password = data.get("current_password", "")
            if not user.check_password(current_password):
                return Response(
                    {"current_password": "Contraseña actual incorrecta."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            new_password = data["new_password"]
            if len(new_password) < min_length_for(user.rol):
                return Response(
                    {"new_password": length_error_for(user.rol)},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            user.set_password(new_password)

        user.save()
        return Response(UserSerializer(user).data)


class UserViewSet(viewsets.ModelViewSet):
    """CRUD for users scoped to the authenticated user's tenant."""

    permission_classes = [IsAdmin]
    # No PUT: a multipart PUT omitting `activo`/`lead_cashier` would silently
    # switch them off (see METHODS_WITHOUT_PUT).
    http_method_names = METHODS_WITHOUT_PUT

    def get_queryset(self):
        # User.tenant is a NULLABLE FK, so letting the tenant resolve to a literal
        # None would turn this into `tenant IS NULL` — i.e. every SUPERADMIN of the
        # platform, listable and editable. No tenant ⇒ 403, never a queryset.
        return User.objects.filter(tenant=require_tenant(self.request)).order_by("nombre")

    def get_serializer_class(self):
        if self.action in ("create", "update", "partial_update"):
            return UserCreateSerializer
        return UserSerializer

    @action(detail=True, methods=["post"])
    def toggle_active(self, request, pk=None):
        user = self.get_object()
        user.activo = not user.activo
        user.save()
        return Response(UserSerializer(user).data)

    @action(detail=True, methods=["post"])
    def reset_password(self, request, pk=None):
        user = self.get_object()
        new_password = generate_new_password(user.rol)
        user.set_password(new_password)
        user.save()
        return Response({"new_password": new_password})
