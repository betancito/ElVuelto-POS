---
tags: [prompt, backend, reports, sales, inventory, hardening, fix]
status: 🔴
module: _transversal
updated: 2026-08-04
---

# Prompt DEV — Un parámetro de fecha inválido debe dar 400, no 500

**Tareas backlog:** [[REPORTS-20260802-hardening-params]] + [[BACKEND-20260804-params-fecha-sin-validar]]
**Alcance:** un helper compartido de parseo + sus 3 consumidores. No git. No tocar el front.

## El problema

Tres módulos meten query params **crudos** en lookups de fecha, sin `try/except` ni serializer de params. Un valor basura revienta con **500**, no con un 400 explicable. Van juntos porque la solución correcta es **un solo helper**, no tres `try/except` copiados.

| # | Dónde | Qué pasa hoy |
|---|---|---|
| 1 | `apps/reports/views.py:195` | `min(int(request.query_params.get("limit", 10)), 100)` — `int()` desnudo. `?limit=abc` → **500**. Y `?limit=-5` pasa el `min()` y llega negativo al slice |
| 2 | `apps/reports/views.py:253-254` | `date.fromisoformat(fecha_inicio)` / `(fecha_fin)` desnudos → **500** |
| 3 | `apps/reports/views.py:257-264` | `while current <= end:` construye un dict **por día sin ningún tope de rango**. Un rango de 50 años arma ~18.000 entradas en memoria |
| 4 | `apps/sales/views.py:41-44` | `qs.filter(created_at__date__gte=fecha_inicio)` con el string crudo → **500** |
| 5 | `apps/inventory/views.py:55-58` | ídem |

Las 5 vistas de `apps/reports/views.py` leen `fecha`/`fecha_inicio`/`fecha_fin` (`:24-26`, `:70`, `:122-124`, `:192-194`, `:233-234`) — revisá **todas**, no solo las que cito.

> [!info] Por qué es 500 y no 400
> El `ValueError` de `int()`/`fromisoformat()` y el `django.core.exceptions.ValidationError` de un lookup de fecha con basura **no** los mapea el `exception_handler` de DRF: caen en su `return None` y Django los convierte en 500.

## Qué hacer

### 1. Un helper compartido
Creá algo como `apps/tenants/date_params.py` (o donde te parezca coherente — pero **uno solo**, importado por los tres módulos) que exponga:

```python
def parse_date_param(value, field_name):     # "" / None -> None; inválido -> ValidationError({field_name: "..."})
def parse_date_range(params, max_days=None)  # (inicio, fin) validados y coherentes
def parse_positive_int(value, field_name, default, maximum)
```

Que levanten `rest_framework.serializers.ValidationError` — DRF **sí** la mapea a 400 por campo, que es lo que `applyServerErrors` del front consume (ver [[patron-errores-drf-rtk]]).

Reglas que debe imponer `parse_date_range`:
- Formato `YYYY-MM-DD`; cualquier otra cosa → 400 sobre el campo que falló.
- **`fecha_inicio > fecha_fin` → 400.** Hoy eso devuelve una lista vacía en silencio.
- **Tope de ancho de rango** (`max_days`) → 400 si se excede. Elegí un número defendible (sugerencia: **366 días**) y **decilo en el reporte**. Esto es lo que cierra el punto 3.

### 2. Aplicarlo
- Las **5** vistas de `apps/reports/views.py`, incluido el `limit` del punto 1 (con piso: un `limit` ≤ 0 es 400, no un slice negativo).
- `SaleViewSet.get_queryset` (`apps/sales/views.py:36-44`).
- `InventoryMovementViewSet.get_queryset` (`apps/inventory/views.py:49-58`).

### 3. Un detalle de semántica que hay que decidir
Hoy mandar **medio rango** (`?fecha_inicio` sin `?fecha_fin`) cae en silencio al histórico completo. Hacelo explícito: o exigís los dos (400 si falta uno) o documentás el default. **Elegí, aplicá consistentemente en los tres módulos, y decilo en el reporte.**

## Restricciones
- Solo backend. **Sin front, sin migraciones.**
- **No toques** lo entregado hoy: el `require_tenant` de los get_queryset/serializers, el guard de `monto_recibido`, la agregación de stock por producto, ni la política de passwords. Si tu cambio los roza, pará y reportá.
- Los `require_tenant(request)` de reports van **primero**, antes de parsear params: sin tenant es 403, no 400.
- Claves de error en **español**, con el nombre real del param (`fecha_inicio`, `fecha_fin`, `limit`).
- No cambies el shape de las respuestas exitosas — el front ya consume esos JSON.

## Entregable / verificación
Reporte con **salida real**:
1. `python manage.py makemigrations --check --dry-run` → sin cambios.
2. Pegá request/respuesta de estos casos:

| # | Request | Esperado |
|---|---|---|
| 1 | `GET /api/reports/ventas-por-dia/?fecha_inicio=hoy&fecha_fin=2026-08-04` | **400** `{"fecha_inicio": …}` |
| 2 | `GET /api/reports/top-productos/?limit=abc` | **400** `{"limit": …}` |
| 3 | `GET /api/reports/top-productos/?limit=-5` | **400** |
| 4 | `GET /api/reports/ventas-por-dia/?fecha_inicio=1990-01-01&fecha_fin=2040-01-01` | **400** por rango excedido |
| 5 | `GET /api/reports/ventas-por-dia/?fecha_inicio=2026-08-04&fecha_fin=2026-08-01` (invertido) | **400** |
| 6 | `GET /api/sales/?fecha_inicio=hoy` | **400**, no 500 |
| 7 | `GET /api/inventory/movements/?fecha_fin=32-13-2026` | **400** |
| 8 | **`GET /api/reports/summary/?fecha=2026-08-04` (válido)** | **200**, mismo shape que antes |
| 9 | **`GET /api/sales/?fecha_inicio=2026-08-01&fecha_fin=2026-08-04`** | **200**, filtra bien |
| 10 | **`GET /api/reports/ventas-por-dia/` sin params** | **200** (default de 7 días, como hoy) |
| 11 | **`GET /api/reports/*` como SUPERADMIN** | **403** (el guard de tenant sigue primero) |

Los casos **8–11 son la regresión y son los que importan**: romper los dashboards del admin es peor que el 500 que estás arreglando.

3. Decí explícitamente qué elegiste para `max_days` y para el medio-rango.
4. Veredicto ✅ / 🔴.

**Doble actualización:** en `el_vuelto_backend/CLAUDE.md`, documentá los params validados de cada endpoint (formato, tope de rango, comportamiento del medio-rango) y agregá el gotcha de que un `ValueError`/`ValidationError` de Django **no** lo mapea DRF y termina en 500 — por eso el parseo va por el helper.

> [!warning] Si algo no cuadra
> Pará y reportá con `archivo:línea`. Las anclas se verificaron el 2026-08-04 **después** de los fixes de tenancy y de stock, pero el código manda.
