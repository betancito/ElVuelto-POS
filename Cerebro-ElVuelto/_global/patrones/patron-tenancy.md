---
tags: [patron, global, tenancy, seguridad]
status: vivo
updated: 2026-09-13
---

# Patrón — Aislamiento de tenants (la verdad real)

> [!warning] LÉEME SI VAS A TOCAR: cualquier vista, viewset, endpoint o queryset nuevo.
> El aislamiento entre negocios NO es automático. Si olvidas filtrar, filtras datos de todos los tenants. Ver [[ADR-G-20260802-tenancy-isolation]].

## Cómo funciona hoy (verificado)

1. **`TenantMiddleware`** (`apps/tenants/middleware.py:6-31`) lee el `tenant_id` del JWT (claim agregado en `apps/users/serializers.py:69`) y setea `request.tenant = SimpleLazyObject(...)`. Resuelve `Tenant.objects.filter(id=tenant_id, activo=True).first()`; devuelve **`None`** si no hay token válido o el token no trae `tenant_id` (caso superadmin).
2. **`TenantMixin`** (`apps/tenants/models.py:94-104`) SOLO añade el FK `tenant`. **No filtra nada.** Lo usan: `Category`, `Product`, `InventoryMovement`, `Sale`.
3. **`TenantModelViewSet`** (`apps/tenants/viewsets.py`) filtra por `request.tenant` en `get_queryset()` y lo asigna en `perform_create()`, vía `_get_tenant()` → **`require_tenant(self.request)`**.

En la práctica, la mayoría de vistas **filtran a mano** con `filter(tenant=request.tenant)` (es la convención de facto), no vía la clase base. **Conteo real al 2026-09-13:** de **11** vistas scoped por `request.tenant`, **10 filtran a mano** y solo `CategoryViewSet` (`products/views.py:18`) recibe el filtro del padre — `ProductViewSet` (`:53`) hereda pero pisa `get_queryset()`. Hay además **3 vistas SUPERADMIN scoped por la URL** (ver la regla del superadmin abajo): 14 vistas tocan datos de tenant en total.

> [!warning] Gotcha CRÍTICO — nunca `request.tenant is None` (verificado 2026-08-03)
> `request.tenant` es un `SimpleLazyObject`. `lazy is None` es **SIEMPRE False** (`is` compara la identidad del proxy y no lo evalúa), aunque resuelva a `None`. Detecta el caso None por **truthiness** (`if not tenant:`), nunca por identidad. Este bug estuvo **latente** en `_get_tenant` (usaba `is None` → nunca disparaba; el guard documentado era mentira) hasta el fix de [[RUN-20260803-guard-tenant-none]].
> **Helper canónico:** `require_tenant(request)` en `apps/tenants/utils.py` → devuelve el tenant o lanza `PermissionDenied` (**403**) por truthiness. Úsalo en TODO endpoint tenant-scoped que no herede de `TenantModelViewSet`.
> **Cobertura al 2026-09-13 — COMPLETA** (re-verificada en el PASO 0, [[2026-09-13-planner-paso0-resync]]): reports (5), `StockView`, `TenantModelViewSet`, `SaleViewSet` (+ `SaleCreateSerializer.create`), `InventoryMovementViewSet` (+ `perform_create`), `UserViewSet`, `ProductViewSet` (`get_queryset` + acción `pos`), los dos `validate_*` cross-tenant **y `UserCreateSerializer`** (`users/serializers.py:289` en `validate`, `:317` en `create`). Barrido completo: **0 vistas sin filtrar**.
> ⚠️ Este renglón decía *"Único pendiente: `UserCreateSerializer`"* hasta el 2026-09-13, y era **falso**: ese guard se cerró hace tiempo ([[BACKEND-20260804-guard-tenant-usercreateserializer]] 🟢). Es justo el tipo de línea que un agente lee para decidir qué falta hacer.

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

- **ModelViewSet nuevo:** hereda de `TenantModelViewSet`. ⚠️ **Heredar no garantiza nada** si sobre-escribes `get_queryset()` sin llamar a `super()`: ahí tirás el guard. `ProductViewSet` hacía exactamente eso mientras la doc afirmaba que lo tenía "gratis"; hoy llama a `self._get_tenant()` explícito (`products/views.py:60`, y `:90` en la acción `pos`).
- **APIView / vista suelta:** resolvé el tenant con `require_tenant(request)` y filtrá por esa variable. Nunca `Modelo.objects.all()` sin filtro (patrón de `reports/views.py`).
- **Serializer que recibe un FK ajeno** (categoría, producto): valida que pertenezca al mismo tenant, **fail-closed** (ver Gotcha 3). Ejemplos correctos hoy: `ProductSerializer.validate_category` (`products/serializers.py:129-145`), `InventoryMovementSerializer.validate_product` (`inventory/serializers.py:54-68`, `require_tenant` en `:66`).
- **Rutas de escritura también:** no basta con guardar `get_queryset()`. `SaleCreateSerializer.create` (`sales/serializers.py:140`, `require_tenant` en `:144`) y `InventoryMovementViewSet.perform_create` (`inventory/views.py:64`, `require_tenant` en `:67`) llevan su propio `require_tenant`.
- **Superadmin** tiene `tenant=None`: en todo endpoint scoped por `request.tenant` recibe **403** (`Tenant context is required for this resource.`, `apps/tenants/utils.py:21`), por diseño (ver [[ADR-G-20260802-modelo-de-acceso-por-rol]]).
  ⚠️ **Corregido el 2026-09-13:** este renglón decía *"debe impersonar"* y que sus rutas propias *"no son tenant-scoped"*. Las dos mitades quedaron viejas. Hoy existen **3 vistas SUPERADMIN que SÍ son tenant-scoped, derivando el scope de la URL** en vez de `request.tenant` — `TenantUsersView` (`apps/tenants/views.py:180`), `TenantUserResetPasswordView` (`:195`) y `TenantMetricsView` (`:220`), todas sobre `SuperAdminTenantScopedView` (`:165`). Y **no son impersonación**: el propio repo lo niega en `apps/tenants/views.py:156-159` (*"No token is issued, no session is created"*). Ver [[ADR-G-20260809-superadmin-acceso-tenant-scoped]].
  **Invariante de ese camino:** el `tenant_id` de la URL no puede alcanzar una fila de otro tenant — se filtra por **ambos** ids en la misma query, nunca "buscar por pk y después chequear". Toda vista nueva de esa familia hereda de `SuperAdminTenantScopedView`.

## Lo que NO hay (y es la meta)
- **No hay RLS de Postgres** (0 políticas declaradas en las migraciones del repo — `grep -rn "RunSQL\|POLICY\|ROW LEVEL SECURITY" apps/*/migrations/` → 0; no se consultó la BD viva). No hay red de seguridad en la BD. Meta futura post-estabilización: [[GLOBAL-20260802-migracion-rls-postgres]].

## Enlaces
[[patron-permisos-roles]] · [[patron-jwt-refresh]] · [[riesgo-tenancy-sin-red-de-seguridad]] · [[ADR-G-20260802-tenancy-isolation]]
