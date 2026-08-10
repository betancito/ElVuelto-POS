---
tags: [corrida, backend, reports, sales, inventory, hardening]
status: 🟢 corrido-ok
module: _transversal
updated: 2026-08-05
---

# RUN 2026-08-04 — Hardening de params de fecha (reports + sales + inventory)

**Prompt:** [[PROMPT-FIX-BACKEND-20260804-hardening-params-fecha]]
**Tareas:** [[REPORTS-20260802-hardening-params]] + [[BACKEND-20260804-params-fecha-sin-validar]]
**Veredicto:** ✅ PASÓ (en la **2ª entrega**; la 1ª fue [[RUN-20260804-hardening-params-CORRIDA-VACIA]])

> [!info] Verificación ejecutada por el Planner
> `makemigrations --check` + los **11 casos** del criterio + **9 adversariales** propios. **20/20.**
> El Dev corrió a las 22:19–22:22 del 2026-08-04, minutos después de la re-entrega — la corrida vacía era, en efecto, un prompt que no había llegado.

## Diff entregado
**Nuevo:** `apps/tenants/date_params.py` (93 líneas). **Modificados:** `apps/reports/views.py`, `apps/sales/views.py`, `apps/inventory/views.py`, `el_vuelto_backend/CLAUDE.md`. Front sin tocar. Sin migraciones.

## El helper
`parse_date_param` · `parse_date_range` · `parse_positive_int`, todos levantando `rest_framework.serializers.ValidationError` (la única que DRF mapea a 400 por campo). El docstring explica por qué existe: el `ValueError` de Python y el `ValidationError` de `django.core` caen en el `return None` del `exception_handler` de DRF y terminan en 500.

Dos decisiones de diseño que no le pedí y son correctas:
- **Usa `datetime.strptime(..., "%Y-%m-%d")` en vez de `date.fromisoformat`**, a propósito: `fromisoformat` también acepta `20260804` y otras grafías ISO. El formato queda estricto y documentado.
- **`parse_positive_int` clampea por arriba pero rechaza por abajo:** `?limit=1000` → 100 (conserva el comportamiento previo del que el front podría depender), `?limit=-5` y `?limit=abc` → 400. El razonamiento está en el docstring.

## Las dos decisiones que le pedí explícitamente
1. **`MAX_RANGE_DAYS = 366`** — un año bisiesto: alcanza para "el año completo" y acota la serie por día de `VentasPorDiaView`.
2. **Medio rango = permitido, no error.** Cada consumidor documenta qué hace con el borde faltante: filtro abierto en los list endpoints, default de 7 días en `VentasPorDiaView`. Aplicado consistentemente en los tres módulos.

## Verificación (20/20)

`makemigrations --check --dry-run` → `No changes detected`

**Criterio de aceptación (11/11):**
| # | Caso | Resultado |
|---|---|---|
| 1 | `ventas-por-dia?fecha_inicio=hoy` | **400** `{"fecha_inicio": "Fecha inválida: 'hoy'…"}` |
| 2 | `top-productos?limit=abc` | **400** `{"limit": …}` |
| 3 | `top-productos?limit=-5` | **400** `Debe ser un número entero mayor que cero.` |
| 4 | rango de 50 años | **400** `El rango no puede superar 366 días (pediste 18263).` |
| 5 | rango invertido | **400** `La fecha de inicio (2026-08-04) no puede ser posterior…` |
| 6 | `GET /sales/?fecha_inicio=hoy` | **400**, no 500 |
| 7 | `GET /inventory/movements/?fecha_fin=32-13-2026` | **400** |
| 8 | `summary?fecha=2026-08-04` | **200**, mismo shape |
| 9 | `GET /sales/` rango válido | **200**, filtra bien |
| 10 | `ventas-por-dia` sin params | **200**, **7 elementos** — default intacto |
| 11 | reports como SUPERADMIN | **403** |

> **El caso 11 es el que más me importaba:** `top-productos?limit=abc` como superadmin da **403, no 400** — prueba de que `require_tenant` corre **antes** del parseo en las 5 vistas. Se verificó una por una (`:25`, `:70`, `:123`, `:195`, `:237`).

**Adversariales del Planner (9/9):** `?limit=1000` → 200 (clampea) · `?fecha_inicio=` vacío → 200 · medio rango en `/sales/` → 200 · `?fecha=20260804` → 400 (formato estricto) · **rango de exactamente 366 días → 200, de 367 → 400** (el borde es exacto) · `?limit=1.5` → 400 · `sales-detail` con rango válido → 200 · `ventas-por-hora?fecha=basura` → 400.

## Regresión de formato: verificada contra el front
El endurecimiento a `%Y-%m-%d` estricto **no rompe la UI**: `todayBogota()` (`ReportsPage.tsx:28-30`, `DashboardPage.tsx:33-35`) usa `toLocaleDateString('en-CA', {timeZone:'America/Bogota'})`, que produce exactamente `YYYY-MM-DD`. Los rangos semanal/mensual salen de `weekToRange`/`monthToRange` con el mismo formato.

## Checklist de trampas
**#1 tenancy** ✅ `require_tenant` primero en las 5 vistas y en los dos `get_queryset` · **#7 errores 400** ✅ por campo, con el nombre real del param, en español · **#9 migraciones** ✅ · **#10 doble actualización** ✅ · **#11** ✅ sin git, sin front, sin scope creep.

## 🟡 Residual que deja (no bloquea, pero hay que cerrarlo)
**`ReportsPage` se traga los 400 nuevos.** Las cinco queries se destructuran como `{ data, isFetching }` (`ReportsPage.tsx:487-491`) — **ningún `isError`/`error`**. Un rango personalizado de más de 366 días (elegible con el date picker: `customStart`/`customEnd`, `:459-460`) ahora responde 400 y el usuario ve **el dashboard vacío sin ninguna explicación**, con los charts en blanco.

Antes del fix ese rango devolvía un 200 lento y enorme; ahora devuelve un 400 correcto que la UI no muestra. El prompt decía "no tocar el front", así que el Dev hizo lo correcto — pero el hueco es real y lo creamos nosotros. → [[FRONT-20260805-cuatro-400-invisibles]]
