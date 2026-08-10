from rest_framework import serializers
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer, TokenRefreshSerializer
from rest_framework_simplejwt.settings import api_settings
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.utils import get_md5_hash_password

from apps.tenants.models import TenantDocument
from apps.tenants.utils import require_tenant
from .models import User, UserRole
from .password_policy import (
    PIN_LENGTH,
    generate_password,
    length_error_for,
    min_length_for,
)


def _tenant_logo_url(user):
    if not user.tenant_id:
        return None
    doc = user.tenant.documents.filter(document_type=TenantDocument.DocumentType.LOGO).first()
    return doc.cloudinary_url if doc else None


def _user_payload(user):
    """The `user` object every login response returns.

    Extracted because this dict was written out THREE times (cédula branch and
    correo branch of `CustomTokenObtainPairSerializer.validate`, plus
    `CashierLoginSerializer.validate`) and the copies have to stay identical:
    the frontend maps this exact shape into `AuthUser` no matter which endpoint
    answered. Adding `tenant_slug` to only some of them is how the POS ends up
    with an undefined slug on the one flow that actually needs it.
    """
    return {
        "id": str(user.id),
        "nombre": user.nombre,
        "correo": user.correo,
        "cedula": user.cedula,
        "rol": user.rol,
        "activo": user.activo,
        "tenant_id": str(user.tenant_id) if user.tenant_id else None,
        "tenant_nombre": user.tenant.nombre if user.tenant_id else None,
        # Persisted, never recomputed (apps/tenants/models.py). The client used
        # to derive it from `tenant_nombre` with its own slugify, which did not
        # match the backend's for any name with a tilde or ñ.
        "tenant_slug": user.tenant.slug if user.tenant_id else None,
        "tenant_logo_url": _tenant_logo_url(user),
        "tenant_email": user.tenant.correo if user.tenant_id else None,
        "tenant_support_phone": user.tenant.support_number if user.tenant_id else None,
        "lead_cashier": user.lead_cashier,
    }


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
            # Cédula is unique only *per tenant*; require tenant_id so a cédula
            # repeated across businesses can never authenticate the wrong account.
            if not tenant_id:
                raise serializers.ValidationError(
                    {"tenant_id": "Este campo es obligatorio para el ingreso por cédula."}
                )
            user = User.objects.filter(cedula=cedula, tenant_id=tenant_id).first()
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
                "user": _user_payload(user),
            }

        data = super().validate(attrs)
        user = self.user
        data["user"] = _user_payload(user)
        return data


class ActiveUserTokenRefreshSerializer(TokenRefreshSerializer):
    """`TokenRefreshSerializer` that also checks the user is still usable.

    The base class never loads the `User`: it only verifies the refresh token's
    signature and expiry, so a deactivated cashier kept getting **200** with a
    brand-new access token. That token was already useless — every endpoint
    rejects it because `is_active` is False — but "here, take it" is the wrong
    answer, and it is what kept the frontend's auto-logout branch unreachable:
    `baseQueryWithReauth` only dispatches `logout()` when the refresh **fails**,
    so the cashier stayed on a UI that looked logged in while silently failing
    every request.

    Two conditions end a session, and both are checked here for the same reason:

    1. **Deactivated user** (`is_active`).
    2. **Password changed after the token was issued.** `CHECK_REVOKE_TOKEN`
       makes `JWTAuthentication.get_user()` reject access tokens carrying a
       stale `hash_password` claim, and `RefreshToken.access_token` copies that
       claim, so the minted access token is born already rejected. Without this
       check the refresh still answered **200**, and the frontend read that as
       "session is fine": it stored the new access token, retried, got 401,
       refreshed again… never reaching `logout()`. Exactly the failure mode
       point 1 exists to prevent, so it gets the same treatment — the refresh
       fails, and the cashier is sent back to the login screen.

    Cost: one extra query (and one extra token parse) per refresh. Access tokens
    live 8 hours, so refreshes are rare — this is not a hot path.

    Scope: this ends the *session*. It is not a blacklist — an access token
    already issued stays valid until its own check fails, which under
    `CHECK_REVOKE_TOKEN` is its very next request.
    """

    def validate(self, attrs):
        # super() first so signature/expiry errors keep their original messages.
        data = super().validate(attrs)
        refresh = RefreshToken(attrs["refresh"])
        user_id = refresh.payload.get(api_settings.USER_ID_CLAIM)
        user = User.objects.filter(**{api_settings.USER_ID_FIELD: user_id}).first()
        if user is None or not user.is_active:
            raise AuthenticationFailed("Esta cuenta está desactivada.", code="user_inactive")
        # Same comparison `JWTAuthentication.get_user()` runs on every request,
        # applied one step earlier so the refresh cannot hand out a token that
        # is already dead. Guarded by the setting so turning the flag off
        # restores the previous behaviour instead of rejecting every refresh
        # (tokens issued without the flag carry no claim at all).
        if api_settings.CHECK_REVOKE_TOKEN:
            if refresh.get(api_settings.REVOKE_TOKEN_CLAIM) != get_md5_hash_password(
                user.password
            ):
                raise AuthenticationFailed(
                    "La contraseña fue cambiada. Inicia sesión de nuevo.",
                    code="password_changed",
                )
        return data


