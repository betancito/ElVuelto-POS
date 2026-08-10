---
tags: [corrida, front, forms, errores]
status: 🟢 corrido-ok
module: _transversal
updated: 2026-08-05
---

# RUN 2026-08-05 — Los cuatro 400 invisibles del front

**Prompt:** [[PROMPT-FIX-FRONT-20260805-cuatro-400-invisibles]] · **Tarea:** [[FRONT-20260805-cuatro-400-invisibles]]
**Veredicto:** ✅ PASÓ

> [!warning] Alcance de mi verificación — sé honesto con esto
> Los 8 casos del criterio son **visuales** (¿aparece el banner?, ¿se ve el error?) y no puedo manejar un navegador. Verifiqué: `mtime`, alcance, **lectura completa del diff**, `npm run typecheck` (**EXIT=0**), `npm run build` (**✓ built in 4.99s**), y la afirmación técnica que el Dev usó para justificar su diseño. La comprobación visual queda en el reporte del Dev, que no adjuntó. El código es correcto por lectura; no lo vi correr en pantalla.

## Diff entregado
`ReportsPage.tsx`, `UsersPage.tsx`, `ProfilePage.tsx` + `el_vuelto_frontend/CLAUDE.md` (20:34–20:39). **Backend intacto** (0 archivos `.py` del 08-05) y **`applyServerErrors.ts` sin tocar** (mtime 08-03) — las dos restricciones duras, respetadas.

## Los 4 sitios

| # | Sitio | Cómo quedó |
|---|---|---|
| 1 | `ReportsPage` sin `isError` | Saca `error` de **las 5** queries, toma el primero y lo pinta en un banner sobre el contenido |
| 2 | 400 en campo no montado (`UsersPage`) | **Prevención**: solo viaja la credencial del rol seleccionado (`data.rol === 'CAJERO' ? cedula : undefined`), en crear **y** en editar |
| 3 | `handleReset` sin `try/catch` | `try/catch` + `toast.error(getServerErrorMessage(...))` |
| 4 | Zod de `ProfilePage` | `makeInfoSchema(rol)` con `superRefine`: ADMIN exige `correo`, mensaje literal del backend |

### 👏 Encontró una sutileza que yo no había visto — y la verifiqué
El Dev no pudo usar `getServerErrorMessage` a secas para reports y explicó por qué: **solo conoce las claves del endpoint de ventas**. Lo comprobé leyendo `applyServerErrors.ts:80-98` — su prioridad es `items` → `monto_recibido` → `non_field_errors` → `detail`. Un 400 de reports viene keyed por `fecha_inicio`/`fecha_fin`/`fecha`/`limit`, así que habría caído al fallback genérico y escondido la explicación real.

Su solución: un `reportErrorMessage()` local que lee esas claves primero y **delega al helper compartido** para todo lo demás. Dado que le prohibí tocar `applyServerErrors.ts`, componer encima en vez de modificarlo es la respuesta correcta. (Que el helper sea específico de ventas es deuda de diseño, no de esta corrida → [[FRONT-20260805-falta-capa-compartida-de-errores]]).

### Sobre la opción elegida en el sitio 2
De las dos que ofrecí, tomó la de **prevención** (no mandar el campo del rol contrario). Es la mejor: además de que el 400 ya no puede caer en un input invisible, deja de enviarle al backend datos que no aplican al rol. Y es coherente con el fix de `patch-nulifica`: una clave omitida conserva su valor guardado, así que editar un ADMIN no le borra una cédula que tuviera.

## Verificación ejecutada
- `npm run typecheck` → **EXIT=0**
- `npm run build` → **EXIT=0**, `✓ built in 4.99s`
- `react-toastify` es dependencia real (`package.json:28`) y el import coincide con el patrón de `PosPage`, `InventoryEntryPanel` y `super-admin/tenants`.

## Doble actualización
`el_vuelto_frontend/CLAUDE.md` — tres párrafos nuevos: (a) *"A `setError` on a field that is not mounted is invisible"* con la regla general (mandá solo los campos de la rama activa), (b) las superficies no-formulario (POS y Reports) y por qué Reports necesita su lector de claves propio, (c) *"Never leave a bare `.unwrap()`"*. Honesto además sobre el estilo inline del banner.

## Checklist de trampas
**#6 diseño** 🟡 usa `ta-field-error` y **no** creó `.module.css` (regla dura respetada), pero el banner va con estilos inline porque **no existe una clase `ta-*` de alerta** — ver residual · **#7 errores 400** ✅ es el objeto del prompt · **#8 validación divergente** ✅ el Zod de perfil ya es espejo del backend · **#11** ✅ sin git, sin backend, sin scope creep.

## 🟡 Residual
1. **El sistema de diseño no tiene banner de error.** Ya van dos implementaciones: `pos-error-banner` (CSS propio del POS) y ahora los inline de Reports, ambos con los mismos tokens `--error-container`/`--on-error-container`. Falta un `ta-alert`/`ta-alert--error` en `tenant-admin.css`.
2. **`getServerErrorMessage` es específico de ventas.** Su lista de claves está cableada; cada superficie nueva necesita su propio lector. Generalizarlo (p. ej. caer al primer valor string del body) eliminaría los wrappers locales.
→ Ambos en [[FRONT-20260805-falta-capa-compartida-de-errores]].
