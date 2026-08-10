---
tags: [registro, prompts, sales]
status: activo
module: sales
updated: 2026-08-03
---

# Registro de prompts y corridas — sales

Log de los prompts entregados al Dev (Agente B) para este módulo. Append-only en la tabla; el Planner actualiza el estado al correr.

**Estados:** 🔴 escrito (pendiente) · 🟡 en curso · 🟢 corrido-ok · ⛔ corrido-falló.

| Prompt | Tipo | Tarea backlog | Estado | Corrida | Veredicto | Reporte |
|---|---|---|---|---|---|---|
| [[PROMPT-FIX-SALES-20260803-guard-monto-recibido]] | fix 💰 | [[SALES-20260802-guard-monto-recibido]] | 🟢 corrido-ok | 2026-08-03 | ✅ 400 si `monto_recibido < total`; NEQUI intacto; verificado en shell | [[RUN-20260803-guard-monto-recibido]] |
| [[PROMPT-FIX-SALES-20260804-items-duplicados-sobreventa]] | fix 📦 | [[SALES-20260804-items-duplicados-sobreventa]] | 🟢 corrido-ok | 2026-08-04 | ✅ pasó (12/12, verificado por el Planner); agrega por producto antes de validar; no consolida líneas (decisión documentada) | [[RUN-20260804-items-duplicados-sobreventa]] |

## Cómo se registra una corrida
El **Planner** actualiza la fila al correr (Estado, Corrida, Veredicto) y guarda el reporte extenso en `corridas/RUN-<fecha>-<slug>.md`. El Dev no edita el cerebro.
