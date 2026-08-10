---
tags: [tarea, backend, sales, inventory, hardening]
status: 🟢
prioridad: media
updated: 2026-08-05
---

> [!done] Cerrado 2026-08-04 — ✅ [[RUN-20260804-hardening-params-fecha]]
> `SaleViewSet.get_queryset` e `InventoryMovementViewSet.get_queryset` parsean con `parse_date_range` (`apps/tenants/date_params.py`). `?fecha_inicio=hoy` → **400** por campo, no 500. Medio rango sigue siendo válido (filtro abierto), por decisión documentada. Verificado 20/20 junto con reports.

# BACKEND-20260804-params-fecha-sin-validar — `?fecha_inicio=basura` da 500 también en sales e inventory

**Tipo:** hardening · **Descubierto:** PASO 0 del 2026-08-04 · **Verificado a mano por el Planner**

## Problema
`SaleViewSet.get_queryset` (`apps/sales/views.py:38-41`) e `InventoryMovementViewSet.get_queryset` (`apps/inventory/views.py:54-57`) inyectan el query param **crudo** en el lookup, sin `try/except` ni serializer de params:

```python
if fecha_inicio:
    qs = qs.filter(created_at__date__gte=fecha_inicio)
if fecha_fin:
    qs = qs.filter(created_at__date__lte=fecha_fin)
```

Es el mismo defecto que [[REPORTS-20260802-hardening-params]], pero ese ticket está acotado a `apps/reports` — así que estos dos viewsets no estaban registrados en ninguna parte del cerebro. `GET /api/sales/?fecha_inicio=hoy` responde **500**, no 400.

## Criterio de aceptación
Un param de fecha inválido responde **400** con mensaje por campo, en `sales`, `inventory` y `reports`.

## Notas para el Dev
- Conviene resolverlo **junto** con [[REPORTS-20260802-hardening-params]] y con un helper compartido de parseo de rango de fechas, no con tres `try/except` copiados.
- Mientras se toca reports, ahí hay además: `int()` desnudo en `?limit` (`apps/reports/views.py:195`), `date.fromisoformat()` desnudo (`:253-254`), y un `while` por día **sin tope de rango** (`:253-264`) — un rango de 50 años construye un dict de ~18k entradas.
- Doble actualización: `el_vuelto_backend/CLAUDE.md`.
