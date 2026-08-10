---
tags: [prompt, front, forms, errores, fix]
status: 🔴
module: _transversal
updated: 2026-08-05
---

# Prompt DEV — Cuatro 400 que el front recibe y no muestra

**Tarea backlog:** [[FRONT-20260805-cuatro-400-invisibles]]
**Alcance:** una invariante, 3 archivos del front. **Solo front.** No git, no backend.

## La invariante

> Un 400 del servidor **siempre** llega al usuario. Si el backend se tomó el trabajo de explicar qué está mal, la UI no puede tragárselo.

[[FRONT-20260802-errores-400-silenciados]] ya dejó los helpers (`applyServerErrors` para formularios RHF, `getServerErrorMessage` para lo que no es formulario, ambos en `src/utils/applyServerErrors.ts`). **No los cambies: usalos.** Estos cuatro sitios se escaparon porque el helper funciona pero el mensaje cae donde nadie lo pinta.

---

## 1. 🔴 `ReportsPage` no mira `isError` en ninguna query (el más visible)

`ReportsPage.tsx:487-491` — las 5 queries se destructuran como `{ data, isFetching }`, sin `isError`/`error`:

```ts
const { data: summary,      isFetching: s1 } = useGetSummaryQuery({ fecha_inicio: fechaInicio, fecha_fin: fechaFin })
const { data: topProductos, isFetching: s3 } = useGetTopProductosQuery({ …, limit: 10 })
const { data: ventasPorHora, isFetching: s2 } = useGetVentasPorHoraQuery({ fecha: fechaInicio }, { skip: … })
const { data: ventasPorDia }                  = useGetVentasPorDiaQuery({ … }, { skip: … })
const { data: salesDetail }                   = useGetSalesDetailQuery({ … }, { skip: … })
```

Desde el hardening de params del backend, el rango personalizado (`customStart`/`customEnd`, `:459-460`) puede producir **400** en dos casos reales y elegibles con el date picker:
- rango de **más de 366 días** → `{"fecha_fin": "El rango no puede superar 366 días (pediste N)."}`
- rango **invertido** → `{"fecha_inicio": "La fecha de inicio (…) no puede ser posterior a la fecha final (…)."}`

Hoy el usuario ve **el dashboard vacío, sin ninguna explicación**, con los charts en blanco.

**Qué hacer:** sacá `error` de las queries (al menos de las que no están `skip`eadas en el modo activo), pasalo por `getServerErrorMessage(err, fallback)` y mostrá el mensaje real en un banner sobre el contenido. El backend ya manda el texto exacto y en español: **mostralo, no lo reemplaces por uno genérico.** Si hay varias queries en error, con mostrar el primer mensaje alcanza.

## 2. El error de un campo **no montado** es invisible (`UsersPage`)

El input de `correo` y el de `cedula` solo se montan en la rama del rol seleccionado (`UsersPage.tsx:364,370` crear · `:471,477` editar), y cada span `ta-field-error` vive dentro de su rama. Pero el payload manda ambos campos si tienen valor y react-hook-form **conserva** el valor de un campo desmontado (`shouldUnregister` es `false` por defecto).

Un 400 `{"cedula": "Ya existe un cajero con esta cédula en este negocio."}` con `rol === 'ADMIN'` hace `setError('cedula')` y **no hay span montado que lo pinte** → el submit falla sin feedback. Simétrico con `correo` cuando `rol === 'CAJERO'`.

**Qué hacer:** elegí una y aplicala a los dos modales (crear y editar):
- limpiar el campo del rol contrario del payload antes de enviar (mi preferida: además evita que el backend reciba datos que no aplican al rol), **o**
- un fallback que pinte cualquier error cuyo campo no tenga span propio.

## 3. `handleReset` llama `.unwrap()` sin `try/catch`

`UsersPage.tsx:169-170`:
```ts
async function handleReset(id: string) {
  const r = await resetPassword(id).unwrap()
```
Promesa rechazada no capturada: si el reset falla, el admin no se entera. Envolvelo y mostrá el error (toast con `getServerErrorMessage`).

## 4. El Zod de `ProfilePage` acepta lo que el backend ya rechaza

`infoSchema` (`ProfilePage.tsx:14-17`) acepta la cadena vacía para `correo` (`.or(z.literal(''))`) y el submit la manda siempre (`:66`). Desde el fix de la invariante de correo, el backend responde **400** a un ADMIN que vacíe el correo.

Es el menos grave: el error **sí se ve** (`fieldError`, `:104-107`), o sea es solo un round-trip evitable. Pero es la misma divergencia que ya cerraste en `UsersPage`.

**Qué hacer:** condicioná `correo` como requerido cuando el usuario logueado es ADMIN, con el mismo patrón `superRefine` de `UsersPage.tsx:35-49` y el mensaje **literal** del backend (`"El correo es obligatorio para administradores."`). El rol sale de `user?.rol` del store, igual que ya hace `makePasswordSchema` (`:91`).

---

## Restricciones
- **Solo front**, y solo estos 3 archivos: `ReportsPage.tsx`, `UsersPage.tsx`, `ProfilePage.tsx`. **Nada de backend.**
- **No modifiques** `src/utils/applyServerErrors.ts` — los helpers están bien, es cuestión de usarlos. Si creés que hay que tocarlos, pará y reportá.
- No rompas lo ya entregado: el `superRefine` por rol de `UsersPage`, `makePasswordSchema` de `ProfilePage`, ni los `catch` que ya usan `applyServerErrors`.
- Diseño: clases `ta-*` directas (`ta-field-error` para campos; para el banner de reports mirá cómo lo resuelve el POS con `saleError`). **No crees un `.module.css` nuevo.**

## Entregable / verificación
1. `npm run typecheck` → limpio (pegá la salida).
2. `npm run build` → OK (pegá la última línea).
3. Levantá el front y pegá **qué se ve** en cada caso:

| # | Cómo reproducir | Esperado |
|---|---|---|
| 1 | Reports → periodo "personalizado" → rango de 2+ años | banner con `El rango no puede superar 366 días (pediste N).` |
| 2 | Reports → rango invertido (fin antes que inicio) | banner con el mensaje del backend |
| 3 | Reports → rango válido | **sin banner**, dashboard normal (regresión) |
| 4 | Usuarios → crear ADMIN con un correo que ya existe | error visible bajo `correo` (regresión: esto ya andaba) |
| 5 | Usuarios → editar un ADMIN cuya cédula guardada choca con la de un cajero | el 400 de `cedula` **se ve** (era invisible) |
| 6 | Usuarios → botón de restablecer contraseña con el backend caído | error visible, no falla mudo |
| 7 | Mi Perfil como ADMIN → borrar el correo → Guardar | el form **bloquea antes de enviar**, error bajo `correo` |
| 8 | Mi Perfil → cambiar solo el nombre | **200**, sigue funcionando (regresión) |

4. Veredicto ✅ / 🔴.

**Doble actualización:** en `el_vuelto_frontend/CLAUDE.md`, en la sección del patrón de errores de formulario, anotá (a) que un `setError` sobre un campo **no montado** no se ve y cómo se resolvió, y (b) que las pantallas que no son formulario (POS, Reports) muestran el 400 con `getServerErrorMessage` en un banner.

> [!warning] Si algo no cuadra
> Pará y reportá con `archivo:línea`. Las anclas se verificaron el 2026-08-05 contra el disco, pero el código manda.
