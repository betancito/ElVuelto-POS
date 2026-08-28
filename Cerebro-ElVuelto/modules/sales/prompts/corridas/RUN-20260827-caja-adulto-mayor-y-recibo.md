---
tags: [corrida, run, pos, sales, ux, impresion, desktop]
status: 🟢
updated: 2026-08-27
---

# RUN-20260827 — La caja para el cajero real (5 tareas nocturnas)

Pedido directo del owner ([[GOBERNANZA]] §10), con una ronda de preguntas antes de arrancar y
ejecución autónoma toda la noche. Decisión:
[[ADR-POS-20260827-caja-para-adulto-mayor-en-1366x768]] · ficha:
[[POS-20260827-caja-1366x768-y-reposo]].

## Cómo se trabajó
El owner pidió explícitamente **una sola ronda de preguntas** antes de irse a dormir. Se le hicieron
cuatro, todas de las que cambian el trabajo:

| pregunta | su respuesta |
|---|---|
| Si el POS duerme con el carrito cargado, ¿qué pasa? | **Nunca dormir con carrito lleno** — y de paso pidió el vaciado de un toque y el botón de categorías |
| ¿Todo tiene que caber sin scroll en 1366×768? | **Catálogo con scroll, el resto fijo** |
| ¿Cuántos mm es el rollo? | **80 mm, seguro** |
| ¿Dónde se activa el reposo? | **Solo pantallas de cajero** |

De la primera respuesta salió una **quinta tarea** que no estaba en el pedido original, y la
restricción que ordena todas las demás: *"esto sera manejado por adultos boomers colombianos"*.

Antes de tocar código se corrió un **workflow de 6 lectores + 1 arquitecto** sobre el POS, el recibo y
el wrapper. Fue determinante: encontró tres defectos que la lectura directa no había visto y **corrigió
un cálculo mío que estaba mal** (ver abajo).

## Lo que estaba roto de verdad — medido, no estimado
| pieza | medía | debía |
|---|---|---|
| `.pos-cash-modal` | **~871px** de alto, sin `max-height` **ni scroll** (`overflow: hidden`) | caber en 768 |
| `pos-cart__cancel-btn` — **borraba la venta** | ~24px, sin fondo, sin confirmación | ≥44px + confirmar |
| `pos-back-btn` | ~36px, gris sobre gris | ≥44px |
| numpad flotante de cantidad | 311px, clamp **solo horizontal** | no salirse de pantalla |
| `.pos-cart__empty` | `flex:1` sin `min-height`, no cedía un píxel | dejar sitio al pago |

El modal del efectivo se recorta ~50px arriba y ~50px abajo porque el backdrop lo centra. **Abajo vive
el botón Confirmar**: el cajero no podía verlo ni alcanzarlo, y no había scroll para llegar. Esa es
literalmente la queja del owner.

Y las tres media queries que ya existían **eran todas de ancho**: 1366 cae por encima del breakpoint de
1200, así que el POS heredaba paddings de escritorio sobre una pantalla de 768 de **alto**.

## Los tres hallazgos del workflow que yo no había visto
1. **`.pos-cart__empty` no puede encogerse** → con el carrito **vacío** empuja el bloque de pago fuera
   del panel y corta el botón Cobrar. La clase la reusa además `InventoryEntryPanel`.
2. **El numpad flotante del carrito no tiene clamp vertical** (`top: rect.bottom + 8`, sin tope). Mide
   311px: en 768px, cualquier producto cuyo botón caiga por debajo de y≈441 lo abre **fuera de
   pantalla**, con la tecla ✓ de confirmar en la última fila. Como el carrito es una lista que
   scrollea, eso le pasaba a casi todos los productos menos los dos primeros.
3. **El salvapantallas iba a tapar información irrecuperable.** `handleCobrar` hace `clearCart()`
   **antes** de abrir el `SuccessModal`, así que el carrito queda vacío justo mientras el cajero lee el
   vuelto y el aviso de **stock negativo** — y ese aviso solo viene en la respuesta del POST. Con una
   guarda de `items.length === 0` se perdía para siempre.

