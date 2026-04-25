import uuid

from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
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

    @property
    def is_active(self):
        return self.activo
