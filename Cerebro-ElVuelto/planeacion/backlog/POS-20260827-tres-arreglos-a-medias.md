---
tags: [tarea, pos, sales, desktop, ux, impresion, regresion]
status: 🟢
prioridad: alta
updated: 2026-08-27
---

> [!done] 1 y 2 CERRADOS el 2026-08-27 (tercera pasada). Queda abierto el 3 (el rollo).
> El owner pidió terminar las tareas 1 y 3 de la noche de la caja. Las dos quedaron hechas,
> con revisión adversarial propia (6 lentes + escépticos) que **encontró un bug nuevo en el
> propio arreglo** — ver abajo.
>
> **Y el 3 se cerró esa misma noche**, cuando el dueño probó contra su térmica real y el recibo
> salió recortado: el arreglo del alto era parte de la solución. Los tres puntos quedaron cerrados.

# POS-20260827-tres-arreglos-a-medias — Lo que la revisión adversarial dio por cerrado y no lo estaba
> [!done] Los TRES quedaron cerrados el 2026-08-27.

> [!danger] Nacen de una re-verificación, no de un pedido nuevo
> La sesión de la madrugada del 2026-08-27 se quedó sin tokens antes de anexar el resultado de su
> revisión adversarial al [[RUN-20260827-caja-adulto-mayor-y-recibo]], pero alcanzó a escribir en el
> [[00-INDEX]] que estaba **"Todo corregido"**. Al re-verificar contra el código real (7 verificadores +
> 1 escéptico cada uno), **3 de los 7 arreglos no cierran el caso que decían cerrar**. Detalle completo
> con anclas: la sección "Resultado" del RUN.

## 1. ✅ CERRADO — El toque que despierta ya no agrega un producto
**Falla justo con el gesto del usuario para el que se rediseñó toda la caja.**

- `IdleScreensaver.tsx:126` — el `preventDefault()` sobre `pointerdown` **no aporta nada**: por
  **Pointer Events L3**, cancelar `pointerdown` suprime `mousedown`/`mouseup` pero **no** el `click` de
  compatibilidad. O sea que el tragador es la *única* defensa, no la segunda.
- `IdleScreensaver.tsx:140` — los 400 ms se cuentan **desde el `pointerdown`, no desde el `pointerup`**.
  Un toque deliberado y sostenido ~450-500 ms (lo normal en un adulto mayor sobre pantalla táctil)
  suelta cuando `tragarClick` ya se removió → el `click` aterriza en `ProductGrid.tsx:39` y **el
  producto entra al carrito**.

**Arreglado así:** la ventana se ató al **gesto**, no al reloj — se cierra `GRACIA_TRAS_SOLTAR_MS`
(400 ms) después del `pointerup`/`pointercancel` del mismo `pointerId`; la red de seguridad de 5 s
**se renueva si el dedo sigue abajo** (si no, un toque de 8 s volvía a dejar pasar el click).

> [!danger] La revisión adversarial encontró un bug NUEVO en este arreglo — tres lentes por separado
> La primera versión del arreglo llamaba a `cerrar()` dentro de `tragarClick`, o sea que el tragador
> era **de un solo tiro**. En un **doble toque** (down1·up1·click1·down2·up2·click2) el click1 lo
> desarmaba y **el click2 pasaba limpio**: el fantasma volvía por la puerta de al lado, y justo con
> el hábito de quien viene del escritorio — el perfil de esta caja. Peor: el overlay es
> `inset: 0; z-index: 9999`, así que un doble toque en la esquina superior derecha caía sobre
> `pos-header__close-btn` → `dispatch(logout())`, **cerrando el turno**.
> Arreglado quitando el `cerrar()`: la ventana la cierra **solo el reloj**.

**Banco de pruebas nuevo:** `el_vuelto_frontend/scripts/probar-tragador-reposo.mjs` — cero
dependencias, extrae el **texto real** de la función y lo corre contra un DOM mínimo con reloj
virtual. 8 casos: toque simple, doble toque, sostenido 600 ms, sostenido 8 s, `pointercancel`, otro
`pointerId`, no-sobre-tragar un click legítimo, y dos despertares seguidos.
**Está validado como test:** contra la versión del 1er intento da **4 fallos de 8**; contra la del
2º intento, **1 de 8**; contra la actual, **8/8**. Un test que pasa con el código roto no sirve, y
este distingue.