> [!warning] El workflow también corrigió un cálculo mío que estaba mal
> Yo había puesto la tarjeta de producto en 12.5rem con imagen de 7rem para el breakpoint de 820px.
> Rehecha la cuenta: quedan **62px útiles contra 64px que necesitan** el nombre a dos líneas más el
> precio, y `.pos-product-card__body` tiene `overflow: hidden` — o sea que **el precio desaparecía en
> silencio**. Corregido a 13rem/6.75rem (74px útiles) y, en el breakpoint de 700px, a 12rem/6rem con el
> nombre a una línea.

## Qué se hizo, tarea por tarea

**T1 · 1366×768.** Dos bloques `@media (max-height: …)` nuevos (820 y 700), calibrados **con** la barra
Venta/Inventario presente porque solo se renderiza para el cajero líder y cuesta ~68px. `min-height: 0`
en los tres contenedores que debían scrollear y no podían. El modal del efectivo: `max-height`, cuerpo
con scroll, **Confirmar `position: sticky` abajo** y los 6 billetes a **3 columnas** (2 filas en vez de
3 → **242px menos**, que es lo que lo hace caber). De paso se quitó `opacity: 0.6` del botón
deshabilitado: siendo sticky sobre un área que scrollea, dejaba ver los billetes pasando por detrás.

**T2 · `.exe` en pantalla completa.** `fullscreen` al crear la ventana, pero **no en el primer arranque
si falta elegir impresora**: el setup es ventana hija y en Windows puede quedar detrás de un padre en
fullscreen. Se entra al cerrar el setup. Si se abre "Impresora…" ya estando en fullscreen, se sale y se
vuelve. **F11 no hacía nada** (el menú es a medida y no traía los roles de Electron): se agregó
`role: 'togglefullscreen'`. **Escape no se captura** a propósito — la webapp lo usa para cerrar modales.

**T3 · Modo reposo.** Componente nuevo con su CSS. 5 minutos, logo de El Vuelto, reloj y deriva lenta
contra el quemado de panel. La guarda tiene seis términos, cada uno tapando una forma distinta de
perderle trabajo al cajero: `rol`, `posMode`, `items.length`, `showCashModal`, `showSuccessModal`,
`showClearConfirm` y `saleError`. **Mover el mouse no despierta** (en una caja se roza todo el tiempo);
sí un toque o una tecla. El listener de teclado va en `window` en **captura** y **descarta** el evento:
el escáner de códigos es un teclado, y dejar pasar las teclas metía un código mutilado al buffer de
`PosPage`. Al despertar, `refetchProducts()` + `refetchCategories()` — **nunca `location.reload()`**,
que destruiría el carrito porque el slice `pos` no está persistido.

**T4 · Recibo térmico.** Reescrito. Se fue el logo del negocio, se fueron los grises (`#444`, `#777` —
una térmica no tiene medios tonos y los simula salteando puntos), todo queda bold y `#000`. Y la
palanca real: `pad()` rellenaba con espacios para alinear, y **eso** era lo único que obligaba a
Courier; con filas flex el alineado es geométrico, así que se pasó a **Arial bold**, que deja mucha más
tinta. Efecto colateral bueno: los nombres **dejan de truncarse a 16 caracteres**.

**T5 · Vaciar carrito.** Modal nuevo que **lista los productos**, muestra el total que se pierde y
**avisa que también se borra el efectivo ya digitado** (`clearCart` resetea `montoRecibido` y
`metodoPago`, cosa que el pedido no mencionaba). La salida segura va primera y más grande; los botones
dicen qué hacen. Escape siempre cancela. El botón del carrito pasa de "Cancelar" con una X a **"Vaciar"**
con ícono de barrer, de 24px a 44px, con fondo de error.

## Verificación con salida real
```
npx tsc --noEmit                    → exit 0
npm run build                       → ✓ built in 5.18s (1859 módulos)
```
- **Bundle auditado**, no solo el fuente: las dos media queries de alto están en el CSS compilado, el
  `position: sticky` del botón Confirmar también, y `opacity` ya **no** aparece en el modificador
  `--disabled`. La cascada computada da `pos-back-btn` **48px** y `pos-cart__cancel-btn` **44px**.
- **Recibo renderizado de verdad** (esbuild + node) y auditado: 0 `<img>`, 0 colores fuera de `#000`,
  0 truncamientos. **9 casos límite pasan**: 1 ítem, 30 ítems, cantidad >1, NEQUI sin cambio, tenant
  sin email ni teléfono, nombre de negocio larguísimo, monto de 7 cifras, `monto_recibido` nulo, y
  nombres con `<`/`&` (escapado correcto).
