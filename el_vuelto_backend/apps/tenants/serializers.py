import secrets

from rest_framework import serializers

from .models import Tenant


class TenantSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tenant
        fields = [
            "id",
            "nombre",
            "nit",
            "ciudad",
            "correo",
            "logo",
            "activo",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class TenantCreateSerializer(TenantSerializer):
    """Used on creation — auto-creates the first Admin user and returns initial credentials."""

    admin_nombre = serializers.CharField(write_only=True, min_length=2)
    admin_correo = serializers.EmailField(write_only=True)
    initial_admin_password = serializers.SerializerMethodField(read_only=True)

    class Meta(TenantSerializer.Meta):
        fields = TenantSerializer.Meta.fields + [
            "admin_nombre",
            "admin_correo",
            "initial_admin_password",
        ]

    def get_initial_admin_password(self, obj):
        return self.context.get("initial_admin_password")

    def create(self, validated_data):
        admin_nombre = validated_data.pop("admin_nombre")
        admin_correo = validated_data.pop("admin_correo")
        tenant = super().create(validated_data)
        initial_password = secrets.token_urlsafe(12)
        self.context["initial_admin_password"] = initial_password
        self._create_initial_admin(tenant, admin_nombre, admin_correo, initial_password)
        return tenant

    @staticmethod
    def _create_initial_admin(tenant, admin_nombre, admin_correo, password):
        from apps.users.models import User, UserRole

        User.objects.create_user(
            correo=admin_correo,
            password=password,
            nombre=admin_nombre,
            tenant=tenant,
            rol=UserRole.ADMIN,
            is_staff=True,
        )
