---
tags: [corrida, users, front, seguridad, password]
status: 🟢 corrido-ok
module: users
updated: 2026-08-09
---

# RUN 2026-08-09 — Mostrar la contraseña rotada al promover por el modal de edición

**Prompt:** [[PROMPT-FIX-USERS-20260809-mostrar-password-rotado-en-edicion]]
**Tarea:** [[USERS-20260809-promocion-no-muestra-password-rotado]]
**Veredicto:** ✅ **PASÓ** — review con ejecución real + verificación adversarial (workflow de 5 agentes: typecheck+build, trazado de los 5 casos de aceptación, búsqueda de regresiones, y 2 refutadores por cada hallazgo crudo).

## Diff entregado
`el_vuelto_frontend/src/features/users/usersApi.ts` (+3 líneas: `new_password?: string | null` en `User`) y `UsersPage.tsx` (`onEditSubmit` ahora captura `result` de `updateUser(...).unwrap()` y abre `UserCredentialsModal` con `isReset: true` cuando `result.new_password` es truthy, usando `result` — no `data`/`editUser` — para `rol`/`correo`/`cedula`/`password`). Exactamente el alcance pedido, nada de backend tocado.

## Verificación ejecutada
- `npm run typecheck` → limpio, exit 0.
- `npm run build` → `✓ built in 4.68s`, exit 0. (Warning no relacionado de Vite sobre tamaño de chunk — preexistente, nit, refutado como no-defecto de este diff.)
- Verificación visual: **no ejecutada** (sin navegador disponible en el entorno) — mismo criterio aceptado en corridas anteriores (ver [[RUN-20260805-cuatro-400-invisibles]]).

## Los 5 casos, trazados contra el código real
| # | Caso | Resultado |
|---|---|---|
| 1 | CAJERO→ADMIN + correo, sin password | `result.new_password` truthy → `UserCredentialsModal` se abre con la contraseña de 12 chars |
| 2 | Editar solo `nombre` | `new_password` es `null` → modal de credenciales **no** se abre |
| 3 | ADMIN→CAJERO (democión) | `new_password` es `null` → modal **no** se abre |
| 4 | Crear usuario | `onSubmit` intacto, sigue mostrando el modal como siempre |
| 5 | `handleReset` | Intacto, sigue funcionando igual |

Puntos verificados sin hallar defectos: el narrowing de tipos (`string | null | undefined` → `string` dentro del `if`) es correcto y lo confirma `tsc`; `result` viene fresco del PATCH vía `.unwrap()`, no de caché; no hay escenario alcanzable donde `result.correo`/`result.cedula` sea `null` cuando `new_password` es truthy (el único camino que dispara rotación exige `correo` por el `superRefine` de Zod); el `catch` existente sigue envolviendo todo el bloque.

## Búsqueda de regresiones
`User` (con el campo nuevo) solo se importa en `UsersPage.tsx` y `ProfilePage.tsx`; nada más en el front lo consume. `onEditSubmit` arma el payload del PATCH campo por campo (no spreadea un `User` completo), así que `new_password` nunca viaja de vuelta al backend. `npm run typecheck` limpio en **todo** el proyecto confirma que ningún otro archivo se ve afectado por el campo opcional nuevo.

## Doble actualización
`el_vuelto_frontend/CLAUDE.md` (`features/users/`) documenta el comportamiento: *"Editing a user can rotate their credential — the front must show it"* — verificado que coincide con el código real.

## Checklist de trampas
**#3 tags RTK**: no aplica (no se tocaron tags). **#7 errores**: el `catch` de `onEditSubmit` no cambió. **#10 doble actualización**: ✅. **#11**: sin git, alcance respetado (solo los 2 archivos indicados).

## Cierra
[[USERS-20260809-promocion-no-muestra-password-rotado]] → 🟢. Con esto, la cadena completa de la promoción de rol (backend + front) queda cerrada de punta a punta.
