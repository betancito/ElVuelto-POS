---
tags: [patron, global, tenancy, seguridad]
status: vivo
updated: 2026-08-02
---

# Patrón — Aislamiento de tenants (la verdad real)

> [!warning] LÉEME SI VAS A TOCAR: cualquier vista, viewset, endpoint o queryset nuevo.
> El aislamiento entre negocios NO es automático. Si olvidas filtrar, filtras datos de todos los tenants. Ver [[ADR-G-20260802-tenancy-isolation]].

## Cómo funciona hoy (verificado)

1. **`TenantMiddleware`** (`apps/tenants/middleware.py:6-31`) lee el `tenant_id` del JWT (claim agregado en `apps/users/serializers.py:26`) y setea `request.tenant = SimpleLazyObject(...)`. Resuelve `Tenant.objects.filter(id=tenant_id, activo=True).first()`; devuelve **`None`** si no hay token válido o el token no trae `tenant_id` (caso superadmin).
2. **`TenantMixin`** (`apps/tenants/models.py:58-68`) SOLO añade el FK `tenant`. **No filtra nada.** Lo usan: `Category`, `Product`, `InventoryMovement`, `Sale`.
3. **`TenantModelViewSet`** (`apps/tenants/viewsets.py:5-24`) filtra por `request.tenant` en `get_queryset()` y lo asigna en `perform_create()`. Si `request.tenant is None` lanza `PermissionDenied`.

En la práctica, la mayoría de vistas **filtran a mano** con `filter(tenant=request.tenant)` (es la convención de facto), no vía la clase base.

## Regla obligatoria para código nuevo

- **ModelViewSet nuevo:** hereda de `TenantModelViewSet`. Si sobre-escribes `get_queryset()`, **vuelve a filtrar** por `request.tenant` (mira `ProductViewSet.get_queryset` `products/views.py:42-47`).
- **APIView / vista suelta:** filtra SIEMPRE a mano: `Modelo.objects.filter(tenant=request.tenant)`. Nunca `Modelo.objects.all()` sin filtro (patrón de `reports/views.py`).
- **Serializer que recibe un FK ajeno** (categoría, producto): valida que pertenezca al mismo tenant. Ejemplos: `ProductSerializer.validate_category` (`products/serializers.py:57-63`), `InventoryMovementSerializer.validate_product` (`inventory/serializers.py:52-57`).
- **Superadmin** tiene `tenant=None`: en endpoints tenant-scoped verá vacío o `PermissionDenied`. Sus rutas propias usan `IsSuperAdmin` sobre `Tenant` (no tenant-scoped).

## Lo que NO hay (y es la meta)
- **No hay RLS de Postgres** (0 políticas). No hay red de seguridad en la BD. Meta futura post-estabilización: [[GLOBAL-20260802-migracion-rls-postgres]].

## Enlaces
[[patron-permisos-roles]] · [[patron-jwt-refresh]] · [[riesgo-tenancy-sin-red-de-seguridad]] · [[ADR-G-20260802-tenancy-isolation]]
