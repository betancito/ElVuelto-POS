---
tags: [registro, prompts, transversal]
status: activo
updated: 2026-08-02
---

# Registro de prompts y corridas — _transversal

Prompts que **no pertenecen a un solo módulo** (cross-cutting: front-wide, deps, etc.). Append-only en la tabla; el Planner actualiza el estado al correr.

**Estados:** 🔴 escrito (pendiente) · 🟡 en curso · 🟢 corrido-ok · ⛔ corrido-falló.

| Prompt | Tipo | Tarea backlog | Estado | Corrida | Veredicto | Reporte |
|---|---|---|---|---|---|---|
| [[PROMPT-FIX-FRONT-20260802-errores-400-helper]] | fix | [[FRONT-20260802-errores-400-silenciados]] | 🟢 corrido-ok | 2026-08-03 | ✅ helper + users/tenants (typecheck OK) | [[RUN-20260803-errores-400-helper]] |
| [[PROMPT-FIX-FRONT-20260803-errores-400-products-inventory]] | fix | [[FRONT-20260802-errores-400-silenciados]] | 🔴 escrito | — | — | — |

## Cómo se registra una corrida
El **Planner** actualiza la fila al correr (Estado, Corrida, Veredicto) y guarda el reporte extenso en `corridas/RUN-<fecha>-<slug>.md`. El Dev no edita el cerebro.
