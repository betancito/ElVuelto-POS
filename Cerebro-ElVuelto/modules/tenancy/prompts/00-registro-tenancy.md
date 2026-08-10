---
tags: [registro, prompts, tenancy]
status: activo
module: tenancy
updated: 2026-08-09
---

# Registro de prompts y corridas — tenancy

Log de los prompts entregados al Dev (Agente B). Append-only en la tabla; el Planner actualiza el estado al correr.

**Estados:** 🔴 escrito (pendiente) · 🟡 en curso · 🟢 corrido-ok · ⛔ corrido-falló.

| Prompt | Tipo | Tarea backlog | Estado | Corrida | Veredicto | Reporte |
|---|---|---|---|---|---|---|
| [[PROMPT-FIX-TENANCY-20260802-creacion-atomica]] | fix | [[TENANCY-20260802-creacion-tenant-atomica]] | 🟢 corrido-ok | 2026-08-02 | ✅ atómico + 400 en correo dup (makemigrations OK) | [[RUN-20260802-creacion-atomica]] |
| [[PROMPT-FIX-TENANCY-20260809-slug-persistido]] | fix | [[TENANCY-20260804-slug-tres-implementaciones]] | 🟢 corrido-ok | 2026-08-09 | ✅ pasó — verificado ejecutando (backend, rollback) + workflow adversarial de 7 agentes; 1 hallazgo menor no bloqueante al backlog | [[RUN-20260809-slug-persistido]] |

## Cómo se registra una corrida
El **Planner** actualiza la fila al correr (Estado, Corrida, Veredicto) y guarda el reporte extenso en `corridas/RUN-<fecha>-<slug>.md`. El Dev no edita el cerebro.
