---
tags: [tarea, users, front, seguridad, password]
status: 🟢
prioridad: 🔒 alta
updated: 2026-08-09
---

> [!info] Cerrada 2026-08-09
> ✅ Pasó — verificado con `typecheck`+`build` reales y trazado de los 5 casos de aceptación contra el código, más una búsqueda adversarial de regresiones (0 encontradas). Ver [[RUN-20260809-mostrar-password-rotado-en-edicion]].

# 🔒 USERS-20260809-promocion-no-muestra-password-rotado — El front descarta la contraseña que el backend rota al promover

**Tipo:** seguridad / acceso · **Encontrado revisando** [[USERS-20260805-promocion-no-rota-credencial]] · **Verificado por el Planner leyendo + `mtime`**

## El problema
Desde [[RUN-20260806-promocion-no-rota-credencial]]: `UserCreateSerializer` ya rota la contraseña cuando un `PATCH` sube el rol (CAJERO→ADMIN) sin mandar `password`, y la devuelve en `new_password` (`apps/users/serializers.py`). Pero `onEditSubmit` en `UsersPage.tsx:158-175` descarta el resultado de `updateUser(...).unwrap()` — solo hace `setEditUser(null)`. La interfaz `User` de `usersApi.ts` ni siquiera declara el campo.

## Por qué es alta
1. **Es el flujo normal de la UI** — el mismo que motivó la tarea original: el modal de edición manda `rol` + `correo`, nunca `password`.
2. **Deja una cuenta inaccesible sin avisar.** El backend genera y guarda una contraseña de 12 caracteres con `secrets`; nadie la ve. Ni el admin que promovió ni el usuario promovido pueden loguearse hasta que alguien corra "restablecer contraseña" — y nada en pantalla indica que hace falta.
3. **Comparación directa con `handleReset`** (mismo archivo): esa acción sí abre `UserCredentialsModal` con la password nueva. La promoción, que ahora hace lo mismo del lado del servidor, no tiene el mismo tratamiento del lado del cliente.

## Criterio de aceptación
Cuando `PATCH /api/users/{id}/` devuelve `new_password` (no null), el admin que hizo la promoción ve esa contraseña en pantalla, en el mismo componente (`UserCredentialsModal`) que ya se usa para creación y reset — no queda ninguna promoción con contraseña invisible.

## Notas para el Dev
- Alcance: `usersApi.ts` (tipar `new_password` en la respuesta) + `UsersPage.tsx` (`onEditSubmit`). No backend.
- Prompt ya escrito: [[PROMPT-FIX-USERS-20260809-mostrar-password-rotado-en-edicion]].
