---
tags: [corrida, run, auth, frontend]
status: cerrada
module: auth
updated: 2026-08-16
---

# RUN-20260816-teclado-numerico-staff-login — teclado numérico en el login de cajero

**Decisión:** [[ADR-AUTH-20260816-teclado-numerico-staff-login]] · **Ejecutó:** el **Planner** (pedido
directo, [[GOBERNANZA]] §10), con modo plan aprobado antes de tocar código · **Sin prompt para el Dev.**

## Qué se cambió (5 archivos)
- **NUEVOS** `el_vuelto_frontend/src/features/auth/components/NumericKeypad.tsx` + `NumericKeypad.module.css`
- `.../auth/StaffLoginPage.tsx` — `activeField` + `hasPhysicalKeyboard`, listener de `keydown`,
  `inputMode` dinámico, `PinInput` → `forwardRef` con `focusNextEmpty()`, scroll y alto medido.
- `.../auth/StaffLoginPage.module.css` — solo la transición del `padding-bottom`.
- `el_vuelto_frontend/CLAUDE.md` — doble actualización (reescrita tras la ronda 2, ver abajo).

Cero backend, cero migraciones, cero dependencias nuevas.

## Verificación — salida real

| # | Qué | Resultado |
|---|---|---|
| 1 | `npm run typecheck` | **exit 0** (corrido 4 veces: base + cada ronda de arreglos) |
| 2 | `npm run build` | **exit 0** · *built in 4.4–4.6s* |
| 3 | `POST /api/tenants/` + crear CAJERO con cédula `1020304050` y PIN `7391` | 201 / 201 contra servidor real |
| 4 | `GET /tenants/check-by-slug/<slug>/` (lo que resuelve la ruta, público) | `exists: true` + id + nombre |
| 5 | **`POST /auth/login/cashier/` con cédula + PIN + tenant_id** — la forma exacta que produce el keypad | **200**, `rol=CAJERO`, `tenant_slug` correcto, access de 496 chars |
| 6 | PIN equivocado | **403** `{"detail":"Credenciales incorrectas."}` — ver nota abajo |
| 7 | Sin `tenant_id` | 400 `{"tenant_id":["Este campo es requerido."]}` |
| 8 | PIN de 3 dígitos | 400 `{"password":["...al menos 4 caracteres."]}` |
| 9 | Limpieza | negocio borrado, `check-by-slug` → `exists:false`, **0 usuarios de prueba sobrevivientes** |

> [!info] Hallazgo lateral, no es defecto: el PIN malo devuelve **403**, no 401
> DRF convierte `AuthenticationFailed` en 403 cuando el request no tuvo autenticador exitoso, que es el
> caso de un endpoint de login `AllowAny`. Trae `{"detail": "Credenciales incorrectas."}` y
> `handleSubmit` lee `data.detail` **antes** de mirar el status, así que el cajero ve el mensaje
> correcto. La rama `status === 401` de esa página es un fallback que este camino nunca alcanza.
> Anotado en `el_vuelto_frontend/CLAUDE.md`.

**Entorno:** se usaron los servidores que el owner ya tenía corriendo (`:8000` y `:5173`) — al intentar
levantar los propios, los dos puertos estaban ocupados. El Vite duplicado que arrancó en `:5174` se
apagó (CORS solo permite `:5173`). Al terminar quedó **solo el negocio "BambiPan" del owner**, creado por
él a las 18:21 del 08-15; no se tocó.

## ⚠️ Límite honesto
**El gesto táctil NO se ejecutó.** Sin extensión de Chrome conectada, sin navegador headless (ni
Playwright ni Puppeteer ni binario de Chromium), sin jsdom, y **no se instaló nada** en el proyecto del
owner para conseguirlo. Lo verificado ejecutando: typecheck, build, y que las credenciales que el keypad
produce autentican de punta a punta. Lo **no** ejecutado: el toque, el panel apareciendo/desapareciendo,
y la interacción con el teclado del SO. Eso queda pendiente de confirmación visual del owner.

## Revisión adversarial — DOS rondas, 39 agentes, y encontró bugs reales

### Ronda 1 — 33 agentes, 28 hallazgos, 13 refutados, **15 sobrevivientes**
5 lentes (foco/ciclos · la premisa del keydown · flujo de login · táctil y CSS · a11y/consistencia),
cada hallazgo pasado por un escéptico con sesgo a refutar. Los que importaron:

