---
tags: [tarea, reports, robustez]
status: 🟢
prioridad: media
updated: 2026-08-05
---

> [!done] Parte "params" cerrada 2026-08-04 — ✅ [[RUN-20260804-hardening-params-fecha]]
> Las 5 vistas parsean con `apps/tenants/date_params.py`: `?limit=abc`/`?limit=-5` → **400**, fechas inválidas → **400** por campo, rango invertido → **400**, y hay tope de **366 días** que acota el `while` por día de `VentasPorDiaView`. `require_tenant` sigue corriendo **antes** del parseo (superadmin → 403, no 400). Verificado 20/20.
>
> **Sigue abierto de este ítem: el dinero como `float`.** Los reports convierten `Decimal` → `float()` en la salida (`apps/reports/views.py`, varias líneas) y una suma se hace sobre floats. No entró en el prompt de params. → [[dinero-como-float]]

# REPORTS-20260802-hardening-params — Validar params y dinero en reports

**Tipo:** robustez / consistencia · **Descubierto:** auditoría de módulos 2026-08-02

## Problema
- Sin params de fecha, `summary`/`top-productos` agregan todo el histórico (`apps/reports/views.py:29-34,190`).
- `?limit` no numérico o `?fecha` inválida → **500** en vez de 400 (`views.py:190,194-197`).
- Dinero serializado como `float` en reports vs `string` en sales (inconsistencia de tipo). Ver `modules/reports/riesgos/dinero-como-float` y [[patron-formato-cop]].

## Criterio de aceptación
Params inválidos → 400 claro; rango de fecha por defecto razonable; representación de dinero consistente con el resto.

## Notas para el Dev
- Validar query params (serializer o try/except → 400).
- Doble actualización: `backend/CLAUDE.md` (Reports).
