---
tags: [patron, global, tenancy, seguridad]
status: vivo
updated: 2026-08-03
---

# Patrón — Aislamiento de tenants (la verdad real)

> [!warning] LÉEME SI VAS A TOCAR: cualquier vista, viewset, endpoint o queryset nuevo.
> El aislamiento entre negocios NO es automático. Si olvidas filtrar, filtras datos de todos los tenants. Ver [[ADR-G-20260802-tenancy-isolation]].

## Cómo funciona hoy (verificado)

1. **`TenantMiddleware`** (`apps/tenants/middleware.py:6-31`) lee el `tenant_id` del JWT (claim agregado en `apps/users/serializers.py:26`) y setea `request.tenant = SimpleLazyObject(...)`. Resuelve `Tenant.objects.filter(id=tenant_id, activo=True).first()`; devuelve **`None`** si no hay token válido o el token no trae `tenant_id` (caso superadmin).
2. **`TenantMixin`** (`apps/tenants/models.py:58-68`) SOLO añade el FK `tenant`. **No filtra nada.** Lo usan: `Category`, `Product`, `InventoryMovement`, `Sale`.
3. **`TenantModelViewSet`** (`apps/tenants/viewsets.py`) filtra por `request.tenant` en `get_queryset()` y lo asigna en `perform_create()`, vía `_get_tenant()` → **`require_tenant(self.request)`**.

En la práctica, la mayoría de vistas **filtran a mano** con `filter(tenant=request.tenant)` (es la convención de facto), no vía la clase base.

> [!warning] Gotcha CRÍTICO — nunca `request.tenant is None` (verificado 2026-08-03)
> `request.tenant` es un `SimpleLazyObject`. `lazy is None` es **SIEMPRE False** (`is` compara la identidad del proxy y no lo evalúa), aunque resuelva a `None`. Detecta el caso None por **truthiness** (`if not tenant:`), nunca por identidad. Este bug estuvo **latente** en `_get_tenant` (usaba `is None` → nunca disparaba; el guard documentado era mentira) hasta el fix de [[RUN-20260803-guard-tenant-none]].
> **Helper canónico:** `require_tenant(request)` en `apps/tenants/utils.py` → devuelve el tenant o lanza `PermissionDenied` (**403**) por truthiness. Úsalo en TODO endpoint tenant-scoped que no herede de `TenantModelViewSet`.
> **Cobertura al 2026-08-04** ([[RUN-20260804-guard-tenant-none-y-doc]]): reports (5), `StockView`, `TenantModelViewSet`, `SaleViewSet` (+ `SaleCreateSerializer.create`), `InventoryMovementViewSet` (+ `perform_create`), `UserViewSet`, `ProductViewSet` (`get_queryset` + acción `pos`) y los dos `validate_*` cross-tenant. **Único pendiente:** `UserCreateSerializer` → [[BACKEND-20260804-guard-tenant-usercreateserializer]].

> [!warning] Gotcha 2 — un guard que falta NO "devuelve vacío": **revienta con 500** (verificado 2026-08-04)
> `filter(tenant=<lazy que resuelve a None>)` lanza `TypeError: one of the hex, bytes, bytes_le, fields, or int arguments must be given` — Django intenta construir un UUID con el proxy. Comprobado en `Sale` y `User`.
> Y "devolver vacío" sería **peor**: en `UserViewSet` un `filter(tenant=None)` literal significa `tenant IS NULL`, o sea **todos los SUPERADMIN de la plataforma**, listables y editables por cualquier admin de tenant. El arreglo es **siempre 403**, nunca `filter(tenant=None)`.

> [!warning] Gotcha 3 — los guards deben fallar CERRADO (verificado 2026-08-04)
> Este patrón estuvo en dos validaciones cross-tenant y es fácil de reintroducir:
> ```python
> if request and request.tenant and value.tenant_id != request.tenant.id:   # ❌ MAL
>     raise serializers.ValidationError("… no pertenece a este tenant.")
> ```
> Ese `and request.tenant` **desactiva la validación justo cuando no hay tenant** — el único caso en el que no podés verificar la pertenencia — y el producto/categoría ajeno pasa. La ausencia de contexto tiene que **cerrar la puerta, no abrirla**: resolvé con `require_tenant(request)` primero (403) y después comparás.
> **Cualquier `if request.tenant and <chequeo>` nuevo es este bug otra vez.**

> [!info] Trampa al testear acciones `@action` fuera del router
> `ViewSet.as_view({"get": "pos"})` llamado a mano **no aplica los `initkwargs` del decorador**, así que `permission_classes=[IsCajero]` se pierde y queda el de la clase → 403 engañoso. Pasá `**ViewSet.pos.kwargs` o probá por la URL real.

## Regla obligatoria para código nuevo

- **ModelViewSet nuevo:** hereda de `TenantModelViewSet`. ⚠️ **Heredar no garantiza nada** si sobre-escribes `get_queryset()` sin llamar a `super()`: ahí tirás el guard. `ProductViewSet` hacía exactamente eso mientras la doc afirmaba que lo tenía "gratis"; hoy llama a `self._get_tenant()` explícito (`products/views.py:53`).
- **APIView / vista suelta:** resolvé el tenant con `require_tenant(request)` y filtrá por esa variable. Nunca `Modelo.objects.all()` sin filtro (patrón de `reports/views.py`).
- **Serializer que recibe un FK ajeno** (categoría, producto): valida que pertenezca al mismo tenant, **fail-closed** (ver Gotcha 3). Ejemplos correctos hoy: `ProductSerializer.validate_category` (`products/serializers.py:59-76`), `InventoryMovementSerializer.validate_product` (`inventory/serializers.py:53-67`).
- **Rutas de escritura también:** no basta con guardar `get_queryset()`. `SaleCreateSerializer.create` (`sales/serializers.py:112`) y `InventoryMovementViewSet.perform_create` (`inventory/views.py:65`) llevan su propio `require_tenant`.
- **Superadmin** tiene `tenant=None`: en endpoints tenant-scoped recibe **403** (`Tenant context is required for this resource.`), por diseño — debe impersonar (ver [[ADR-G-20260802-modelo-de-acceso-por-rol]]). Sus rutas propias usan `IsSuperAdmin` sobre `Tenant` (no tenant-scoped).

## Lo que NO hay (y es la meta)
- **No hay RLS de Postgres** (0 políticas). No hay red de seguridad en la BD. Meta futura post-estabilización: [[GLOBAL-20260802-migracion-rls-postgres]].

## Enlaces
[[patron-permisos-roles]] · [[patron-jwt-refresh]] · [[riesgo-tenancy-sin-red-de-seguridad]] · [[ADR-G-20260802-tenancy-isolation]]