1. 🔴 **Callejón sin salida del foco.** Tras "Ocultar" el input conservaba el foco, así que volver a
   tocarlo no emitía `focus` y el keypad **no volvía**. En un POS táctil puro: sin teclado y sin salida.
2. 🔴 **`inputMode` llegaba tarde.** Derivado de `keypadOpen`, o sea aplicado un render *después* del
   focus — en el **primer** toque el teclado del SO ya había salido.
3. 🔴 **El efecto robaba el caret.** Deps `[pin, activeField]`: tocar una caja para corregir un dígito
   rebotaba el caret a la siguiente vacía.
4. 🔴 **`scrollIntoView` centraba el campo equivocado** (leía `document.activeElement`, que aún era el
   campo viejo) y **el error del login fallido quedaba detrás del panel**.
5. 🔴 **`padding-bottom` de 20rem/16rem menor que el alto real** del panel → tapaba el botón de enviar.
6. 🔴 **Comentarios que mienten** (el del `z-index` afirmaba dos cosas falsas) y **código muerto**
   (`cedulaRef` declarado y nunca leído).

### Ronda 2 — 6 agentes, apuntada a los arreglos. **Encontró que yo había roto cosas nuevas**
4 de 5 arreglos cerraron limpio; el 5º no, y aparecieron **regresiones propias**:

- 🔴 **Regresión mía:** al pasar de `onFocus` a solo `onPointerDown`, tocar el **`<label>`** de la cédula
  enfocaba el input sin abrir el keypad (un `<label htmlFor>` reenvía *click*, nunca eventos de puntero)
  → campo activo con `inputMode="none"` y **cero teclados**. Arreglado agregando `onClick`.
- 🔴 **Regresión mía:** `hasPhysicalKeyboard` quedó como **latch irreversible** alimentado por cualquier
  `keydown`. Este POS usa **lectores de código de barras HID**: un escaneo perdido clasificaba una tablet
  táctil pura como "tiene teclado" para siempre, apilando los dos teclados en cada toque desde ahí.
  Arreglado haciéndolo de dos vías (un dedo resetea el flag).
- 🟡 **El arreglo #3 cerró el síntoma pero no el hallazgo:** en táctil seguía siendo imposible corregir un
  dígito que no fuera el último, y peor, el anillo de foco ahora *prometía* una edición posicional que el
  keypad no hace (tocar la caja 2 y marcar un dígito lo concatenaba al final → PIN equivocado →
  auto-envío → 403). **Resuelto por diseño, no por parche:** en táctil el PIN se llena de izquierda a
  derecha y la única corrección es el backspace — el contrato de cualquier pantalla de bloqueo — así que
  tocar una caja ya no mueve el caret. La edición posicional queda para el teclado físico.
- 🟡 `scroll-margin-bottom` + `block:'nearest'` en vez de `block:'center'` (el centro del viewport está
  en parte detrás del panel), `apiError` en su propio efecto (si no, ganaba precedencia para siempre), y
  `ro.observe(el, { box: 'border-box' })` (observaba content-box mientras medía border-box, así que un
  cambio de safe-area no disparaba).
- 🟡 **Tres comentarios míos quedaron mintiendo** tras los arreglos ("since the keypad opens *on focus*")
  y el `CLAUDE.md` describía el diseño viejo. Corregidos los cuatro. En este proyecto eso es pecado
  grave y hay ítems de backlog abiertos justamente por docstrings mentirosos.

**Sin regresiones funcionales:** el agente de regresión trazó los tres modos (táctil puro, teclado
físico, mixto) y los cuatro invariantes (auto-envío con `[pin]`, cédula limpia PIN, bloque PIN
condicionado, `setPin('')` + `apiError`) siguen intactos. `PinInput` y `NumericKeypad` no los usa nadie
más en el repo.

## Veredicto
✅ **Pasó**, con dos rondas de arreglos propios. Lo que más valió: la segunda ronda, que cazó **dos
regresiones que introdujeron mis propios arreglos** — el label sin teclado y el latch del lector de
códigos de barras. Ninguna de las dos era visible leyendo el diff una sola vez.

Pendiente: la confirmación visual del gesto por el owner.
