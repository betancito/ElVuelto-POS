---
tags: [tarea, users, forms]
status: 🟢
prioridad: media
updated: 2026-08-05
---

> [!info] Cerrado 2026-08-05 vía [[FRONT-20260805-cuatro-400-invisibles]]
> Los 3 problemas de esta ficha son la misma invariante que el 400 invisible de `ReportsPage` que dejó [[RUN-20260804-hardening-params-fecha]]. Se entregan juntos en [[PROMPT-FIX-FRONT-20260805-cuatro-400-invisibles]]. Esta ficha queda como detalle de los sitios 2–4; el estado vivo está en la otra.

# USERS-20260804-error-400-campo-no-montado — El 400 de un campo desmontado no se ve

**Tipo:** bug de UX / error silencioso · **Descubierto:** review de [[RUN-20260804-zod-requeridos-por-rol]] (2026-08-04)

## Problema
En `UsersPage`, el input de `correo` y el de `cedula` **solo se montan en la rama del rol seleccionado** (`UsersPage.tsx:360-372` crear, `:467-479` editar), y cada span `ta-field-error` vive dentro de su rama. Pero el payload manda **ambos** campos si tienen valor (`:119-120`, `:159-160`) y react-hook-form conserva el valor de un campo desmontado (`shouldUnregister` es `false` por defecto).

Resultado: si el backend responde 400 con `{"cedula": "Ya existe un cajero con esta cédula en este negocio."}` (`serializers.py:190`) mientras `rol === 'ADMIN'`, `applyServerErrors` hace `setError('cedula')` pero **no hay span montado que lo pinte** → el submit falla sin ningún feedback. Simétrico con `correo` (`serializers.py:184`) cuando `rol === 'CAJERO'`.

Es la contracara del cierre de [[FRONT-20260802-errores-400-silenciados]]: el helper funciona, pero el error cae en un campo invisible.

## Problema 2 (mismo archivo, misma familia)
`handleReset` (`UsersPage.tsx:169-183`) llama `.unwrap()` **sin `try/catch`** → promesa rechazada no capturada; si el reset falla, el admin no se entera.

## Problema 3 — `ProfilePage`: el Zod acepta lo que el backend ahora rechaza
_(añadido 2026-08-04, tras [[RUN-20260804-invariante-correo-admin]])_

`infoSchema` acepta explícitamente la cadena vacía para `correo` (`ProfilePage.tsx:15`, `.or(z.literal(''))`) y el submit la manda siempre (`:66`). Desde el fix de la invariante, el backend responde **400** a un ADMIN que vacíe el correo. El error **sí se muestra** (`fieldError` en `:104-107`), así que no es silencioso — es un round-trip evitable. Es el mismo patrón que cerró [[USERS-20260802-zod-requeridos-por-rol]], pero en la otra pantalla: el Zod debe condicionar `correo` como requerido cuando el usuario logueado es ADMIN.

## Criterio de aceptación
1. Un 400 sobre un campo no montado se muestra igual (limpiar el campo del rol contrario antes de enviar, o renderizar un fallback que pinte los errores sin span propio).
2. `handleReset` maneja el error con `applyServerErrors`/toast.

## Notas para el Dev
- Ver [[patron-errores-drf-rtk]]. No tocar el `superRefine` ya entregado.
