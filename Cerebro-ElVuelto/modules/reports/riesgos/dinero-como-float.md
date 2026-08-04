---
tags: [riesgo, reports, dinero]
status: vivo
module: reports
severidad: media
updated: 2026-08-02
---

# Riesgo — Reports serializa dinero como `float`

**Severidad:** 🟡 media

## Qué
Todas las respuestas de reports convierten los montos con `float(...)` (`apps/reports/views.py:42,102,152-160,175,213`): `Decimal → float`. Posible pérdida de precisión y, sobre todo, **inconsistencia de tipo** con `sales`, que expone los montos como **string** (Decimal preservado). El front recibe number de reports y string de sales.

## Impacto
Bajo-medio hoy (COP entero), pero es una asimetría que confunde y puede introducir artefactos si aparecen centavos. Ver [[patron-formato-cop]].

## Fix
Unificar la representación de dinero en las respuestas (idealmente string/Decimal como sales) o documentar y aceptar la convención. Parte de [[REPORTS-20260802-hardening-params]] o ítem propio.
