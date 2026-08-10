---
tags: [corrida, users, fix, forms]
status: 🟢 corrido-ok
module: users
updated: 2026-08-04
---

# RUN 2026-08-04 — Zod condiciona cedula/correo por rol (users)

**Prompt:** [[PROMPT-FIX-USERS-20260804-zod-requeridos-por-rol]] · **Tarea:** [[USERS-20260802-zod-requeridos-por-rol]]
**Sprint:** [[Sprint-2026-08-04-users-hardening]] · **Veredicto:** ✅ PASÓ

> [!warning] Cómo se detectó esta corrida
> El Dev **no entregó reporte** al Planner: la corrida se descubrió en el PASO 0 del 2026-08-04, contrastando el cerebro contra el disco. `UsersPage.tsx` y `el_vuelto_frontend/CLAUDE.md` tienen el mismo mtime (2026-08-04 00:48) y `git diff` muestra `+18/-2` en `UsersPage.tsx`. El registro decía 🔴 escrito. Es el mismo modo de fallo de proceso que ya pasó en DOCS-drift (ver [[Sprint-2026-08-03-correccion-docs]]), invertido: allí el Dev dijo "listo" sin tocar nada; aquí tocó y nadie avisó.

## Review contra el criterio de aceptación

Criterio: *"El schema Zod condiciona `cedula`/`correo` según `rol`; el form bloquea antes de enviar."*

| # | Verificación | Resultado |
|---|---|---|
| 1 | Helper `roleRequiredFields(data, ctx)` con las dos reglas | ✅ `UsersPage.tsx:35-49` |
| 2 | `.superRefine()` aplicado al schema de **creación** | ✅ `UsersPage.tsx:51-57` |
| 3 | `.superRefine()` aplicado al schema de **edición** | ✅ `UsersPage.tsx:59-65` |
| 4 | Ambos `useForm` usan el `zodResolver` correspondiente | ✅ `UsersPage.tsx:90-102` |
| 5 | El error se **pinta**: span `ta-field-error` en crear | ✅ `:364` (correo) · `:370` (cedula) |
| 6 | El error se **pinta**: span `ta-field-error` en editar | ✅ `:471` (correo) · `:477` (cedula) |
| 7 | Mensajes idénticos a los del serializer | ✅ `apps/users/serializers.py:172,174` — literales iguales |
| 8 | **Doble actualización** del `CLAUDE.md` | ✅ `el_vuelto_frontend/CLAUDE.md:132` |

## Checklist de trampas (INIT-AGENTS)
- **#5 naming es↔en:** ✅ `cedula`/`correo` en español, coinciden con las claves del 400 del backend.
- **#6 diseño ta-*:** ✅ usa `ta-field-error`, no creó `.module.css`.
- **#7 errores 400:** ✅ ambos `catch` siguen usando `applyServerErrors` (`:137`, `:165`).
- **#8 validación divergente:** ✅ el Zod ahora es espejo de `serializers.py:171-174`.
- **#11 sin scope creep / sin git:** ✅ el diff toca **solo** `UsersPage.tsx` (+18/-2) y el `CLAUDE.md`. Sin commits del Dev.

## Salvedades (honestas)
- **No hay salida de `npm run typecheck` del Dev.** El PASO 0 corrió `npx tsc --noEmit` sobre `src/` en otra verificación: **EXIT=0**, sin errores. Sirve como evidencia equivalente, pero no es el reporte del Dev.
- **No se probó en runtime** (no hay framework de tests en el repo). Verificación por lectura de código.
- El fix está **sin commitear** (working tree). El humano versiona a mano.

## Deuda que deja abierta (no bloquea el ✅)
- 🟡 **El error de servidor del campo del rol NO activo queda invisible.** El input y su span solo se montan en la rama del rol seleccionado (`UsersPage.tsx:360-372`, `:467-479`), pero el payload manda ambos campos si tienen valor (`:119-120`, `:159-160`) y RHF conserva el valor de un campo desmontado. Un 400 `{"cedula": "Ya existe un cajero con esta cédula…"}` con `rol==='ADMIN'` hace `setError('cedula')` sin span que lo pinte → falla sin feedback. → [[USERS-20260804-error-400-campo-no-montado]]
- 🟡 `handleReset` (`UsersPage.tsx:169-183`) llama `.unwrap()` **sin try/catch** → rechazo no capturado. → mismo ítem de arriba.
