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

    fieldsets = (
        (None, {"fields": ("id", "correo", "password")}),
        ("Información personal", {"fields": ("nombre", "tenant", "rol")}),
        ("Permisos", {"fields": ("activo", "is_staff", "is_superuser", "groups", "user_permissions")}),
        ("Fechas", {"fields": ("last_login", "created_at", "updated_at")}),
    )
    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": ("correo", "nombre", "tenant", "rol", "password1", "password2"),
            },
        ),
    )