- **Contra el stack de Docker corriendo**: `/` y `/login/bambipan` → 200, el asset del salvapantallas
  `/logos/El_Vuelto_v2_NO_BG.png` → 200 (36 KB), los dos componentes nuevos compilan (Vite los sirve
  200, sin errores en los logs).
- **`.exe` regenerado** y verificado por dentro: `ARRANCAR_FULLSCREEN` y `togglefullscreen` están en
  `resources/app/main.js` del paquete.
- Se comprobó que **ningún ancestro crea containing block** (transform/filter/perspective sobre
  `html`/`body`/`#root`/`.pos-root`), que es lo que dejaría el overlay `fixed` recortado.

## Revisión adversarial
Se corrió un segundo workflow de **7 lentes independientes** (layout, reposo, vaciado, recibo, Electron
y **dos de Docker** — estos últimos pagando la deuda de [[GOBERNANZA]] §10.2 que había quedado abierta
en [[RUN-20260826-dockerizacion-stack]]), con **3 escépticos por hallazgo** en lentes distintos
(¿existe el mecanismo?, ¿se puede reproducir?, ¿es preexistente?). Un hallazgo sobrevive solo si menos
de 2 escépticos lo refutan.

### Resultado — anexado el 2026-08-27 en la sesión siguiente
La sesión de la madrugada se quedó sin tokens justo acá y dejó el `[!todo]`. Antes de copiar el
"todo corregido" que ya había alcanzado a escribir el [[00-INDEX]], se **re-verificó cada hallazgo
contra el código real** ([[GOBERNANZA]] §1): 7 verificadores independientes, cada uno con **un
escéptico detrás** cuyo único trabajo era encontrar el camino por donde el arreglo NO funciona.

**El resultado no confirma el índice.** De los 7 arreglos que se dieron por hechos, **4 aguantan y 3
no**. Los 3 tienen mecanismo real en el código —no son mentira— pero **ninguno cierra el caso que
decía cerrar**, y uno falla justo con el gesto del usuario para el que se diseñó.

| # | hallazgo | ¿el mecanismo está? | ¿aguanta al escéptico? |
|---|---|---|---|
| 1 | `restaurarFullscreen` variable muerta | ✅ aplicado | ✅ no refutado |
| 2 | `transform: scale()` no da alto | ✅ aplicado | ✅ no refutado |
| 3 | anti-escaneo se tragaba 1 de 13 teclas | ✅ aplicado | ✅ no refutado |
| 4 | afirmación falsa en el `CLAUDE.md` | ✅ aplicado | ✅ no refutado |
| 5 | `SuccessModal` fuera del pase de altura | 🟡 parcial | ⛔ **refutado** |
| 6 | rollo de 297 mm por recibo | 🟡 parcial | ⛔ **refutado** |
| 7 | el toque que despierta agrega producto | 🟡 parcial | ⛔ **refutado** |

#### Los cuatro que sí quedaron cerrados
1. **Fullscreen.** Hoy hay dos banderas independientes (`main.js:269-270`) y la condición de reentrada
   es `restaurarFullscreen || entrarFullscreenTrasSetup` (`:320`). Lo que rompe el "siempre verdadero"
   es la compuerta `!yaConfigurada` de `:341`. Ambas se resetean en `:325-326`, así que no se filtran
   entre aperturas del setup. **Bonus del escéptico:** comparó la fuente contra
   `dist/ElVuelto-bambipan-win32-x64/resources/app/main.js` y el **diff sale vacío** — o sea que el
   `.exe` ya generado lleva el arreglo; no es un fix que solo vive en el código.
2. **Alto real en vez de `scale()`.** `pos.css:1665` baja la caja de verdad (`3.5rem` contra los `5rem`
   de la base en `:454-456`, misma especificidad, gana por orden), y `:1964-1966` repite el patrón con
   `!important` para pisarle el inline a `SuccessModal.tsx:73-74`. El escéptico parseó **todo** `pos.css`
   con postcss: no hay ninguna otra declaración más abajo que lo revierta, y los 21 `scale()` del
   archivo son todos `:active`/`:hover`/keyframes — ninguno compite por alto.
