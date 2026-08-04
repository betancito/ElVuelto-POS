---
tags: [modulo, contratos, api]
status: vivo
module: inventory
updated: 2026-08-02
---

# Inventory — Contratos de API

Prefijo: `/api/inventory/` (`elvuelto/urls.py:11` → `apps/inventory/urls.py`). Router `DefaultRouter` registra `movements` (basename `movement`); `stock/` es path manual.

**Tenant:** ninguna vista es `AllowAny`. Todas exigen auth (JWT) y el filtrado por tenant es **manual** (este módulo NO usa `TenantModelViewSet`). Ver ⚠️ al final.

---

## `GET /api/inventory/movements/`

- **Vista:** `InventoryMovementViewSet.list` (`views.py:15`, `get_permissions:27-30`).
- **Permiso:** `IsAdmin` (ADMIN o SUPERADMIN).
- **Query params** (`views.py:47-56`, todos opcionales): `product` (UUID → `product_id=`), `fecha_inicio` (`created_at__date__gte`), `fecha_fin` (`created_at__date__lte`).
- **Filtro tenant:** `filter(tenant=self.request.tenant)` (`views.py:43`), `select_related(product,user)`.
- **Response:** lista (o `{results:[]}` si paginado, `PAGE_SIZE=50`) de `InventoryMovementSerializer`:
  `{ id, tenant, product, product_nombre, user, user_nombre, tipo_movimiento, cantidad, precio_costo, proveedor, nota, created_at }`.
- **Orden:** `-created_at` (Meta ordering).
- **Errores:** 401 sin token · 403 si rol CAJERO.
- ⚠️ SUPERADMIN tiene `tenant=None` → `filter(tenant=None)` devuelve lista vacía (silencioso, no error). Ver [[superadmin-tenant-none]].

## `POST /api/inventory/movements/`

- **Vista:** `InventoryMovementViewSet.create` (`views.py:32-40`).
- **Permiso base:** `IsCajero` (CAJERO, ADMIN o SUPERADMIN) — ⚠️ NO "IsAdmin" (el CLAUDE.md del backend miente aquí).
- **Gate extra (`views.py:34-39`):** si `request.user.rol == CAJERO`:
  - exige `user.lead_cashier == True` → si no, `403 "Solo los cajeros líderes pueden registrar entradas."`
  - exige `tipo_movimiento == ENTRADA` → si no, `403 "Los cajeros solo pueden registrar movimientos de tipo ENTRADA."`
  - ADMIN/SUPERADMIN saltan este gate.
- **Request (campos escribibles):** `product` (UUID, req), `tipo_movimiento` (`ENTRADA`|`AJUSTE`, req), `cantidad` (int, req), `precio_costo` (decimal, opcional), `proveedor` (str≤200, opcional), `nota` (texto, opcional). `id/tenant/user/created_at` son read-only (se inyectan).
- **Validaciones (serializer):**
  - `SALIDA_VENTA` → `400` (`validate_tipo_movimiento:31-36`, "created automatically by the sales endpoint").
  - `ENTRADA` con `cantidad<=0` → `400 {cantidad: "...positiva para movimientos ENTRADA."}` (`:42-45`).
  - `AJUSTE` con `cantidad==0` → `400 {cantidad: "...no puede ser cero para un AJUSTE."}` (`:46-49`).
  - `product` de otro tenant → `400 {product: "El producto no pertenece a este tenant."}` (`:52-57`).
- **Efecto (`create:59-65`):** guarda movimiento + `Product.stock_actual += cantidad` con `F()` (atómico, sin lock ni piso en 0 — ver [[ajuste-stock-negativo]]).
- **`perform_create` (`views.py:60-61`):** `save(tenant=request.tenant, user=request.user)`.
- **Response:** 201 con el serializer completo (incluye `product_nombre`, `user_nombre`).
- **Errores:** 400 validación · 401 · 403 (rol o gate lead_cashier) · ⚠️ 500 si SUPERADMIN (`tenant=None` viola FK NOT NULL, ver [[superadmin-tenant-none]]).

## `GET /api/inventory/stock/`

- **Vista:** `StockView(APIView).get` (`views.py:64-76`).
- **Permiso:** `IsAdmin`.
- **Filtro:** `Product` con `tenant=request.tenant`, `tipo=CON_CODIGO`, `activo=True`, `select_related(category)`, `order_by("nombre")`.
- **Response:** lista de `StockSerializer`:
  `{ id, nombre, barcode, stock_actual, stock_minimo, bajo_minimo, precio_costo, proveedor, imagen_url, category_id, category_nombre }`.
  - `bajo_minimo` = `stock_actual < stock_minimo` (`serializers.py:89-90`).
- **Errores:** 401 · 403 si CAJERO.
- **Nota:** solo productos `CON_CODIGO` activos; los `SIN_CODIGO` (sin control de stock) y los inactivos no aparecen.

---

## Quién llama a cada endpoint (front)

| endpoint | hook RTK Query | invoca | payload |
|---|---|---|---|
| `GET /movements/` | `useListMovementsQuery` (`inventoryApi.ts:32`) | `InventoryPage.tsx:531` (pestaña Historial) | — |
| `POST /movements/` | `useCreateMovementMutation` (`inventoryApi.ts:38`) | `MovementModal.onSubmit` (`InventoryPage.tsx:251`) | `{product, tipo_movimiento, cantidad, precio_costo, nota}` — SIN `proveedor` |
| `GET /stock/` | `useGetStockQuery` (`inventoryApi.ts:42`) | `InventoryPage.tsx:532` (KPIs, grilla, picker, escáner) | — |

⚠️ **Filtrado de tenant NO estandarizado:** a diferencia de la convención `TenantModelViewSet` (CLAUDE.md), este módulo filtra tenant a mano en `get_queryset`/`perform_create`/`StockView.get`. Consecuencia: sin el guard `PermissionDenied` que da `TenantModelViewSet._get_tenant()` cuando `request.tenant is None`. Ver [[superadmin-tenant-none]].
