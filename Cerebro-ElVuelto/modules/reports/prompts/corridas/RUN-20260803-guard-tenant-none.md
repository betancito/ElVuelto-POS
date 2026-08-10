---
tags: [corrida, reports, review, tenancy, seguridad]
status: cerrado
updated: 2026-08-03
---

# RUN 2026-08-03 — PROMPT-FIX-REPORTS-…-guard-tenant-none

**Prompt:** [[PROMPT-FIX-REPORTS-20260803-guard-tenant-none]] · **Veredicto:** 🟢 PASÓ · **Ítem:** [[REPORTS-20260802-endpoints-500-tenant-none]] → cerrado · **Riesgo:** [[sales-detail-500-si-tenant-none]] → resuelto

## Qué hizo el Dev (git diff, working tree)
El Dev **NO** usó el enfoque prescrito (permission `HasTenant`) y con razón — ver "Desviación" abajo. En su lugar:
- **Nuevo `apps/tenants/utils.py`**: `require_tenant(request)` → devuelve el tenant o lanza `PermissionDenied` (**403**) cuando no hay tenant. Detecta el None por **truthiness** (`if not tenant`), no por `is None`.
- `apps/reports/views.py`: `tenant = require_tenant(request)` al inicio de las **5** vistas; reemplazó `request.tenant` (incluidos los deref `request.tenant.nombre`/`.documents` de `SalesDetailExportView:169-174`) por el local `tenant`.
- `apps/inventory/views.py` (`StockView`): mismo patrón.
- `apps/tenants/viewsets.py` (`TenantModelViewSet._get_tenant`): reemplazó el `if tenant is None` (roto) por `require_tenant(self.request)`.
- `el_vuelto_backend/CLAUDE.md`: reescribió el bullet de tenant-guard (documenta `require_tenant`, el gotcha del `SimpleLazyObject`, y un follow-up).

## Desviación aceptada (mejor que lo pedido)
Mi prompt prescribió `class HasTenant: return getattr(request,'tenant',None) is not None`. **Eso estaba mal:** `request.tenant` es un `SimpleLazyObject` (`TenantMiddleware`), y `lazy is None` es **siempre False** (compara identidad del proxy, no evalúa) → el permission nunca habría rechazado. El Dev lo detectó y usó truthiness. Además halló que `_get_tenant` tenía el **mismo bug** (`is None`) → la garantía documentada "raises PermissionDenied" **nunca disparaba** (hacía `filter(tenant=<lazy None>)` → vacío, y `perform_create` podía guardar sin tenant). Fix sistémico correcto vía un solo helper. La expansión de alcance (StockView, `_get_tenant`) queda **aceptada** por justificada.

## Verificación ejecutada por el Planner (shell, APIRequestFactory)
- Gotcha confirmado: `SimpleLazyObject(lambda: None)` → `is None`=**False**, `not lazy`=**True**.
- `makemigrations --check --dry-run` → **"No changes detected"**.
- REPORTS `sales-detail`: superadmin(tenant=None) → **403** (antes 500) · admin(tenant) → **200**.
- CATEGORIES `list` (usa `TenantModelViewSet._get_tenant`): cajero(tenant) → **200** (POS sigue leyendo) · superadmin(None) → **403**.
- STOCK: admin(tenant) → **200** · superadmin(None) → **403**.
- Grep: no quedan derefs `request.tenant.<attr>` sin guard (los de `products/serializers.py:61` e `inventory/serializers.py:55` ya usan `request and request.tenant and …`, truthiness).

## Deuda flagueada por el Dev (nuevo backlog)
`SaleViewSet`, `InventoryMovementViewSet` y `UserViewSet` **no** extienden `TenantModelViewSet`; su `get_queryset` sigue `filter(tenant=request.tenant)` → vacío (no 500) con `tenant=None`. → [[BACKEND-20260803-guard-tenant-none-viewsets-restantes]].

**Veredicto: 🟢 corrido-ok.**
