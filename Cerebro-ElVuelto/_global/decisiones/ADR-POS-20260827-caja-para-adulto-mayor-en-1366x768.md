---
tags: [adr, pos, sales, ux, impresion, desktop, global]
status: aceptado
updated: 2026-08-27
---

# ADR-POS-20260827 — La caja se diseña para un adulto mayor en 1366×768

## Contexto
El owner dejó cinco pedidos corriendo de noche y, al responder la ronda de preguntas, agregó la
restricción que en realidad las une todas:

> "esto sera manejado por adultos boomers colombianos que muchas veces la tecnologia los confunde"

Eso convierte cinco tareas sueltas en **un solo criterio de diseño**. Y explica por qué el POS venía
fallando: está construido con la densidad de una app de escritorio para alguien joven con mouse, sobre
un equipo POS de **1366×768** — la resolución más común del parque — manejado con el dedo.

Los números que lo prueban, medidos contra el código, no estimados:

| pieza | medía | mínimo táctil |
|---|---|---|
| `pos-cart__cancel-btn` (¡borraba la venta!) | **~24px** de alto, sin fondo | 44px |
| `pos-back-btn` (volver a categorías) | **~36px**, gris sobre gris | 44px |
| `.pos-cash-modal` (donde se digita el efectivo) | **~871px de alto** | 768px de pantalla |

El modal del efectivo no tenía `max-height` **ni scroll** (`overflow: hidden`) y el backdrop lo centra:
se recortaban ~50px arriba y ~50px abajo. Abajo vive el botón **Confirmar**. El cajero no podía verlo
ni alcanzarlo, y no existía forma de llegar a él. Esa es, textualmente, la queja del owner:
*"el modulo donde el usuario coloca el monto"* no se ve bien.

> [!warning] Las tres media queries que ya existían eran todas de ANCHO
> 1366px cae por encima del breakpoint de 1200px, así que el POS heredaba los paddings de escritorio
> (2rem por lado) sobre una pantalla de 768px de **alto**. El problema nunca fue el ancho.

## Decisión

1. **El presupuesto vertical se ataca por `@media (max-height: …)`, no por ancho.** Dos escalones:
   **820px** (cubre la pantalla completa a 768 y la ventana con barras del navegador a ~670) y
   **700px** (netbooks). El umbral se calibró **con** la barra Venta/Inventario presente, que solo se
   renderiza para el cajero líder y cuesta ~68px — calibrar sin ella dejaba justo al usuario más
   frecuente 68px optimista.

2. **Solo el catálogo de productos hace scroll.** Carrito, teclado, monto y TOTAL quedan siempre a la
   vista. Decisión explícita del owner sobre las otras dos opciones que se le ofrecieron.

3. **El botón Confirmar del modal de efectivo va `position: sticky` abajo.** Poner solo `max-height` +
   scroll no alcanza: el cajero cuenta la plata con el dedo y el botón quedaría bajo el fold, que es
   otra forma del mismo problema.

4. **Los billetes pasan a 3 columnas en pantalla baja.** Seis billetes en 2 columnas son 3 filas
   (~445px); en 3 columnas son 2 filas (~203px). **242px menos**, y con eso solo el modal baja de
   ~871px a ~629px y cabe entero. (El comentario del JSX ya decía *"3-col grid"*; el CSS nunca lo
   cumplió.)

5. **Ninguna acción destructiva sin confirmación, y la confirmación LISTA lo que se pierde.**
   "¿Estás seguro?" no dice qué se destruye; la lista sí. En el modal la salida segura va **primera y
   más grande**, y los botones dicen qué hacen ("No, seguir vendiendo" / "Sí, vaciar todo") en vez de
   "Aceptar"/"Cancelar" — con esas dos palabras, "Cancelar" en un diálogo sobre cancelar una venta es
   una trampa.

6. **El reposo nunca puede costarle trabajo al cajero.** La guarda no es `items.length === 0`: incluye
   `posMode`, `showCashModal`, `showSuccessModal`, `showClearConfirm` y `saleError`. Ver abajo.

7. **El recibo abandona el monospace.** `pad()` rellenaba con espacios para alinear columnas, y **eso**
   era lo único que obligaba a Courier. Con filas flex el alineado es geométrico, así que se pasa a
   **Arial bold**, que deposita bastante más tinta en el mismo cabezal. Efecto colateral: los nombres
   de producto dejan de truncarse a 16 caracteres.

8. **El `.exe` abre en pantalla completa, pero NO es kiosko.** F11 sale (el menú es a medida y no traía
   los roles por defecto de Electron, así que F11 no hacía nada). **Escape no se captura**: la webapp
   lo usa para cerrar modales y robárselo sacaría al cajero de fullscreen sin querer.

## Las tres trampas que decidieron el diseño, y no eran obvias

### a) El salvapantallas iba a tapar información irrecuperable
`handleCobrar` hace `dispatch(clearCart())` **antes** de abrir el `SuccessModal`. O sea que el carrito
queda vacío justo mientras el cajero lee el vuelto y el aviso de **stock negativo** — y ese aviso
**solo viene en la respuesta del POST**, nunca en `list`/`retrieve`. Con una guarda de
`items.length === 0`, el reposo lo habría tapado y esa información se perdía para siempre.
Por eso `showSuccessModal` está en la guarda.

### b) El modo inventario no lo cubre ninguna guarda de carrito
Con `posMode === 'inventory'`, la cantidad a medio teclear vive en estado **local** de
`InventoryEntryPanel` y el producto elegido en `PosPage`. Ninguno de los dos está en `state.pos.items`.
Regla adoptada: **nunca dormir si `posMode !== 'sale'`.**

