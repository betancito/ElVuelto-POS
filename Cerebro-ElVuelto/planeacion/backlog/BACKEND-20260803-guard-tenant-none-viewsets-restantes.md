---
tags: [tarea, backend, tenancy, robustez]
status: 🟢
prioridad: alta
updated: 2026-08-04
---

> [!done] Cerrado 2026-08-04 — ✅ [[RUN-20260804-guard-tenant-none-y-doc]]
> Los **7 puntos** de la tabla de abajo quedaron guardados con `require_tenant` (403), incluidos `perform_create` de inventory y la acción `pos` de products. Los dos guards **fail-open** (#6 y #7) pasaron a **fail-closed**: sin tenant ahora cierran en vez de dejar pasar un producto/categoría de otro tenant. Verificado 10/10, con los 4 casos de regresión con tenant real en verde (el POS del cajero sigue vendiendo: `GET /products/pos/` → 200, `POST /sales/` → 201).
> **Queda un 8º camino**, auto-reportado por el Dev y fuera del alcance de este ticket: `UserCreateSerializer` (`apps/users/serializers.py:203,231`) → [[BACKEND-20260804-guard-tenant-usercreateserializer]].

# BACKEND-20260803-guard-tenant-none-viewsets-restantes — Rutar los viewsets restantes por require_tenant

**Tipo:** robustez / consistencia · **Descubierto:** review de [[RUN-20260803-guard-tenant-none]] (flagueado por el Dev)

> [!warning] Corregido el 2026-08-04 — la premisa original de este ticket era falsa
> Decía *"devuelven **vacío** (no 500, no urge)"*. **Es 500.** Verificado ejecutando Django con el venv del repo:
> ```
> User  -> RAISES TypeError : one of the hex, bytes, bytes_le, fields, or int arguments must be given
> Sale  -> RAISES TypeError : one of the hex, bytes, bytes_le, fields, or int arguments must be given
> ```
> `filter(tenant=SimpleLazyObject→None)` **revienta**; no devuelve queryset vacío. La misma frase falsa está en `el_vuelto_backend/CLAUDE.md:462` → [[DOCS-20260804-claudemd-garantia-falsa]].
> Consecuencias: **prioridad media → alta**, y el alcance real es mayor que "3 viewsets" (ver abajo).

## Problema
El fix de [[REPORTS-20260802-endpoints-500-tenant-none]] introdujo `require_tenant(request)` (`apps/tenants/utils.py`) y lo aplicó a los 5 reports, `StockView` y `TenantModelViewSet._get_tenant`. Los caminos de abajo quedaron fuera y **dan 500 con `tenant=None`** (SUPERADMIN autenticado sin impersonar).

## Alcance real (4 viewsets + 3 rutas de escritura, no 3 viewsets)

| # | Dónde | Qué le falta |
|---|---|---|
| 1 | `apps/sales/views.py:28-31` `SaleViewSet.get_queryset` | `require_tenant` |
| 2 | `apps/inventory/views.py:43-46` `InventoryMovementViewSet.get_queryset` | `require_tenant` |
| 3 | `apps/users/views.py:85-86` `UserViewSet.get_queryset` | `require_tenant` |
| 4 | `apps/products/views.py:50-55` `ProductViewSet.get_queryset` | **sobreescribe `get_queryset()` y tira el guard heredado** de `TenantModelViewSet` — el `CLAUDE.md:460` afirma lo contrario |
| 5 | `apps/sales/serializers.py:108-115` `SaleCreateSerializer.create` | ruta de **escritura**, sin guard |
| 6 | `apps/inventory/serializers.py:52-57` `validate_product` | guard **fail-open**: `if request and request.tenant and value.tenant_id != request.tenant.id` — el `and request.tenant` desactiva la validación cross-tenant justo cuando no hay tenant |
| 7 | `apps/products/serializers.py:57-63` | mismo patrón fail-open |

⚠️ **#6 y #7 son lo más delicado del ticket:** no son un 500, son un guard que se **abre** cuando debería cerrarse. Al arreglar #1-#5 con `require_tenant` (403), #6/#7 dejan de ser alcanzables por esa vía — pero el patrón fail-open debe corregirse igual, porque la próxima ruta que no guarde lo hereda.

⚠️ **Cuidado con #3:** `User.tenant` es FK **nullable**. Si alguien "arregla" el 500 resolviendo el tenant a `None` literal en vez de rechazar con 403, `UserViewSet` pasaría a listar y editar **a todos los SUPERADMIN de la plataforma**. La corrección correcta es **403**, no `filter(tenant=None)`.

**No es fuga cross-tenant hoy:** se revisaron todas las vistas del backend y no hay ningún `.objects.all()` sin filtro que exponga datos ajenos. Los dos casos sin filtro (`TenantViewSet`, `TenantBySlugView`) son intencionales y están cerrados por `IsSuperAdmin` y por exposición mínima.

## Criterio de aceptación
Los 4 viewsets y las 3 rutas de escritura rechazan con **403** cuando `request.tenant` es None, consistente con reports/stock/categories. Sin romper los flujos con tenant (ADMIN/CAJERO → igual que hoy). El patrón fail-open de #6/#7 pasa a fail-closed.

## Notas para el Dev
- Reusar `require_tenant`; **NO** reintroducir `is None` (ver el gotcha del `SimpleLazyObject` en [[patron-tenancy]]).
- Verificar que no rompa: creación de venta del cajero, `UserViewSet` del admin, el POS (`/products/pos/`, `apps/products/views.py:78-87`, que también se salta el guard).
- Doble actualización: `el_vuelto_backend/CLAUDE.md` — y ojo que ahí hay que **corregir** las dos frases falsas de [[DOCS-20260804-claudemd-garantia-falsa]].