3. **Anti-escaneo.** `TRAGAR_TECLAS_MS = 500` (`IdleScreensaver.tsx:46`) y un segundo listener en
   `window` **en captura** (`:182`) con `stopPropagation()` (`:179`). El del escáner vive en `document`
   en burbujeo (`PosPage.tsx:249`), así que la captura en `window` corre antes y el buffer no recibe
   nada. 500 ms cubren los ~100 ms del escaneo y superan los 300 ms del timer de vaciado (`:245`).
   > Dos matices que el verificador dejó anotados y **no se tocaron**: la ventana es de reloj fijo, no
   > "hasta el Enter" (un lector lento que pase de 500 ms dejaría entrar la cola); y mientras `onKey`
   > sigue montado, cada tecla del escaneo vuelve a llamar `despertar()` → `onWake()`, o sea **refetch
   > repetidos**.
4. **La mentira del `CLAUDE.md`.** Comprobada por experimento sobre una copia, no por lectura: con
   `logoUrl` dentro del `const tenant` → `tsc` **exit 0**; pasando el literal directo →
   **TS2353**. Confirma que el excess-property check solo dispara sobre un literal fresco y que el texto
   corregido de `el_vuelto_frontend/CLAUDE.md:361-368` ahora dice la verdad.

#### Los tres que NO están cerrados
5. **`SuccessModal` — el diagnóstico era falso y el hueco sigue abierto.**
   `git show HEAD:…/SuccessModal.tsx` prueba que `maxHeight: '90vh'` y `overflowY: 'auto'` **ya existían
   antes**; la descripción "no tenía max-height ni scroll" pertenece a **otro** modal, el
   `.pos-cash-modal` (`pos.css:870`). Peor: `calc(100dvh - 2rem)` = **736px** a 768 de alto es *más* que
   `90vh` = 691px, así que ese `!important` **no aporta scroll nuevo**, da más aire.
   Y el `position: sticky` de `:1972-1973` sujeta solo `.pos-success-modal__acciones`, que son los **dos
   botones secundarios** (Imprimir Recibo / Enviar WhatsApp). **"Nueva Venta"** (`SuccessModal.tsx:179`)
   queda en flujo normal, arriba. Como `ReceiptPreview.tsx:71` mapea **todos** los ítems sin tope, la
   cuenta del escéptico para una venta en efectivo con vuelto y 4 ítems da **≈767px contra 736
   disponibles**: con `scrollTop=0` la barra sticky opaca ocupa 656..736 y Nueva Venta cae en 612..687,
   o sea **tapado por la propia barra que se agregó para arreglarlo**.
6. **El rollo — el arreglo mide lo que no es.** La altura ya no es constante (`main.js:189` llama a
   `altoDelReciboEnMicrones`), pero `:137` usa
   `Math.max(documentElement.scrollHeight, body.scrollHeight)` y, por CSSOM,
   `documentElement.scrollHeight` **nunca baja del alto del viewport**. La ventana oculta se crea **sin
   width/height** (`:169-172`) → default 800×600 → viewport ~568px. El escéptico **corrió Electron 44**
   con el mismo constructor y un recibo real: contenido **146px (~4,3 cm)**, la función devolvió **568px
   → 154,3 mm**. Solo un recibo de más de ~568px (≈10+ ítems) se mide de verdad — justo el caso raro.
   → El ahorro real es 297 → **154,3 mm** (≈**28,5 m/día** con 200 ventas), **no los ~34 m escritos**;
   midiendo bien serían ≈50,9 m/día. Y `MIN = 40000` (`:132`) es **código muerto**: el valor jamás baja
   de 154 mm. Se arregla usando solo `body.scrollHeight`, o dándole un alto chico a la ventana oculta.
7. **El toque que despierta — todavía agrega el producto, y justo con el gesto del adulto mayor.**
   `despertarConsumiendoGesto` + `tragarClick` en captura existen (`IdleScreensaver.tsx:124-140`), pero:
   (a) por **Pointer Events L3**, cancelar `pointerdown` suprime `mousedown`/`mouseup` pero **no** el
   `click` de compatibilidad — así que el `preventDefault()` de `:126` no aporta y el tragador es la
   **única** defensa; (b) los 400 ms de `:140` se cuentan **desde el `pointerdown`, no desde el
   `pointerup`**. Un toque deliberado y sostenido ~450-500 ms —el gesto típico de la persona para la que
   se rediseñó toda la caja— suelta cuando el tragador **ya se removió**, el `click` aterriza en
   `ProductGrid.tsx:39` y **el producto fantasma entra igual**.