## 2. ✅ CERRADO — `SuccessModal`: el botón principal ya no cae bajo el fold
El `position: sticky` de `pos.css:1972-1973` sujeta solo `.pos-success-modal__acciones` — los **dos
botones secundarios** (Imprimir Recibo / Enviar WhatsApp). **"Nueva Venta"** (`SuccessModal.tsx:179`),
que es el botón primario y el que el cajero usa en cada venta, queda en flujo normal más arriba.

Como `ReceiptPreview.tsx:71` mapea **todos** los ítems sin tope, una venta en efectivo con vuelto y 4
ítems da ≈**767px contra 736 disponibles**: con `scrollTop=0` la barra sticky opaca ocupa 656..736 y
Nueva Venta cae en 612..687 → **tapado por la propia barra que se agregó para arreglarlo**.

> [!info] De paso: el diagnóstico original era falso
> `git show HEAD:…/SuccessModal.tsx` prueba que `maxHeight: '90vh'` y `overflowY: 'auto'` **ya
> existían**. La frase "no tenía max-height ni scroll" describe **otro** modal, el `.pos-cash-modal`
> (`pos.css:870`). Y `calc(100dvh - 2rem)` = 736px es *más* que `90vh` = 691px: ese `!important` da más
> aire, no scroll nuevo.

**Arreglado así:** las **tres** acciones se envolvieron en un `.pos-success-modal__footer` y **ese**
es el que va `position: sticky; bottom: 0`. Además el recibo (`.pos-success-modal__recibo`) cede
margen a 820 px y trae **scroll propio a 700 px** (`max-height: 34vh`), para que el modal deje de
crecer con cada ítem del ticket.

> [!info] Un segundo hallazgo de la revisión, también arreglado
> El footer llevaba `margin: 0 -1.5rem -1.25rem` y el margen inferior negativo dejaba una **franja de
> 20 px** al fondo por donde se veía pasar el recibo al desplazarse. Se quitó el margen inferior y el
> padding de abajo lo aporta ahora el footer (`.pos-success-modal { padding: 1.25rem 1.5rem 0 }`).
> De paso: el comentario del JSX que decía que `__acciones` era el gancho del pegado **quedó
> mintiendo** (esa clase ya no lleva reglas) y se reescribió.

## 3. ✅ CERRADO — El rollo: ya mide el recibo, no el viewport
> [!done] Cerrado el 2026-08-27 (cuarta pasada), junto con el recorte en la térmica real.
> `altoDelReciboEnMicrones` usa `document.body.getBoundingClientRect().height`; la ventana oculta se
> crea con ancho explícito. Medido con Electron 44: **164.2mm reales** contra los **238.1mm** que
> devolvía el método viejo. Detalle en [[patron-impresion-recibos]].
`main.js:137` usa `Math.max(documentElement.scrollHeight, body.scrollHeight)` y, por **CSSOM**,
`documentElement.scrollHeight` **nunca baja del alto del viewport**. La ventana oculta se crea **sin
width/height** (`main.js:169-172`) → default 800×600 → viewport ~568px, que queda de **piso constante**.

Medido de verdad (el escéptico corrió Electron 44 con el mismo constructor): contenido **146px
(~4,3 cm)** → la función devolvió **568px = 154,3 mm**. Solo un recibo de más de ~568px (≈10+ ítems) se
mide bien — justo el caso raro.

| | mm por recibo | metros/día (200 ventas) |
|---|---|---|
| antes (clavado en A4) | 297 | 59,4 |
| **hoy** | **154,3** | **≈28,5** |
| midiendo de verdad | ~109 | ≈21,8 |

→ El ahorro es real pero es **≈28,5 m/día, no los ~34 m** que se escribieron. Y `MIN = 40000`
(`main.js:132`) es **código muerto**: el valor jamás baja de 154 mm.

**Arreglo propuesto:** usar solo `document.body.scrollHeight` (o `getBoundingClientRect().height` del
body), o darle un alto chico a la ventana oculta.

## Anclas
- `el_vuelto_frontend/src/components/ui/IdleScreensaver.tsx:126,140`
- `el_vuelto_frontend/src/features/sales/components/SuccessModal.tsx:179` · `pos.css:1956-1975`
- `el_vuelto_frontend/src/features/sales/components/ReceiptPreview.tsx:71`
- `el_vuelto_desktop/app/main.js:132,137,169-172,189`

## Enlaces
[[RUN-20260827-caja-adulto-mayor-y-recibo]] · [[POS-20260827-caja-1366x768-y-reposo]] ·
[[ADR-POS-20260827-caja-para-adulto-mayor-en-1366x768]] · [[POS-20260827-escaner-activo-con-modales]]
