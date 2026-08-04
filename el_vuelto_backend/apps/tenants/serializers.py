import secrets

from django.contrib.auth.models import BaseUserManager
from django.db import transaction
from rest_framework import serializers

from .models import Tenant, TenantDocument


class TenantSerializer(serializers.ModelSerializer):
    logo_url = serializers.SerializerMethodField()

    class Meta:
        model = Tenant
        fields = [
            "id",
            "nombre",
            "nit",
            "ciudad",
            "correo",
            "support_number",
            "activo",
            "logo_url",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_logo_url(self, obj):
        doc = obj.documents.filter(document_type=TenantDocument.DocumentType.LOGO).first()
        return doc.cloudinary_url if doc else None


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

    def validate(self, attrs):
        attrs = super().validate(attrs)
        # Admin correo is globally unique (User.correo). Pre-check here so a
        # duplicate returns a clean 400 by-field instead of a 500 + orphan tenant.
        from apps.users.models import User

        admin_correo = BaseUserManager.normalize_email(attrs["admin_correo"])
        if User.objects.filter(correo=admin_correo).exists():
            raise serializers.ValidationError(
                {"admin_correo": "Ya existe un usuario con este correo."}
            )
        attrs["admin_correo"] = admin_correo
        return attrs

    def create(self, validated_data):
        admin_nombre = validated_data.pop("admin_nombre")
        admin_correo = validated_data.pop("admin_correo")
        # Tenant + initial admin must commit together: if the admin insert fails
        # (e.g. a correo race), roll the tenant back so no orphan tenant remains.
        with transaction.atomic():
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
