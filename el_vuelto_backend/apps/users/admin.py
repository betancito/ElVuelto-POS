from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ("nombre", "correo", "tenant", "rol", "activo")
    list_filter = ("rol", "activo", "tenant")
    search_fields = ("nombre", "correo")
    ordering = ("nombre",)
    readonly_fields = ("id", "created_at", "updated_at")

    # `cedula` MUST be in both fieldsets. A CAJERO logs into the POS with cédula
    # (never with correo), so leaving the field out of the form made it
    # impossible to create a usable cashier here — and `User.clean()` would raise
    # an error bound to a field the form does not render.
    fieldsets = (
        (None, {"fields": ("id", "correo", "password")}),
        ("Información personal", {"fields": ("nombre", "cedula", "tenant", "rol")}),
        ("Permisos", {"fields": ("activo", "is_staff", "is_superuser", "groups", "user_permissions")}),
        ("Fechas", {"fields": ("last_login", "created_at", "updated_at")}),
    )
    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": ("correo", "nombre", "cedula", "tenant", "rol", "password1", "password2"),
            },
        ),
    )
