---
tags: [registro, prompts, auth]
status: activo
module: auth
updated: 2026-08-02
---

# Registro de prompts y corridas — auth

Log de los prompts entregados al Dev (Agente B). Append-only en la tabla; el Planner actualiza el estado al correr.

**Estados:** 🔴 escrito (pendiente) · 🟡 en curso · 🟢 corrido-ok · ⛔ corrido-falló.

| Prompt | Tipo | Tarea backlog | Estado | Corrida | Veredicto | Reporte |
|---|---|---|---|---|---|---|
| [[PROMPT-FIX-AUTH-20260802-exigir-tenant-id]] | fix 🔒 | [[AUTH-20260802-exigir-tenant-id-login-cajero]] | 🟢 corrido-ok | 2026-08-02 | ✅ tenant_id requerido, front OK | [[RUN-20260802-exigir-tenant-id]] |

## Cómo se registra una corrida
El **Planner** actualiza la fila al correr (Estado, Corrida, Veredicto) y guarda el reporte extenso en `corridas/RUN-<fecha>-<slug>.md`. El Dev no edita el cerebro.
