from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import User, UserRole


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Adds tenant_id, rol and nombre to the JWT payload."""

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["tenant_id"] = str(user.tenant_id) if user.tenant_id else None
        token["rol"] = user.rol
        token["nombre"] = user.nombre
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        data["user"] = {
            "id": str(self.user.id),
            "nombre": self.user.nombre,
            "correo": self.user.correo,
            "rol": self.user.rol,
            "tenant_id": str(self.user.tenant_id) if self.user.tenant_id else None,
        }
        return data


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            "id",
            "tenant",
            "nombre",
            "correo",
            "rol",
            "activo",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "tenant", "created_at", "updated_at"]


class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)

    class Meta:
        model = User
        fields = ["id", "nombre", "correo", "password", "rol", "activo"]
        read_only_fields = ["id"]

    def validate_rol(self, value):
        if value == UserRole.SUPERADMIN:
            raise serializers.ValidationError(
                "No se puede asignar el rol SUPERADMIN desde este endpoint."
            )
        return value

    def create(self, validated_data):
        request = self.context["request"]
        validated_data["tenant"] = request.tenant
        password = validated_data.pop("password")
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop("password", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance
