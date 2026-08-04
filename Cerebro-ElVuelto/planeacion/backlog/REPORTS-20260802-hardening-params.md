---
tags: [tarea, reports, robustez]
status: 🔴
prioridad: media
updated: 2026-08-02
---

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
