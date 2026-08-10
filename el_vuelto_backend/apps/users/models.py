import uuid

from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.core.exceptions import ValidationError
from django.db import models


class UserRole(models.TextChoices):
    SUPERADMIN = "SUPERADMIN", "Superadmin"
    ADMIN = "ADMIN", "Admin"
    CAJERO = "CAJERO", "Cajero"


class UserManager(BaseUserManager):
    def create_user(self, correo=None, password=None, **extra_fields):
        if correo:
            correo = self.normalize_email(correo)
        extra_fields.setdefault("activo", True)
        user = self.model(correo=correo, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, correo, password=None, **extra_fields):
        extra_fields.setdefault("rol", UserRole.SUPERADMIN)
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("activo", True)
        extra_fields.setdefault("nombre", correo.split("@")[0])
        return self.create_user(correo, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(
        "tenants.Tenant",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="users",
    )
    nombre = models.CharField(max_length=200)
    correo = models.EmailField(null=True, blank=True, unique=True)
    cedula = models.CharField(max_length=20, null=True, blank=True)
    rol = models.CharField(max_length=20, choices=UserRole.choices, default=UserRole.CAJERO)
    activo = models.BooleanField(default=True)
    lead_cashier = models.BooleanField(default=False)
    is_staff = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    USERNAME_FIELD = "correo"
    REQUIRED_FIELDS = ["nombre"]

    objects = UserManager()

    class Meta:
        db_table = "users"
        verbose_name = "Usuario"
        verbose_name_plural = "Usuarios"
        constraints = [
            models.UniqueConstraint(
                fields=["tenant", "cedula"],
                name="unique_cedula_por_tenant",
                condition=models.Q(cedula__isnull=False),
            ),
        ]

    def __str__(self):
        return f"{self.nombre} ({self.correo})"

    def clean(self):
        """Per-role credential rule, enforced on every `ModelForm` write.

        `UserCreateSerializer` already enforces this for the API, but the Django
        admin does not go through DRF: it could create a CAJERO with no `cedula`
        (who can then never log into the POS, since that flow authenticates by
        cédula) or blank an ADMIN's `correo` (a lockout — it is `USERNAME_FIELD`).
        Putting the rule on the model means any current or future `ModelForm`
        picks it up for free, because `ModelForm._post_clean()` calls
        `full_clean()`.

        SUPERADMIN is exempt on purpose: it has neither tenant nor cédula.

        Note this does **not** run on plain `.save()` (Django never calls
        `full_clean()` there), so management commands and DRF are unaffected —
        DRF enforces the same rule in its own layer, with the same messages.
        """
        super().clean()
        errors = {}
        if self.rol == UserRole.ADMIN and not (self.correo or "").strip():
            errors["correo"] = "El correo es obligatorio para administradores."
        if self.rol == UserRole.CAJERO and not (self.cedula or "").strip():
            errors["cedula"] = "La cédula es obligatoria para cajeros."
        if errors:
            raise ValidationError(errors)

    @property
    def is_active(self):
        return self.activo