### c) El escáner de códigos de barras es un teclado
El POS escucha `keydown` en `document` y acumula caracteres con un timer de 300ms. Si un escaneo sobre
la pantalla dormida despertara **y además** dejara pasar las teclas, los primeros caracteres ya se
habrían perdido en el despertar y al buffer le entraría un **código mutilado**: producto equivocado, o
ninguno, sin que el cajero entienda por qué. El overlay escucha en `window` en fase de **captura** —
que corre antes que `document` en burbujeo — y **descarta** el evento. El escaneo solo despierta.

## Alternativas descartadas
| opción | veredicto |
|---|---|
| Que nada haga scroll y todo se comprima | ❌ Con muchos productos las tarjetas quedan demasiado chicas para un dedo. El owner eligió que scrollee el catálogo |
| `location.reload()` al despertar | ❌ El carrito **no está persistido** (`store.ts` solo persiste auth): recargar lo destruye. Por eso es refetch |
| Interceptar la acción `clearCart` (middleware o wrapper) | ❌ `handleCobrar` usa la misma acción para cerrar una venta exitosa; interceptarla rompe el post-venta. Se intercepta solo el `onClear` de `CartPanel` |
| Modo kiosko en el `.exe` | ❌ El owner ya lo había descartado explícitamente al evaluar la app de escritorio |
| Agrandar solo la fuente del recibo | ❌ El problema principal no era el tamaño sino el **gris** (`#444`, `#777`) y el peso: una térmica no tiene medios tonos, simula el gris salteando puntos |

## Consecuencias
- ✅ El modal del efectivo cabe entero y Confirmar está siempre a la vista.
- ✅ Los dos botones que estaban por debajo del mínimo táctil pasan a 48px y 44px, con contraste real.
- ✅ Vaciar el carrito pasa de un toque sin red a un toque + confirmación con lista.
- ⚠️ **Nada de esto se pudo ver en pantalla**: no hay navegador en este entorno. La garantía es
  aritmética escrita + `typecheck` + `build` + verificación del bundle. **Falta el ojo del owner.**
- ⚠️ El escáner **sigue activo con modales abiertos** (solo se inhibe si el foco está en un input). Es
  preexistente y no se tocó; ver [[POS-20260827-escaner-activo-con-modales]].
- 📌 `height: 100vh` en `.pos-root` se **dejó como estaba** a propósito. Cambiarlo a `100dvh` mejoraría
  el navegador móvil pero es una decisión aparte, fuera del alcance de esta noche.

### Decisión adicional que salió esa noche: el alto de página del rollo lo mide el wrapper
No estaba en el pedido; salió al tocar el recibo. La opción **"Forzar 80 mm"** del wrapper fijaba
`pageSize.height` en **297 000 µm (A4)**, o sea ~30 cm de rollo térmico por cada recibo, midiera lo que
midiera el contenido. **Se decide que el alto lo mida el propio wrapper en tiempo de impresión**
(`main.js:189` → `altoDelReciboEnMicrones`), en vez de clavarlo.

Es una decisión de diseño, no un detalle de corrida: define **quién** es responsable del alto de página.
El `@page { size: 80mm auto }` del HTML (`generateReceipt.ts:117`) dice "auto", pero Electron necesita un
número concreto en `pageSize`, así que alguien tiene que calcularlo — y se decidió que sea el wrapper,
leyendo el DOM ya renderizado, no el frontend.

> [!warning] La implementación quedó a medias — re-verificado el 2026-08-27
> Mide **el viewport, no el recibo**: `Math.max(documentElement.scrollHeight, body.scrollHeight)`
> (`main.js:137`) nunca baja del alto del viewport, y la ventana oculta se crea **sin `width/height`**
> (`:169-172`) → default 800×600 → **piso constante de ~568px = 154,3 mm**. Comprobado corriendo
> Electron 44: un recibo de 146px (~4,3 cm) devolvió 154,3 mm.
> El ahorro es real —297 → 154,3 mm, ≈**28,5 m/día** con 200 ventas— pero **no** los ~34 m que se
> escribieron, y midiendo de verdad serían ≈21,8 m. `MIN = 40000` (`:132`) quedó como **código muerto**.
> Arreglo pendiente en [[POS-20260827-tres-arreglos-a-medias]].

### Estado real de la decisión, tras la re-verificación del 2026-08-27
De los 7 arreglos que la revisión adversarial dio por cerrados esa madrugada, **4 aguantan y 3 no**
(el [[00-INDEX]] alcanzó a decir "todo corregido" y era falso). Lo que sigue **abierto** y afecta a este
ADR: el toque que despierta **todavía agrega un producto al carrito**, y en el `SuccessModal` el botón
**"Nueva Venta" sigue cayendo bajo el fold**. O sea que dos de las promesas de arriba **no están
cumplidas todavía** — ver [[POS-20260827-tres-arreglos-a-medias]] y la sección "Resultado" del
[[RUN-20260827-caja-adulto-mayor-y-recibo]].

## Enlaces
[[RUN-20260827-caja-adulto-mayor-y-recibo]] · [[POS-20260827-caja-1366x768-y-reposo]] ·
[[ADR-DESKTOP-20260824-wrapper-electron-y-generador-manual]] ·
[[ADR-SALES-20260816-stock-negativo-permitido]] (el aviso que el reposo no debe tapar) ·
[[ADR-AUTH-20260816-teclado-numerico-staff-login]] (mismo criterio táctil, en el login) ·
[[POS-20260827-tres-arreglos-a-medias]] · [[patron-impresion-recibos]]
