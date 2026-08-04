---
tags: [tarea, docs]
status: 🔴
prioridad: media
updated: 2026-08-02
---

# DOCS-20260802-corregir-claudemd-drift — Corregir drift y partir CLAUDE.md

**Tipo:** doc

## Problema (drift doc↔código detectado)
- Ruta muerta: `app/api/baseApi.ts` (real: `src/app/apiBase.ts`, instancia `apiBase`). `CLAUDE.md:56`, `frontend/CLAUDE.md:45`.
- Impresión ESC/POS backend = falso (es frontend). Ver [[patron-impresion-recibos]].
- `reports`: docs listan 3 endpoints, hay **5** (`ventas-por-dia`, `sales-detail`). Ver [[sales--reports]].
- `lead_cashier` (rol de cajero líder) no documentado.
- `UpdateMeView` (`PATCH /api/auth/me/update/`) no documentado.
- `backend/CLAUDE.md` = **445 líneas** > presupuesto de 400 → partir (ej. `CLAUDE_MODELS.md`, `CLAUDE_API.md`).

## Criterio de aceptación
Cada `CLAUDE_*.md` < 400 líneas, con "LÉEME SI VAS A TOCAR: …" al inicio. Rutas y conteos corregidos. Sin repetir el cerebro (se enlazan).

## Notas para el Dev
- Fuente: los patrones de `_global/` y los `contratos-<mod>` del cerebro.
- Solo doc; no tocar código.
