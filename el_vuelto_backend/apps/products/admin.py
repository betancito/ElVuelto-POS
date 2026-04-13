from django.contrib import admin

from .models import Category, Product


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("nombre", "tenant", "created_at")
    list_filter = ("tenant",)
    search_fields = ("nombre",)
    readonly_fields = ("id", "created_at")


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ("nombre", "tipo", "tenant", "category", "precio_venta", "stock_actual", "activo")
    list_filter = ("tipo", "activo", "tenant")
    search_fields = ("nombre", "barcode", "proveedor")
    readonly_fields = ("id", "created_at", "updated_at")
