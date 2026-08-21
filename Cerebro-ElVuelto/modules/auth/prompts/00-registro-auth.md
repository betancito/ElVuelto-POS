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

| _(sin prompt — Planner implementa)_ | feature | [[AUTH-20260816-teclado-numerico-staff-login]] | 🟢 corrido-ok | 2026-08-16 | ✅ pasó — pedido directo con modo plan aprobado; typecheck+build en 0; login de cajero real (cédula+PIN+tenant_id → 200 `rol=CAJERO`) y los 3 rechazos, con limpieza que dejó la base como estaba; **dos** rondas adversariales (33 + 6 agentes) → 15 hallazgos reales en la 1ª y **2 regresiones de mis propios arreglos** en la 2ª (el `<label>` dejaba el campo sin ningún teclado; el flag de teclado físico era un latch que un lector HID trababa para siempre), todo corregido. ⚠️ **el gesto táctil NO se ejecutó** (sin navegador ni jsdom; no se instaló nada) — falta confirmación visual del owner | [[RUN-20260816-teclado-numerico-staff-login]] |

## Cómo se registra una corrida
El **Planner** actualiza la fila al correr (Estado, Corrida, Veredicto) y guarda el reporte extenso en `corridas/RUN-<fecha>-<slug>.md`. El Dev no edita el cerebro.