> [!warning] Corrección al propio relato de esta corrida
> Varios verificadores toparon con lo mismo: **el "antes roto" no es verificable en git.**
> `el_vuelto_desktop/` está sin trackear (`git log -- el_vuelto_desktop/` sale vacío), `IdleScreensaver.tsx`
> es archivo nuevo, y los bloques `@media (max-height: …)` **no existen en ningún commit** (se revisaron
> los 3 que tocan `pos.css`; cero ocurrencias de `max-height: 820px`, y `git diff -U0` no muestra ni una
> línea borrada con `scale(`). O sea que los hallazgos 1, 2, 3, 6 y 7 describen **iteraciones dentro de la
> misma sesión**, no defectos que hayan vivido en el repo. Lo único auditable es el estado final — y eso
> es lo que se auditó. La narrativa de "estaba roto y lo arreglé" se sostiene en comentarios del propio
> autor, y **un comentario no es evidencia**.

**Consecuencia:** los 3 abiertos salen a ficha propia — [[POS-20260827-tres-arreglos-a-medias]] — y el
[[00-INDEX]] se corrigió, porque decía "Todo corregido".

## ⚠️ Lo que NO se pudo probar
**Nada se vio en pantalla.** No hay navegador en este entorno (verificado: no existe tooling de Chrome).
Las tres tareas de layout son 90% CSS, y `typecheck`/`build` no prueban nada visual. La garantía es
aritmética escrita + auditoría del bundle + lectura.

Para compensar, quedó en `temp/recibo-antes-y-despues.html` una página que renderiza **el recibo viejo
y el nuevo lado a lado** con sus estilos reales: se abre en el navegador y se manda a la térmica con
Ctrl+P. Es la validación más barata que existe para T4.

Falta el ojo del owner en: el POS a 1366×768, el modal del efectivo, el salvapantallas, el modal de
vaciado y el `.exe` arrancando en pantalla completa en Windows.

## Doble actualización
- `el_vuelto_frontend/CLAUDE.md`: sección de `generateReceipt.ts` reescrita. **Corrige dos afirmaciones
  falsas que el backlog venía denunciando desde el 2026-08-13**
  ([[DOCS-20260813-claudemd-drift-post-features]]): decía que `generateReceipt.ts` usa jsPDF (no lo
  importa) y que `downloadCredentials.ts` exporta `.txt` (hace un PDF). Verificado por `grep`: 0 hits de
  jspdf en el primero, 4 en el segundo.
- `CLAUDE.md` raíz: misma corrección en la línea de Receipts.
- Cerebro: este RUN + [[ADR-POS-20260827-caja-para-adulto-mayor-en-1366x768]] + las dos fichas +
  índices.

## Enlaces
[[ADR-POS-20260827-caja-para-adulto-mayor-en-1366x768]] · [[POS-20260827-caja-1366x768-y-reposo]] ·
[[POS-20260827-escaner-activo-con-modales]] · [[RUN-20260826-dockerizacion-stack]] ·
[[ADR-SALES-20260816-stock-negativo-permitido]]

---

# Tercera pasada (2026-08-27, tarde) — cerrar las tareas 1 y 3

Pedido directo del owner: *"finalicemos completamente las tasks 1 y 3, dale itera y que quede bien
pulido mientras creo cuenta de azure"* — o sea, ejecución autónoma. Alcance: los puntos **1 y 2** de
[[POS-20260827-tres-arreglos-a-medias]] (el toque que despierta y el `SuccessModal`). **El del rollo
no se tocó.**

## T3 · El toque que despierta ya no mete producto
**Causa real:** el tragador del `click` vivía contra un reloj arrancado en el `pointerdown`. A los
400 ms se removía, y un toque sostenido medio segundo —el gesto normal de un adulto mayor— soltaba
cuando ya no había nadie tragando.

**Arreglo:** la ventana se ata al **gesto**. Se cierra 400 ms después del `pointerup`/`pointercancel`
del *mismo* `pointerId`; la red de seguridad de 5 s **se renueva mientras el dedo siga abajo**;
limpieza al desmontar vía `limpiarTragadorRef`.