class CashierLoginSerializer(serializers.Serializer):
    cedula = serializers.CharField(min_length=1)
    # Cashier-only endpoint: the floor is the PIN length from the policy module.
    password = serializers.CharField(min_length=PIN_LENGTH, style={"input_type": "password"})
    # Required: cédula is unique only *per tenant*, so tenant_id disambiguates
    # which business the cashier belongs to (prevents cross-tenant auth).
    tenant_id = serializers.UUIDField(required=True)

    def validate(self, data):
        cedula = data["cedula"].strip()
        password = data["password"]
        tenant_id = data["tenant_id"]

        user = User.objects.filter(cedula=cedula, tenant_id=tenant_id).first()

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
            # This is the endpoint the POS actually calls (`/auth/login/cashier/`),
            # so it is the one that must carry `tenant_slug` for "Cerrar Turno".
            "user": _user_payload(user),
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
            "lead_cashier",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "tenant", "created_at", "updated_at"]


class UserCreateSerializer(serializers.ModelSerializer):
    # No fixed min_length here: the minimum depends on the rol, which is only
    # resolved in validate() (see password_policy.min_length_for).
    password = serializers.CharField(write_only=True)
    correo = serializers.EmailField(required=False, allow_null=True, allow_blank=True, validators=[])
    cedula = serializers.CharField(required=False, allow_null=True, allow_blank=True, max_length=20, validators=[])
    # Only ever non-null when a role change forced a password rotation (see
    # update()). Additive to the response: `null` on every other create/update.
    new_password = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id", "nombre", "correo", "cedula", "password", "rol", "activo",
            "lead_cashier", "new_password",
        ]
        read_only_fields = ["id"]

    def get_new_password(self, obj):
        return getattr(obj, "_rotated_password", None)

    def validate_rol(self, value):
        if value == UserRole.SUPERADMIN:
            raise serializers.ValidationError(
                "No se puede asignar el rol SUPERADMIN desde este endpoint."
            )
        return value

    def validate(self, data):
        instance = self.instance
        sent = getattr(self, "initial_data", {})
        # A key the client did not send must keep its stored value. Computing it as
        # None here used to nullify it on PATCH — and `correo` is USERNAME_FIELD, so
        # an ADMIN left without it can never log in again.
        correo_sent = "correo" in sent
        cedula_sent = "cedula" in sent

        # Fall back to the instance's rol: a PATCH that omits `rol` must not be
        # treated as CAJERO (that raised a spurious "cédula obligatoria" on admins).
        rol = data.get("rol", getattr(instance, "rol", UserRole.CAJERO))
        correo = (data.get("correo") or "").strip() or None
        cedula = (data.get("cedula") or "").strip() or None
        if instance is not None and not correo_sent:
            correo = instance.correo
        if instance is not None and not cedula_sent:
            cedula = instance.cedula

        if rol == UserRole.CAJERO and not cedula:
            raise serializers.ValidationError({"cedula": "La cédula es obligatoria para cajeros."})
        if rol == UserRole.ADMIN and not correo:
            raise serializers.ValidationError({"correo": "El correo es obligatorio para administradores."})

        # Password length is per rol, so it is checked here (the field cannot see
        # the rol). A PATCH that does not send `password` validates nothing.
        password = data.get("password")
        if password is not None and len(password) < min_length_for(rol):
            raise serializers.ValidationError({"password": length_error_for(rol)})

        # A role change that RAISES the password floor must not leave the old
        # credential in use. Promoting a cashier to ADMIN through the edit modal
        # sends `rol` + `correo` and never a password, so the account kept its
        # 4-digit PIN — a secret typed in public, by design only good enough to
        # protect a cashier — now guarding the tenant's highest role. Worse, the
        # same end state that a POST rejects with 400 was reachable with a 200.
        # `update()` rotates it (see below); nothing to do when the client did
        # send a password, since it was just validated against the new rol.
        self._rotate_on_promotion = (
            instance is not None
            and password is None
            and min_length_for(rol) > min_length_for(instance.rol)
        )

        # Uniqueness checks (manual, to handle nullable fields correctly).
        # No tenant ⇒ 403 (a SUPERADMIN posting here used to 500: the lazy None
        # blew up inside filter(tenant=...) / on assignment in create()).
        # On partial_update the tenant always exists, so that path is unaffected.
        tenant = require_tenant(self.context["request"])
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

        # Write back only what the client sent; an omitted key must never reach
        # update(), which would setattr it to None.
        if correo_sent:
            data["correo"] = correo
        else:
            data.pop("correo", None)
        if cedula_sent:
            data["cedula"] = cedula
        else:
            data.pop("cedula", None)
        return data

    def create(self, validated_data):
        request = self.context["request"]
        validated_data["tenant"] = require_tenant(request)
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

        # Promotion without a new password: rotate it to one that satisfies the
        # rol the user is landing on, and hand it back in `new_password` (same
        # shape as reset_password). Rotating rather than demanding a password
        # keeps the operation from failing — the admin never loses the ability to
        # promote — while making the old PIN dead the moment the rol changes.
        rotated = None
        if password is None and getattr(self, "_rotate_on_promotion", False):
            rotated = generate_password(instance.rol)
            password = rotated

        if password:
            instance.set_password(password)
        instance.save()
        # Read by the `new_password` field below; null on every other update.
        instance._rotated_password = rotated
        return instance


def generate_new_password(rol: str) -> str:
    """Kept as the exported name used by `UserViewSet.reset_password` (views.py).

    The policy itself lives in `password_policy.generate_password`.
    """
    return generate_password(rol)
