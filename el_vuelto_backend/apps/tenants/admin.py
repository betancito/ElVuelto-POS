from django.contrib import admin

from .models import Tenant


@admin.register(Tenant)
class TenantAdmin(admin.ModelAdmin):
    list_display = ("nombre", "nit", "ciudad", "activo", "created_at")
    search_fields = ("nombre", "nit", "correo", "ciudad")
    list_filter = ("activo", "ciudad")
    readonly_fields = ("id", "created_at", "updated_at")
