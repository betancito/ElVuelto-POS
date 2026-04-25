from rest_framework import viewsets
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
