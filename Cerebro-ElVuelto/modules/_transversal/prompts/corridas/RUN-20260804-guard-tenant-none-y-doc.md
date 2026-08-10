---
tags: [corrida, backend, tenancy, seguridad, docs]
status: 🟢 corrido-ok
module: _transversal
updated: 2026-08-04
---

# RUN 2026-08-04 — Guard de tenant en los caminos restantes + corrección del CLAUDE.md

**Prompt:** [[PROMPT-FIX-BACKEND-20260804-guard-tenant-none-y-doc]]
**Tareas:** [[BACKEND-20260803-guard-tenant-none-viewsets-restantes]] + [[DOCS-20260804-claudemd-garantia-falsa]] (🔒 alta)
**Veredicto:** ✅ PASÓ

> [!info] Verificación ejecutada por el Planner
> `makemigrations --check` + `grep` de `is None` + los **10 casos** del criterio, contra el código real con `set_rollback(True)`. **10/10.**

## Diff entregado
7 archivos del alcance + `el_vuelto_backend/CLAUDE.md` (todos con mtime 21:24–21:29). Verificado por mtime que `apps/reports/views.py` y `apps/tenants/viewsets.py` (08-03) **no** se tocaron — el diffstat acumulado desde HEAD engaña. **Front sin tocar.** Sin migraciones.

## Los 7 puntos, cerrados

| # | Punto | Cómo quedó |
|---|---|---|
| 1 | `SaleViewSet.get_queryset` (`sales/views.py:33`) | `tenant=require_tenant(self.request)` |
| 2 | `InventoryMovementViewSet.get_queryset` (`inventory/views.py:46`) | ídem — **y además** `perform_create` (`:65`) y `StockView` (`:74`) |
| 3 | `UserViewSet.get_queryset` (`users/views.py:108`) | `filter(tenant=require_tenant(self.request))` — **403, no `filter(tenant=None)`** ✅ |
| 4 | `ProductViewSet.get_queryset` (`products/views.py:53`) | `self._get_tenant()` explícito, con comentario de por qué el `super()` no basta. La acción `pos` (`:84`) también |
| 5 | `SaleCreateSerializer.create` (`sales/serializers.py:112`) | `require_tenant(request)` **antes** del `select_for_update` |
| 6 | `InventoryMovementSerializer.validate_product` | **fail-closed** |
| 7 | `ProductSerializer.validate_category` | **fail-closed** |

**Los guards fail-open (6 y 7) quedaron bien.** El `if request and request.tenant and …` desapareció; ahora `request is None` → error explícito y la comparación va contra `require_tenant(request).id`, así que sin tenant **cierra** en vez de dejar pasar el producto ajeno. Los docstrings explican el bug anterior — eso vale para que no vuelva.

## Verificación (10/10)

`makemigrations --check --dry-run` → `No changes detected` · `grep -rn "tenant is None" apps/` → **0 hits**

| # | Sin tenant (SUPERADMIN) | | # | Con tenant (regresión) | |
|---|---|---|---|---|---|
| 1 | `GET /sales/` | **403** | 7 | `GET /users/` ADMIN | **200** |
| 2 | `GET /inventory/movements/` | **403** | 8 | `GET /products/` ADMIN | **200** |
| 3 | `GET /users/` | **403** ✅ no lista superadmins | 8b | `GET /products/pos/` CAJERO | **200** ✅ el POS vende |
| 4 | `GET /products/` | **403** | 9 | `POST /sales/` CAJERO | **201** |
| 5 | `GET /products/pos/` | **403** (`Tenant context is required…`) | 10 | `POST /inventory/movements/` ADMIN | **201** |
| 6 | `POST /sales/` | **403** | | | |

> [!warning] Nota de método para futuros reviews — un falso 🔴 mío
> En la primera pasada el caso 8b dio **403** y parecía una regresión que rompía el POS. Era **artefacto del arnés**: `ViewSet.as_view({"get":"pos"})` llamado a mano **no aplica los `initkwargs` del `@action`**, así que `permission_classes=[IsCajero]` no se cargaba y quedaba el `[IsAdmin]` de la clase. Repetido con `as_view({"get":"pos"}, **ProductViewSet.pos.kwargs)` → **200 con 1 producto**. Al probar acciones `@action` fuera del router, hay que pasar `.kwargs` a mano.

## Doble actualización — `CLAUDE.md`
Las dos frases falsas **corregidas**, y bien:
- La de *"get it for free"* pasó a **"Not a 'get it for free' situation"**, explicando que heredar no garantiza nada si el subclass sobreescribe `get_queryset()` sin `super()` — y que `ProductViewSet` hacía exactamente eso mientras la doc decía lo contrario.
- La de *"empty (not 500)"* pasó a **"A missing guard does NOT 'return empty' — it 500s"**, con el `TypeError` textual y la advertencia de que `filter(tenant=None)` en `UserViewSet` significaría `tenant IS NULL`, o sea **todos los SUPERADMIN**.
- Añadió una **tabla de dónde está guardado cada camino** y un gotcha nuevo **"Guards must fail CLOSED"** con el patrón malo y el bueno lado a lado. Eso es exactamente lo que hacía falta para que no se repita.
- El punto 3 de Multi-Tenancy (`:69`) también quedó coherente.

## Checklist de trampas
**#1 tenancy** ✅ es el objeto del prompt, y se verificó la regresión con tenant real · **#4 permisos** ✅ sin cambios · **#9 migraciones** ✅ · **#10 doble actualización** ✅ · **#11** ✅ sin git, sin scope creep, front intacto.

## 👏 Auto-reporte del Dev (bien hecho)
El Dev **flagueó un hueco que no estaba en su alcance** en vez de callarlo o de arreglarlo por su cuenta: `UserCreateSerializer` sigue leyendo `request.tenant` crudo. Es exactamente la conducta que pide el prompt. Verificado y **es real** — pero con una imprecisión en su nota:

| Caso | La nota del Dev dice | Lo que pasa de verdad (ejecutado) |
|---|---|---|
| `POST /users/` superadmin, CAJERO con cédula | 500 | ✅ `TypeError` → **500** (`serializers.py:203`, filtro de unicidad) |
| `POST /users/` superadmin, ADMIN sin cédula | *"creates a user with `tenant=None`"* | ❌ **No crea nada**: `ValueError: Cannot assign "<SimpleLazyObject: None>"` → **500** (`:231`) |

Django rechaza asignar el `SimpleLazyObject` al FK, así que no hay usuario huérfano. Menos grave de lo documentado. → [[BACKEND-20260804-guard-tenant-usercreateserializer]]
