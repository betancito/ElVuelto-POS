from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView

from .models import User
from .permissions import IsAdmin
from .serializers import (
    CashierLoginSerializer,
    CustomTokenObtainPairSerializer,
    UserCreateSerializer,
    UserSerializer,
    generate_new_password,
)


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer


class CashierLoginView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

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
            correo = data["correo"].strip() if data["correo"] else None
            if correo and User.objects.filter(correo=correo).exclude(pk=user.pk).exists():
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
            if len(new_password) < 6:
                return Response(
                    {"new_password": "Mínimo 6 caracteres."}, status=status.HTTP_400_BAD_REQUEST
                )
            user.set_password(new_password)

        user.save()
        return Response(UserSerializer(user).data)


class UserViewSet(viewsets.ModelViewSet):
    """CRUD for users scoped to the authenticated user's tenant."""

    permission_classes = [IsAdmin]

    def get_queryset(self):
        return User.objects.filter(tenant=self.request.tenant).order_by("nombre")

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
