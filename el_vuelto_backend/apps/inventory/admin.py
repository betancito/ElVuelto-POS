from django.contrib import admin

from .models import InventoryMovement


@admin.register(InventoryMovement)
class InventoryMovementAdmin(admin.ModelAdmin):
    list_display = ("product", "tipo_movimiento", "cantidad", "user", "created_at")
    list_filter = ("tipo_movimiento", "tenant")
    search_fields = ("product__nombre", "user__nombre", "nota")
    readonly_fields = ("id", "created_at")
