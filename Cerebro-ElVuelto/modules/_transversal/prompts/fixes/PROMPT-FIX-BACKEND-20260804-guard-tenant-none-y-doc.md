---
tags: [prompt, backend, tenancy, seguridad, docs, fix]
status: 🔴
module: _transversal
updated: 2026-08-04
---

# 🔒 Prompt DEV — Cerrar el guard de tenant en los caminos restantes (y dejar de mentir sobre ellos)

**Tareas backlog:** [[BACKEND-20260803-guard-tenant-none-viewsets-restantes]] (alta) + [[DOCS-20260804-claudemd-garantia-falsa]] (🔒 alta)
**Alcance:** una sola invariante en 7 puntos del backend, **más** las dos frases del `CLAUDE.md` que hoy dicen lo contrario. No git. No tocar el front.

## La invariante

> Ninguna vista con datos de tenant sigue adelante sin tenant. **Sin tenant ⇒ 403.** Nunca continuar, nunca "devolver vacío", nunca dejar pasar la validación.

`require_tenant(request)` (`apps/tenants/utils.py`) ya existe y hace exactamente eso. Los 5 `APIView` de reports, `StockView` y `TenantModelViewSet` ya lo usan. Faltan los de abajo.

> [!warning] Dos cosas que el cerebro creía y son falsas — verificadas ejecutando Django
> 1. **NO "devuelve vacío": revienta.** `filter(tenant=SimpleLazyObject→None)` lanza `TypeError: one of the hex, bytes, bytes_le, fields, or int arguments must be given` → **500**. Confirmado para `User` y `Sale`.
> 2. **`ProductViewSet` NO está cubierto** por heredar de `TenantModelViewSet`: sobreescribe `get_queryset()` sin llamar a `super()`, así que tira el guard heredado.

## Parte 1 — Los 4 `get_queryset` (mecánico)

| # | Archivo:línea | Hoy |
|---|---|---|
| 1 | `apps/sales/views.py` `SaleViewSet.get_queryset` | `filter(tenant=self.request.tenant)` sin guard |
| 2 | `apps/inventory/views.py` `InventoryMovementViewSet.get_queryset` | ídem |
| 3 | `apps/users/views.py:102-103` `UserViewSet.get_queryset` | ídem |
| 4 | `apps/products/views.py:50-55` `ProductViewSet.get_queryset` | sobreescribe y pierde el guard del base |

En los cuatro: resolvé el tenant con `require_tenant(self.request)` **primero** y filtrá por esa variable.

> [!warning] Cuidado con `UserViewSet` (#3)
> `User.tenant` es FK **nullable**. Si "arreglás" el 500 dejando que el tenant resuelva a `None` literal, `filter(tenant=None)` pasa a significar `tenant IS NULL` y el endpoint listaría **y editaría a todos los SUPERADMIN de la plataforma**. La corrección correcta es **403**, no `filter(tenant=None)`.

`ProductViewSet` (#4) tiene además la acción `pos` (`views.py:78-87`), que hace su propio queryset — guardala también.

## Parte 2 — Las 3 rutas de escritura y validación (lo sutil)

### 2a. `apps/sales/serializers.py:108-115` — `SaleCreateSerializer.create`
Hace `tenant = request.tenant` y se lo pasa a `_resolve_products(items_data, tenant)` (`:78-84`, que filtra `Product.objects.filter(id__in=..., tenant=tenant, ...)`). Con tenant None revienta igual. Usá `require_tenant(request)`.

### 2b y 2c. Guards **fail-open** — el patrón invertido
`apps/inventory/serializers.py:52-57` y `apps/products/serializers.py:57-63` tienen la misma forma:

```python
if request and request.tenant and value.tenant_id != request.tenant.id:
    raise serializers.ValidationError("El producto no pertenece a este tenant.")
```

Ese `and request.tenant` **desactiva la validación cross-tenant justo cuando no hay tenant**: sin tenant, la condición es falsa y el producto/categoría ajeno **pasa**. Es lo contrario de lo que debe hacer un guard: la ausencia de contexto tiene que **cerrar**, no abrir.

Convertilos a fail-closed: sin tenant ⇒ error (403 vía `require_tenant`, o `ValidationError` — elegí y sé consistente con lo que hagas en la vista que los invoca; lo importante es que **no pase de largo**).

## Parte 3 — Corregir las dos frases falsas del `CLAUDE.md`

En `el_vuelto_backend/CLAUDE.md`, sección **Design Patterns & Gotchas** (al final):

1. La viñeta de `require_tenant` dice *"Used by `TenantModelViewSet._get_tenant()` (so `CategoryViewSet`/`ProductViewSet` **get it for free**)"*. Es falso para `ProductViewSet` (sobreescribe `get_queryset`). Después de tu fix, describí lo que **realmente** queda.
2. La viñeta **"Follow-up (not yet guarded)"** dice que esos viewsets *"→ **empty (not 500)** for `tenant=None`"*. Es falso (es `TypeError` → 500) **y** además, cuando termines, ya no es un follow-up: reescribila para reflejar que quedaron guardados.
3. Revisá por coherencia el punto 3 de la sección **Multi-Tenancy** (menciona la misma nota de follow-up).

Documentá también el patrón **fail-open → fail-closed** de la Parte 2 como gotcha: es una trampa que se va a repetir.

## Restricciones
- Solo backend + `el_vuelto_backend/CLAUDE.md`. **Nada de front.** Sin migraciones (no cambiás modelos).
- **NO** reintroduzcas `request.tenant is None` — `request.tenant` es un `SimpleLazyObject` y `is None` es **siempre** False aunque resuelva a None. Usá truthiness, que es lo que hace `require_tenant`.
- No cambies permisos ni rutas. No toques la política de passwords que se acaba de entregar.
- Si algún flujo con tenant real se rompe, **pará y reportá** — romper el POS del cajero es peor que dejar el 500 del superadmin.

## Entregable / verificación
Reporte con **salida real**:
1. `python manage.py makemigrations --check --dry-run` → sin cambios (pegá la salida).
2. `grep -rn "request.tenant is None" apps/` → **0 hits** (pegá la salida).
3. Tabla de los 7 puntos: archivo:línea + cómo quedó guardado.
4. Pegá request/respuesta de estos casos. **Los "con tenant" son los que importan: son la regresión.**

| # | Caso | Esperado |
|---|---|---|
| 1 | `GET /api/sales/` como SUPERADMIN (tenant None) | **403**, no 500 |
| 2 | `GET /api/inventory/movements/` como SUPERADMIN | **403** |
| 3 | `GET /api/users/` como SUPERADMIN | **403** — y NO una lista de superadmins |
| 4 | `GET /api/products/` como SUPERADMIN | **403** |
| 5 | `GET /api/products/pos/` como SUPERADMIN | **403** |
| 6 | `POST /api/sales/` como SUPERADMIN | **403** |
| 7 | **`GET /api/users/` como ADMIN** | **200**, solo los de su tenant |
| 8 | **`GET /api/products/` y `/pos/` como CAJERO/ADMIN** | **200**, igual que antes |
| 9 | **`POST /api/sales/` como CAJERO** | **201**, el POS sigue vendiendo |
| 10 | **`POST /api/inventory/movements/` como ADMIN** | **201** |

5. Veredicto ✅ / 🔴.

> [!warning] Si algo no cuadra
> Pará y reportá con `archivo:línea`. Las anclas se verificaron el 2026-08-04 **después** de los dos fixes de users, así que los números ya incluyen ese desplazamiento — pero el código manda.
