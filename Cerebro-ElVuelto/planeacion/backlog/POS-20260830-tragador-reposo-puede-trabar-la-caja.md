---
tags: [tarea, pos, sales, ux, regresion, reposo]
status: 🔴
prioridad: alta
updated: 2026-08-30
---

# POS-20260830-tragador-reposo-puede-trabar-la-caja — el arreglo del toque puede dejar el POS sin responder

> [!danger] Es una REGRESIÓN del arreglo del 2026-08-27, y falla peor que el bug que arregló
> El bug original metía **un producto de más** al carrito. Esta regresión deja **toda la caja sin
> responder a ningún toque ni click**, sin auto-curación, hasta recargar la página. La versión vieja
> se curaba sola a los 5 s; la "corregida" no.

## Cómo nace
Sale de la re-verificación adversarial del PASO 0 del 2026-08-30 (un escéptico contra el veredicto
"los tres arreglos están cerrados"). El arreglo #1 de [[POS-20260827-tres-arreglos-a-medias]] ató la
ventana del tragador al **gesto** en vez del reloj, y de paso hizo que la red de seguridad de 5 s
**se renueve mientras el dedo siga abajo**. Ese "mientras el dedo siga abajo" es el problema.

## El defecto, con anclas
- `el_vuelto_frontend/src/components/ui/IdleScreensaver.tsx:168` — `let dedoAbajo = true`.
- `:182-183` — `dedoAbajo` pasa a `false` **solo** dentro de `alSoltar`, y `alSoltar` arranca con
  `if (ev.pointerId !== pointerId) return`. O sea: solo el `pointerup`/`pointercancel` **del mismo
  `pointerId`** lo baja.
- `:207-213` — `const vencer = () => { if (dedoAbajo) { temporizador = setTimeout(vencer, RED_DE_SEGURIDAD_MS); return } cerrar() }`.
  Si `dedoAbajo` nunca baja, `vencer` se re-agenda **en cadena infinita** y `cerrar()` no corre jamás.
- `:176-179` + `:220` — mientras tanto sigue armado
  `window.addEventListener('click', tragarClick, { capture: true })` con
  `preventDefault() + stopPropagation()`, o sea que **se come TODOS los clicks del POS**.

## Por qué no se cura solo
- `PosPage.tsx:491` monta `IdleScreensaver` siempre: nunca se desmonta, así que el cleanup de
  `IdleScreensaver.tsx:232` no corre.
- La otra puerta es `limpiarTragadorRef.current?.()` en `:164`, que exige **volver a entrar en reposo**
  — y `pointermove` cuenta como actividad (`:32`), así que el cajero manoteando la pantalla resetea el
  contador de inactividad. Con `items.length > 0` el reposo además queda `disabled` (`PosPage.tsx:495`).
- Queda trabado hasta **recargar la página**. En el `.exe` en pantalla completa eso no es obvio.

## El escenario que lo dispara
Exactamente el que el propio archivo enumera en `IdleScreensaver.tsx:60-66` como razón de existir de la
red de seguridad: *"por si el `pointerup` nunca llega (el dedo sale del digitalizador, la ventana pierde
el foco, otro elemento captura el puntero)"*. La red se agregó para ese caso y el arreglo la volvió
**inalcanzable justo ahí**.

## El banco de pruebas no lo ve, y lo dice
`el_vuelto_frontend/scripts/probar-tragador-reposo.mjs` da **8/8** porque sus 8 casos disparan siempre
un `pointerup`/`pointercancel` con el `pointerId` correcto (`:111-166`), incluido el de "sostenido 8 s"
(`:133`). Su propio encabezado (`:19-21`) advierte: *"Si algún día pasa 8/8 con el código roto, el banco
está mintiendo."* Es literalmente el caso.

Con tres casos agregados (pointerup que nunca llega; 10 clicks en 5 minutos; `pointerup` de **otro**
`pointerId`) el mismo banco sale **1 pasa / 3 fallan, exit 1** — verificado en esta sesión extrayendo el
texto real de la función, igual que hace el banco original.

## Arreglo propuesto (a decidir por el owner)
Que la red de seguridad **cierre igual**, con o sin dedo abajo, pero con un tope de renovaciones (p. ej.
renovar como máximo 2 veces = 15 s) — o directamente un `cerrar()` duro a los N segundos. Un fantasma de
un producto es recuperable con un toque; una caja congelada, no. Y sumar al banco los tres casos de
arriba, que es lo que lo vuelve un test de verdad.

## Anclas
- `el_vuelto_frontend/src/components/ui/IdleScreensaver.tsx:60-66,164,168,176-179,182-183,207-213,220,232`
- `el_vuelto_frontend/src/features/sales/PosPage.tsx:491,495`
- `el_vuelto_frontend/scripts/probar-tragador-reposo.mjs:19-21,111-166`

## Enlaces
[[POS-20260827-tres-arreglos-a-medias]] · [[POS-20260827-caja-1366x768-y-reposo]] ·
[[ADR-POS-20260827-caja-para-adulto-mayor-en-1366x768]] · [[2026-08-30-planner-paso0-resync]]
