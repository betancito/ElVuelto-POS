---
tags: [registro, prompts, reports]
status: activo
module: reports
updated: 2026-08-03
---

# Registro de prompts y corridas — reports

Log de los prompts entregados al Dev (Agente B) para este módulo. Append-only en la tabla; el Planner actualiza el estado al correr.

**Estados:** 🔴 escrito (pendiente) · 🟡 en curso · 🟢 corrido-ok · ⛔ corrido-falló.

| Prompt | Tipo | Tarea backlog | Estado | Corrida | Veredicto | Reporte |
|---|---|---|---|---|---|---|
| [[PROMPT-FIX-REPORTS-20260803-guard-tenant-none]] | fix | [[REPORTS-20260802-endpoints-500-tenant-none]] | 🟢 corrido-ok | 2026-08-03 | ✅ `require_tenant` → 403 (antes 500); +fix del `_get_tenant` roto; verificado | [[RUN-20260803-guard-tenant-none]] |
| [[PROMPT-FIX-REPORTS-20260803-invalidar-tag-report]] | fix | [[REPORTS-20260802-invalidar-tag-report]] | 🟢 corrido-ok | 2026-08-03 | ✅ `createSale` invalida `Report`; `createMovement` intacto; typecheck OK | — |

## Cómo se registra una corrida
El **Planner** actualiza la fila al correr (Estado, Corrida, Veredicto) y guarda el reporte extenso en `corridas/RUN-<fecha>-<slug>.md`. El Dev no edita el cerebro.
