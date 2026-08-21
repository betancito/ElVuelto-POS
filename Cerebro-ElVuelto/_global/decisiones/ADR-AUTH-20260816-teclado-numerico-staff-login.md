---
tags: [adr, decision, auth, frontend, ux, tactil]
status: aceptada
module: auth
updated: 2026-08-16
---

# ADR-AUTH-20260816-teclado-numerico-staff-login — teclado numérico en pantalla para el login de cajero

**Fecha:** 2026-08-16 · **Estado:** ✅ aceptada e implementada · **Pedido directo del owner** en el chat,
con modo plan aprobado ([[GOBERNANZA]] §10) · **Corrida:** [[RUN-20260816-teclado-numerico-staff-login]]
**Alcance:** solo `/login/<tenantSlug>` (`StaffLoginPage.tsx`). `/login` del tenant admin y el POS **no**
se tocan — el owner acotó la ruta explícitamente.

## Contexto
`/login/<slug>` es la pantalla del **cajero** y corre en un POS táctil. Sus dos campos son numéricos
(cédula y PIN de 4 dígitos), así que depender del teclado del SO significa un QWERTY completo tapando
media pantalla para escribir dígitos — o, en un kiosco sin teclado del SO, nada.

El repo ya tenía **tres** numpads (`features/sales/pos.css`: `pos-cash-modal__numpad`,
`pos-qty-editor__numpad`, `pos-inv-numpad`), así que el idioma visual estaba definido y se copió.

Decisiones de forma tomadas por el owner antes de codear: **panel fijo abajo** (queda bajo los pulgares)
y **tecla "Siguiente"** para saltar de la cédula al PIN.

## Decisión

1. **El keypad escribe sobre el VALOR (`cedula`/`pin`), nunca sobre el DOM.** Es lo que mantiene un solo
   camino de código para tocar y teclear: el mismo `useEffect [pin]` auto-envía con el 4º dígito venga de
   donde venga, y el mismo "cambiar la cédula limpia el PIN" aplica a los dos.

2. **Se abre con `pointerdown` Y `click`, nunca con `focus`.**
   - `focus` no sirve: tras "Ocultar" (o tras que una tecla física escondiera el panel) el input **sigue
     enfocado**, así que el siguiente toque no emite `focus` y el cajero queda sin teclado y sin salida.
     Además `focus` dispara con Tab, mostrándole un teclado en pantalla justo a quien tiene teclado.
   - Hacen falta **los dos** eventos: `<label htmlFor>` reenvía un **click** al input pero nunca un
     evento de puntero. Con solo `pointerdown`, tocar la etiqueta enfocaba el campo con
     `inputMode="none"` y sin keypad: un campo activo sin ningún teclado.

3. **Se cierra con cualquier `keydown` en `document`** — las teclas son `<button>` cuyo `onPointerDown`
   cancela el default, así que nunca toman foco ni emiten `keydown`.

4. **`hasPhysicalKeyboard` maneja `inputMode`, y es de DOS vías.** `'none'` desde el primer render (un
   valor derivado de "¿está abierto el keypad?" llega un render **después** del focus, y el primer toque
   alcanzaría a levantar el teclado del SO); `'numeric'` cuando un keydown demuestra que hay teclado; y
   **de vuelta a `'none'` en el siguiente toque**. El reset no es opcional: este POS usa **lectores de
   código de barras HID**, cuyos keydown son indistinguibles de tecleo. Con un latch de una sola vía, un
   escaneo perdido clasificaba una tablet táctil pura como "tiene teclado" **para siempre**, y desde ahí
   cada toque apilaba el teclado del SO encima del nuestro.

5. **En táctil el PIN se llena de izquierda a derecha y la única corrección es el backspace** — el mismo
   contrato que la pantalla de bloqueo de cualquier teléfono. Tocar una caja **no** deja el caret ahí:
   `handleKeypadDigit` concatena, así que un anillo de foco parado en el medio prometería una edición
   posicional que el keypad no hace, y el dígito equivocado se colaría en el auto-envío. La edición
   posicional sí existe con teclado físico (`handleChange(idx, char)`), donde además el panel está
   cerrado.

6. **La página reserva el alto MEDIDO del panel** (`ResizeObserver` con `box: 'border-box'` →
   `onHeightChange` → `paddingBottom` inline). Una constante se desfasa apenas cambia un tamaño de tecla,
   un padding o `env(safe-area-inset-bottom)`, y entonces el panel tapa el botón de enviar. El scroll usa
   `block: 'nearest'` + `scroll-margin-bottom`, no `block: 'center'`: "el centro del viewport" está en
   parte **detrás** del panel fijo en una pantalla baja.

## Alternativas descartadas
- **Copiar el patrón de `ProductsPage`** (`onPaste`/handlers colgados del `<form>`): un evento apunta al
  elemento con foco, así que no dispara hasta que algo adentro ya lo tiene.
- **Un QWERTY completo o una librería de teclado** (`react-simple-keyboard`): los dos campos son
  numéricos, y agregar dependencia contradice el STACK INMUTABLE de [[INIT-AGENTS]].
- **Teclado inline dentro de la tarjeta**: descartado por el owner frente al panel fijo.
- **Dejar que tocar una caja del PIN mueva el caret**: ver punto 5.

## Consecuencias
- Un componente nuevo reutilizable (`features/auth/components/NumericKeypad.tsx`) por si otra pantalla
  táctil lo necesita.
- El patrón viejo de `ProductsPage` queda como deuda ya registrada:
  [[FRONT-20260815-productspage-paste-sin-validar-y-en-form]].
- ⚠️ **El gesto no se pudo ejecutar en esta sesión** (sin navegador en el entorno). Falta confirmación
  visual del owner — detalle en [[RUN-20260816-teclado-numerico-staff-login]].
