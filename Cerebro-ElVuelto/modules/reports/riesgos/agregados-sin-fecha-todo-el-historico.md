---
tags: [riesgo, reports, robustez, rendimiento]
status: vivo
module: reports
severidad: media
updated: 2026-08-02
---

# Riesgo — Agregados sin fecha (todo el histórico) + params inválidos = 500

**Severidad:** 🟡 media

## Qué
- Sin params de fecha, `summary` y `top-productos` agregan **todo el histórico** del tenant (`apps/reports/views.py:29-34,190`). Sin tope, escala mal con el tiempo.
- `?limit` no numérico o `?fecha` inválida → **500** (`int(...)`/parse sin `try`) en vez de 400 (`views.py:190,194-197`).

## Impacto
Rendimiento a futuro + robustez (500 por input malo). Medio.

## Fix
Validar los query params (400 en inválidos) y definir un rango de fecha por defecto razonable. Ver [[REPORTS-20260802-hardening-params]].
