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

    initial_admin_password = serializers.SerializerMethodField(read_only=True)

    class Meta(TenantSerializer.Meta):
        fields = TenantSerializer.Meta.fields + ["initial_admin_password"]

    def get_initial_admin_password(self, obj):
        return self.context.get("initial_admin_password")

    def create(self, validated_data):
        tenant = super().create(validated_data)
        initial_password = secrets.token_urlsafe(12)
        self.context["initial_admin_password"] = initial_password
        self._create_initial_admin(tenant, initial_password)
        return tenant

    @staticmethod
    def _create_initial_admin(tenant, password):
        from apps.users.models import User, UserRole

        User.objects.create_user(
            correo=tenant.correo,
            password=password,
            nombre=f"Admin {tenant.nombre}",
            tenant=tenant,
            rol=UserRole.ADMIN,
            is_staff=True,
        )
