---
tags: [tarea, docs, tenancy]
status: 🟢
prioridad: alta
updated: 2026-08-03
---

> [!decision] 🟢 RESUELTO 2026-08-03 — corregidas las 3 mentiras (root `CLAUDE.md:49,93`; `backend/CLAUDE.md:61`) + el residuo de `:69` ("used by all") vía fix. Ahora reflejan la regla real (filtrado manual; `TenantMixin` solo agrega FK; `require_tenant` para None). Corridas: [[PROMPT-FIX-DOCS-20260803-claudemd-tenancy]] (⛔) → [[PROMPT-FIX-DOCS-20260803-tenancy-viewset-overstatement]] (🟢).

# DOCS-20260802-corregir-claudemd-tenancy — Corregir la mentira de tenancy en los CLAUDE.md

**Tipo:** doc · **Decisión:** D-1 / [[ADR-G-20260802-tenancy-isolation]]

## Problema
Afirmaciones falsas y peligrosas:
- `CLAUDE.md:49` — "`TenantMixin` auto-filters QuerySets by tenant_id".
- `CLAUDE.md:93` — "never manually filter by tenant in views — rely on the mixin".
- `el_vuelto_backend/CLAUDE.md:56` — "Core rule: never manually filter by tenant in views".

La verdad está en [[patron-tenancy]]: `TenantMixin` solo añade un FK; el aislamiento es filtrado manual + `TenantModelViewSet`; **hay que filtrar a mano** en toda vista.

## Criterio de aceptación
Los tres puntos corregidos para reflejar la regla real. Idealmente extraer un `CLAUDE_TENANCY.md` (<400 líneas) con la regla obligatoria y la nota de RLS como meta.

## Notas para el Dev
- Usar el contenido de [[patron-tenancy]] como fuente.
- NO cambiar código en esta tarea (es solo doc).
- Coordinar con [[DOCS-20260802-corregir-claudemd-drift]] para partir el `backend/CLAUDE.md` (445 líneas > presupuesto 400).