> [!danger] La revisión adversarial encontró un bug NUEVO en mi propio arreglo — y lo hallaron
> tres lentes por separado
> Mi primera versión llamaba a `cerrar()` dentro de `tragarClick`: **tragador de un solo tiro**. En un
> **doble toque** el click1 lo desarmaba y **el click2 pasaba limpio**. O sea que arreglé el toque
> sostenido y abrí el doble toque — el mismo fantasma por la puerta de al lado, y justo con el hábito
> de quien viene del escritorio. El overlay es `inset:0; z-index:9999`, así que un doble toque en la
> esquina superior derecha caía sobre `pos-header__close-btn` → `dispatch(logout())`: **cerrar el
> turno por tocar dos veces para despertar**. Corregido: la ventana la cierra **solo el reloj**.

## T1 · "Nueva Venta" ya no cae bajo el fold
Las **tres** acciones se envolvieron en `.pos-success-modal__footer` y ese es el que va
`position: sticky; bottom: 0` en `@media (max-height: 820px)`. Antes se pegaban solo las dos
secundarias y el primario quedaba arriba, en flujo normal, **tapado por la propia barra**. El recibo
(`.pos-success-modal__recibo`) cede margen a 820 px y trae scroll propio a 700 px.

Segundo hallazgo de la revisión, también corregido: el `margin-bottom: -1.25rem` del footer dejaba una
**franja de 20 px** al fondo por donde se veía pasar el recibo. Se quitó, y el padding inferior lo
aporta el footer.

## Verificación con salida real
```
npx tsc --noEmit                          → exit 0
npm run build                             → ✓ 1859 módulos, built in 4.55s
node scripts/probar-tragador-reposo.mjs   → PASAN: 8   FALLAN: 0
```
- **Bundle auditado**, no solo el fuente: `.pos-success-modal__footer{position:sticky;bottom:0;…;
  margin:0 -1.5rem;…}` y `.pos-success-modal{padding:1.25rem 1.5rem 0!important}` están en el CSS
  compilado, dentro de `@media (max-height: 820px)`; el `max-height:34vh` del recibo en el de 700; y la
  regla vieja que pegaba solo `__acciones` **ya no existe**.

### Banco de pruebas nuevo — y validado como test
`el_vuelto_frontend/scripts/probar-tragador-reposo.mjs`. Cero dependencias (el repo no tiene framework
y esto no agrega uno). No es una copia de la lógica: **extrae el texto real** de
`despertarConsumiendoGesto` del `.tsx` y lo ejecuta contra un DOM mínimo con **reloj virtual**.

| versión del código | resultado |
|---|---|
| 1er intento (anoche: reloj desde el `pointerdown`) | **4 fallan de 8** |
| 2º intento (hoy: atado al gesto, pero de un solo tiro) | **1 falla de 8** |
| **actual** | **8/8 pasan** |

Esa tabla es el punto: un test que pasa con el código roto no vale nada, y este **distingue las tres
versiones**. Es la primera vez que este bug —que ya se arregló mal dos veces— tiene una prueba que lo
reproduce, porque es un problema de **orden y tiempo de eventos del DOM**, que ni se ve leyendo ni lo
atrapa `tsc`.

## Revisión adversarial (§10.2)
6 lentes independientes (huecos del tragador, sobre-tragado de clicks legítimos, ciclo de vida,
cascada CSS, aritmética a 768 px, regresiones) + un escéptico por lente + un crítico de completitud.
**8 hallazgos confirmados, 10 refutados.** Los 2 de gravedad alta eran el mismo: el tragador de un
solo tiro. Los 3 accionables restantes (franja de 20 px, comentario obsoleto de `__acciones`, red de
seguridad cerrando con el dedo abajo) **también se arreglaron**.

## Lo que NO se pudo probar
**Nada se vio en pantalla** — sigue sin haber navegador en el entorno. El banco de pruebas cubre la
lógica de eventos del reposo, que era el riesgo real; el layout del `SuccessModal` sigue garantizado
por aritmética + auditoría del bundle. **Falta el ojo del owner** a 1366×768.

## Doble actualización
- `el_vuelto_frontend/CLAUDE.md`: sección nueva del `IdleScreensaver` (las dos reglas no obvias, con
  el porqué de que `preventDefault()` no sirva) y el gancho `__footer` documentado en `SuccessModal`.
- Cerebro: este anexo + [[POS-20260827-tres-arreglos-a-medias]] (puntos 1 y 2 a ✅).
