import random
import string

from rest_framework import serializers
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.tokens import RefreshToken

from .models import User, UserRole


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Adds tenant_id, rol, nombre, cedula to the JWT payload. Supports cedula login."""

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["tenant_id"] = str(user.tenant_id) if user.tenant_id else None
        token["rol"] = user.rol
        token["nombre"] = user.nombre
        token["cedula"] = user.cedula
        return token

    def validate(self, attrs):
        cedula = self.initial_data.get("cedula")
        if cedula:
            cedula = cedula.strip()
            tenant_id = self.initial_data.get("tenant_id")
            qs = User.objects.filter(cedula=cedula)
            if tenant_id:
                qs = qs.filter(tenant_id=tenant_id)
            user = qs.first()
            if user is None:
                raise AuthenticationFailed("Credenciales incorrectas.")
            if not user.check_password(self.initial_data.get("password", "")):
                raise AuthenticationFailed("Credenciales incorrectas.")
            if not user.is_active:
                raise AuthenticationFailed("Esta cuenta está desactivada.")
            refresh = self.get_token(user)
            return {
                "refresh": str(refresh),
                "access": str(refresh.access_token),
                "user": {
                    "id": str(user.id),
                    "nombre": user.nombre,
                    "correo": user.correo,
                    "cedula": user.cedula,
                    "rol": user.rol,
                    "activo": user.activo,
                    "tenant_id": str(user.tenant_id) if user.tenant_id else None,
                    "tenant_nombre": user.tenant.nombre if user.tenant_id else None,
                },
            }

        data = super().validate(attrs)
        user = self.user
        data["user"] = {
            "id": str(user.id),
            "nombre": user.nombre,
            "correo": user.correo,
            "cedula": user.cedula,
            "rol": user.rol,
            "activo": user.activo,
            "tenant_id": str(user.tenant_id) if user.tenant_id else None,
            "tenant_nombre": user.tenant.nombre if user.tenant_id else None,
        }
        return data


class CashierLoginSerializer(serializers.Serializer):
    cedula = serializers.CharField(min_length=1)
    password = serializers.CharField(min_length=4, style={"input_type": "password"})
    tenant_id = serializers.UUIDField(required=False, allow_null=True)

    def validate(self, data):
        cedula = data["cedula"].strip()
        password = data["password"]
        tenant_id = data.get("tenant_id")

        qs = User.objects.filter(cedula=cedula)
        if tenant_id:
            qs = qs.filter(tenant_id=tenant_id)
        user = qs.first()

        if user is None:
            raise AuthenticationFailed("Credenciales incorrectas.")
        if not user.check_password(password):
            raise AuthenticationFailed("Credenciales incorrectas.")
        if not user.is_active:
            raise AuthenticationFailed("Esta cuenta está desactivada.")

        refresh = CustomTokenObtainPairSerializer.get_token(user)
        return {
            "refresh": str(refresh),
            "access": str(refresh.access_token),
            "user": {
                "id": str(user.id),
                "nombre": user.nombre,
                "correo": user.correo,
                "cedula": user.cedula,
                "rol": user.rol,
                "activo": user.activo,
                "tenant_id": str(user.tenant_id) if user.tenant_id else None,
                "tenant_nombre": user.tenant.nombre if user.tenant_id else None,
            },
        }


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            "id",
            "tenant",
            "nombre",
            "correo",
            "cedula",
            "rol",
            "activo",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "tenant", "created_at", "updated_at"]


class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=4)
    correo = serializers.EmailField(required=False, allow_null=True, allow_blank=True, validators=[])
    cedula = serializers.CharField(required=False, allow_null=True, allow_blank=True, max_length=20, validators=[])

    class Meta:
        model = User
        fields = ["id", "nombre", "correo", "cedula", "password", "rol", "activo"]
        read_only_fields = ["id"]

    def validate_rol(self, value):
        if value == UserRole.SUPERADMIN:
            raise serializers.ValidationError(
                "No se puede asignar el rol SUPERADMIN desde este endpoint."
            )
        return value

    def validate(self, data):
        rol = data.get("rol", UserRole.CAJERO)
        correo = (data.get("correo") or "").strip() or None
        cedula = (data.get("cedula") or "").strip() or None

        if rol == UserRole.CAJERO and not cedula:
            raise serializers.ValidationError({"cedula": "La cédula es obligatoria para cajeros."})
        if rol == UserRole.ADMIN and not correo:
            raise serializers.ValidationError({"correo": "El correo es obligatorio para administradores."})

        # Uniqueness checks (manual, to handle nullable fields correctly)
        instance = self.instance
        tenant = self.context["request"].tenant
        if correo:
            qs = User.objects.filter(correo=correo)
            if instance:
                qs = qs.exclude(pk=instance.pk)
            if qs.exists():
                raise serializers.ValidationError({"correo": "Ya existe un usuario con este correo."})
        if cedula:
            qs = User.objects.filter(cedula=cedula, tenant=tenant)
            if instance:
                qs = qs.exclude(pk=instance.pk)
            if qs.exists():
                raise serializers.ValidationError({"cedula": "Ya existe un cajero con esta cédula en este negocio."})

        data["correo"] = correo
        data["cedula"] = cedula
        return data

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
            if attr in ("correo", "cedula") and isinstance(value, str):
                value = value.strip() or None
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance


def generate_new_password(rol: str) -> str:
    if rol == UserRole.CAJERO:
        return "".join(random.choices(string.digits, k=4))
    chars = string.ascii_letters + string.digits + "!@#$%"
    required = [
        random.choice(string.ascii_uppercase),
        random.choice(string.ascii_lowercase),
        random.choice(string.digits),
        random.choice("!@#$%"),
    ]
    rest = random.choices(chars, k=6)
    combined = required + rest
    random.shuffle(combined)
    return "".join(combined)
