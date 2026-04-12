from django.contrib import admin

from .models import Sale, SaleItem


class SaleItemInline(admin.TabularInline):
    model = SaleItem
    extra = 0
    readonly_fields = ("id", "product", "product_nombre", "precio_unitario", "cantidad", "subtotal")
    can_delete = False


@admin.register(Sale)
class SaleAdmin(admin.ModelAdmin):
    list_display = ("id", "tenant", "user", "total", "metodo_pago", "created_at")
    list_filter = ("metodo_pago", "tenant")
    date_hierarchy = "created_at"
    search_fields = ("user__nombre", "user__correo")
    readonly_fields = ("id", "created_at")
    inlines = [SaleItemInline]
