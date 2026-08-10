---
tags: [registro, prompts, products]
status: activo
module: products
updated: 2026-08-02
---

# Registro de prompts y corridas — products

Log de los prompts entregados al Dev (Agente B) para este módulo. Append-only en la tabla; el Planner actualiza el estado al correr.

**Estados:** 🔴 escrito (pendiente) · 🟡 en curso · 🟢 corrido-ok · ⛔ corrido-falló.

| Prompt | Tipo | Tarea backlog | Estado | Corrida | Veredicto | Reporte |
|---|---|---|---|---|---|---|
| [[PROMPT-FIX-PRODUCTS-20260802-permisos-isadmin]] | fix 🔒 | [[PRODUCTS-20260802-viewsets-sin-permiso]] | ⛔ corrido-falló | 2026-08-02 | 🔴 rompía la lectura de categorías del cajero en el POS | [[RUN-20260802-permisos-isadmin]] |
| [[PROMPT-FIX-PRODUCTS-20260802-categorias-read-cajero]] | fix | [[PRODUCTS-20260802-viewsets-sin-permiso]] | 🟢 corrido-ok | 2026-08-02 | ✅ cajero lee categorías, escritura bloqueada | [[RUN-20260802-categorias-read-cajero]] |
| [[PROMPT-FIX-PRODUCTS-20260805-valores-negativos]] | fix 🔒 | [[PRODUCTS-20260805-valores-negativos-dinero-y-stock]] | 🟢 corrido-ok | 2026-08-05 | ✅ pasó 10/10 — `MinValueValidator` sin constraint + guard de stock con `select_for_update` | [[RUN-20260805-valores-negativos]] |

## Cómo se registra una corrida
Cuando el Dev ejecuta el prompt, el **Planner** actualiza la fila (Estado, Corrida=fecha, Veredicto ✅/🔴) y, si el reporte es extenso, lo guarda en `corridas/RUN-<fecha>-<slug>.md`. El Dev no edita el cerebro.
