---
tags: [registro, prompts, users]
status: activo
module: users
updated: 2026-08-09
---

# Registro de prompts y corridas — users

Log de los prompts entregados al Dev (Agente B) para este módulo. Append-only en la tabla; el Planner actualiza el estado al correr.

**Estados:** 🔴 escrito (pendiente) · 🟡 en curso · 🟢 corrido-ok · ⛔ corrido-falló.

| Prompt | Tipo | Tarea backlog | Estado | Corrida | Veredicto | Reporte |
|---|---|---|---|---|---|---|
| [[PROMPT-FIX-USERS-20260804-zod-requeridos-por-rol]] | fix | [[USERS-20260802-zod-requeridos-por-rol]] | 🟢 corrido-ok | 2026-08-04 | ✅ pasó | [[RUN-20260804-zod-requeridos-por-rol]] |
| [[PROMPT-FIX-USERS-20260804-invariante-correo-admin]] | fix | [[USERS-20260804-perfil-nulifica-correo-admin]] + [[USERS-20260802-patch-nulifica-campos]] | 🟢 corrido-ok | 2026-08-04 | ✅ pasó (14/14, verificado por el Planner) | [[RUN-20260804-invariante-correo-admin]] |
| [[PROMPT-FIX-USERS-20260804-politica-password-por-rol]] | fix | [[USERS-20260802-unificar-reglas-password]] | 🟢 corrido-ok | 2026-08-04 | ✅ pasó (16/16, verificado por el Planner) | [[RUN-20260804-politica-password-por-rol]] |
| [[PROMPT-FIX-USERS-20260805-promocion-no-rota-credencial]] | fix 🔒 | [[USERS-20260805-promocion-no-rota-credencial]] | ⛔ corrido-falló (parcial) | 2026-08-09 | ⚠️ backend ✅ verificado ejecutando (rotación, democión sin rotar, no-op sin rotar); front nunca lee `new_password` → cuenta promovida queda con contraseña invisible | [[RUN-20260806-promocion-no-rota-credencial]] |
| [[PROMPT-FIX-USERS-20260809-mostrar-password-rotado-en-edicion]] | fix 🔒 | [[USERS-20260809-promocion-no-muestra-password-rotado]] | 🟢 corrido-ok | 2026-08-09 | ✅ pasó — typecheck+build limpios, 5/5 casos, 0 regresiones (review con workflow adversarial) | [[RUN-20260809-mostrar-password-rotado-en-edicion]] |

## Cómo se registra una corrida
El **Planner** actualiza la fila al correr (Estado, Corrida, Veredicto) y guarda el reporte extenso en `corridas/RUN-<fecha>-<slug>.md`. El Dev no edita el cerebro.
