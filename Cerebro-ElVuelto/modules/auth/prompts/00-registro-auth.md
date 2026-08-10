---
tags: [registro, prompts, auth]
status: activo
module: auth
updated: 2026-08-09
---

# Registro de prompts y corridas — auth

Log de los prompts entregados al Dev (Agente B). Append-only en la tabla; el Planner actualiza el estado al correr.

**Estados:** 🔴 escrito (pendiente) · 🟡 en curso · 🟢 corrido-ok · ⛔ corrido-falló.

| Prompt | Tipo | Tarea backlog | Estado | Corrida | Veredicto | Reporte |
|---|---|---|---|---|---|---|
| [[PROMPT-FIX-AUTH-20260802-exigir-tenant-id]] | fix 🔒 | [[AUTH-20260802-exigir-tenant-id-login-cajero]] | 🟢 corrido-ok | 2026-08-02 | ✅ tenant_id requerido, front OK | [[RUN-20260802-exigir-tenant-id]] |
| [[PROMPT-FIX-AUTH-20260805-throttling-login]] | fix 🔒 | [[AUTH-20260805-sin-throttling-en-login]] | 🟢 corrido-ok | 2026-08-05 | ✅ pasó 9/9 (6 criterio + 3 evasiones); 2 capas identidad+IP; POS sin 429; Redis opcional | [[RUN-20260805-throttling-login]] |
| [[PROMPT-FIX-AUTH-20260809-check-revoke-token]] | fix 🔒 | [[BACKEND-20260805-sin-revocacion-de-sesiones]] | 🟢 corrido-ok | 2026-08-09 | ✅ pasó — verificado con requests HTTP reales de punta a punta + costo medido (3 queries con/sin el flag, sin diferencia) | [[RUN-20260809-check-revoke-token]] |

## Cómo se registra una corrida
El **Planner** actualiza la fila al correr (Estado, Corrida, Veredicto) y guarda el reporte extenso en `corridas/RUN-<fecha>-<slug>.md`. El Dev no edita el cerebro.
