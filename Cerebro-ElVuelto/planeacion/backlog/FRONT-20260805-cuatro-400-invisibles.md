---
tags: [tarea, front, forms, errores]
status: 🟢
prioridad: media
updated: 2026-08-05
---

> [!done] Cerrado 2026-08-05 — ✅ [[RUN-20260805-cuatro-400-invisibles]]
> Los 4 sitios cubiertos: `ReportsPage` saca `error` de las 5 queries y lo pinta en un banner; `UsersPage` manda **solo** la credencial del rol seleccionado (así el 400 nunca cae en un input desmontado) y `handleReset` ya tiene `try/catch`; el Zod de `ProfilePage` exige `correo` para ADMIN. typecheck EXIT=0, build ✓. Residual de plomería compartida → [[FRONT-20260805-falta-capa-compartida-de-errores]].

# FRONT-20260805-cuatro-400-invisibles — Cuatro sitios donde el front recibe un 400 y no lo muestra

**Tipo:** bug de UX / error silencioso · **Consolida:** [[USERS-20260804-error-400-campo-no-montado]] + el residual de [[RUN-20260804-hardening-params-fecha]]

## La invariante
> Un 400 del servidor **siempre** llega al usuario. Si el backend se tomó el trabajo de explicar qué está mal, la UI no puede tragárselo.

[[FRONT-20260802-errores-400-silenciados]] cerró el caso general con `applyServerErrors`/`getServerErrorMessage`. Estos cuatro se le escaparon porque **no son el caso general**: el helper funciona, pero el mensaje cae donde nadie lo pinta.

## Los cuatro sitios

### 1. 🆕 `ReportsPage` no mira `isError` en ninguna query
`ReportsPage.tsx:487-491` destructura las 5 queries como `{ data, isFetching }`. Desde el hardening de params, un rango personalizado de **más de 366 días** (elegible con el date picker, `customStart`/`customEnd` en `:459-460`) responde **400** — y el usuario ve el dashboard **vacío, sin explicación**, con los charts en blanco. Igual con un rango invertido.
Este lo creamos nosotros: antes ese rango daba un 200 lento y enorme.

### 2. El error de un campo **no montado** es invisible (`UsersPage`)
El input de `correo` y el de `cedula` solo se montan en la rama del rol seleccionado (`UsersPage.tsx:364,370` crear · `:471,477` editar), pero el payload manda ambos si tienen valor y RHF conserva el valor de un campo desmontado. Un 400 `{"cedula": "Ya existe un cajero…"}` con `rol==='ADMIN'` hace `setError('cedula')` **sin span que lo pinte** → el submit falla sin feedback. Simétrico con `correo` cuando `rol==='CAJERO'`.

### 3. `handleReset` llama `.unwrap()` sin `try/catch`
`UsersPage.tsx:169-170`. Promesa rechazada no capturada: si el reset de contraseña falla, el admin no se entera.

### 4. El Zod de `ProfilePage` acepta lo que el backend ya rechaza
`infoSchema` (`ProfilePage.tsx:14-17`) acepta la cadena vacía para `correo` (`.or(z.literal(''))`) y el submit la manda siempre. Desde [[RUN-20260804-invariante-correo-admin]] el backend responde **400** a un ADMIN que vacíe el correo. El error **sí se ve** (`fieldError`, `:104-107`), así que es el menos grave: solo un round-trip evitable. El Zod debería condicionar `correo` como requerido cuando el usuario logueado es ADMIN — el mismo `superRefine` que ya se hizo en `UsersPage`.

## Criterio de aceptación
1. Un 400 de cualquier query de `ReportsPage` se muestra (banner/estado de error), con el mensaje real del backend.
2. Un 400 sobre un campo no montado en `UsersPage` se ve igual (limpiar el campo del rol contrario antes de enviar, o un fallback que pinte los errores sin span propio).
3. `handleReset` maneja el error.
4. El Zod de `ProfilePage` exige `correo` para ADMIN antes de enviar.

## Notas para el Dev
- Reusar `getServerErrorMessage` (`src/utils/applyServerErrors.ts`) para el caso no-formulario de `ReportsPage`, igual que hizo el POS.
- Ver [[patron-errores-drf-rtk]]. No romper el `superRefine` ni la política de password ya entregados.
