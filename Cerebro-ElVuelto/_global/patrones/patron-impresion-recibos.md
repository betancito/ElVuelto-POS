---
tags: [patron, global, impresion, recibos]
status: vivo
updated: 2026-08-27
---

# Patrón — Impresión y recibos (¡es todo FRONTEND!)

> [!warning] Corrige una mentira de los CLAUDE.md
> Ambos `CLAUDE.md` dicen que la impresión es backend vía `python-escpos`. **Falso.** La impresión/recibos son **100% frontend**.

> [!warning] Corregido el 2026-08-21 — esta nota repetía la mentira que ella misma denuncia
> Hasta hoy esta nota decía que `generateReceipt.ts` es *"recibo PDF con jsPDF para descarga"* y que
> `downloadCredentials.ts` *"exporta credenciales a `.txt`"*. **Las dos eran falsas, y son exactamente
> los puntos 2 y 3 de [[DOCS-20260813-claudemd-drift-post-features]]** — o sea, el cerebro venía
> acusando a los `CLAUDE.md` de una mentira que él mismo tenía escrita desde el 2026-08-02. Los dos
> archivos estaban descritos **al revés**. Detectado al evaluar
> [[DESKTOP-20260821-app-escritorio-cajero-exe]]; verificado contra HEAD `eacaae0`.

## Realidad (re-verificada el 2026-08-27 contra el working tree)
- **`src/utils/generateReceipt.ts:44`** — `generateReceiptHTML(sale, tenant): string`. Devuelve un
  **string de HTML autocontenido**, no un PDF. **No importa jsPDF.** El layout térmico de 80mm vive
  acá: `:117` → `@page { size: 80mm auto; margin: 5mm 4mm 3mm 4mm; }`.
- **`src/utils/printReceipt.ts` — 31 líneas y DOS caminos** (ya no uno):
  1. `:16-20` — si existe `window.elVuelto.printReceipt`, delega en el **puente del wrapper Electron** y
     **retorna**: sale directo a la térmica, sin diálogo.
  2. `:22-30` — si no, el `window.open` + `win.print()` + `win.close()` a los 300ms de siempre.
     **El fallback de navegador sigue vivo**, que es lo que exige [[DESKTOP-20260821-app-escritorio-cajero-exe]].
- **Call sites: solo dos** — `src/features/sales/components/SuccessModal.tsx:212` (después de vender) y
  `src/features/sales/SalesHistoryPage.tsx:69` (reimprimir del historial). Ambos arman primero un
  `const tenant = {…}` — detalle que **importa**: pasar la variable en vez del literal desactiva el
  excess-property check de TS, así que una llave sobrante (p. ej. `logoUrl`) **se cuela sin romper el
  typecheck**. Comprobado por experimento el 2026-08-27.
- **`src/utils/downloadCredentials.ts`** — este **sí** es el que usa jsPDF (`:1`). Genera **PDF A5
  apaisado** (`:130` y `:254`, `new jsPDF({orientation: 'landscape', unit: 'mm', format: 'a5'})`) y
  guarda `credenciales-<slug>.pdf` (`:239`) / `credenciales-<usuario>-<slug>.pdf` (`:367`). **Nunca
  `.txt`.** Es el único consumidor de `jspdf` (`package.json:22`) en todo el repo.
- **`el_vuelto_backend/apps/reports/views.py:112-178`** (`SalesDetailExportView`) provee los **datos** de
  exportación (incl. `tenant_nombre`, `tenant_logo_url`), pero **no imprime**.
- **No existe descarga en PDF del recibo de venta.** Si alguien la pide, es feature nueva.

## Consecuencia operativa: el diálogo de Windows en cada venta
`win.print()` abre el **diálogo de impresión del sistema operativo**, y el cajero tiene que confirmarlo
en **cada venta**. Un navegador no puede evitarlo — es una restricción de diseño, no un bug.
Es el motivo #1 detrás de [[DESKTOP-20260821-app-escritorio-cajero-exe]]: sólo un wrapper de escritorio
(`webContents.print({silent: true, deviceName})`) puede imprimir sin diálogo.

> [!done] El wrapper YA se implementó (2026-08-24) — esto dejó de ser hipótesis
> Pasó exactamente como se había previsto: `printReceipt` detecta el puente
> (`window.elVuelto?.printReceipt(html)`, `printReceipt.ts:16-20`) y cae al `window.open` en navegador.
> El HTML de `generateReceiptHTML` se pasó **tal cual**: no hubo que rehacer el layout.
> Ver [[ADR-DESKTOP-20260824-wrapper-electron-y-generador-manual]].

## El recibo térmico se rediseñó el 2026-08-27 (T4 de la noche de la caja)
El dueño reportó que su térmica solo imprimía bien la línea **TOTAL**. La causa no era el tamaño:
- **Grises fuera.** `.small` era `#444` y el pie `#777`; un cabezal térmico no tiene medios tonos y los
  simula **salteando puntos**. Hoy todo es `#000` (`generateReceipt.ts:128`).
- **Todo en bold** (`:126`) — antes solo TOTAL y Cambio, justo las dos que se leían.
- **Courier New → Arial bold** (`:124`). Courier estaba por una sola razón: `pad()` alineaba columnas
  rellenando con espacios, y eso **exige monospace**. Al pasar a filas flex el alineado es geométrico y
  la restricción desaparece; Arial bold deposita bastante más tinta con el mismo cabezal.
- **Efecto colateral bueno:** `pad()` truncaba los nombres a 16-20 caracteres ("Gaseosa Postobó…").
  Con flex el nombre envuelve y **se lee completo**.
- **El logo del negocio se fue** del recibo (verificado: **0 `<img>`** en el archivo).
- Una sola perilla para el tamaño: `BASE_PX`. `PAPER_MM = 72` (`:33`) = 80mm menos los márgenes.

## 2026-08-27 (noche) — el recibo salía recortado en la térmica REAL, y se arregló
Primera vez que este recibo se prueba contra hardware. El dueño reportó **tres** síntomas: blanco
grande arriba, y recortado abajo **y a la derecha**. Eran **un solo defecto de geometría**, en dos
archivos que nadie había leído juntos:

- `generateReceipt.ts` traía `@page { margin: 5mm 4mm 3mm 4mm }`
- `main.js` imprime con `margins: { marginType: 'none' }`

O sea, el wrapper pide **cero márgenes** y el HTML mete los suyos encima. Los dos se suman, el
contenido se corre abajo y a la derecha, y sobre un papel que además tiene su propia **zona muerta**
(una térmica de 80mm marca 70-72mm) el resultado es exactamente lo reportado.

**Arreglo (medido, no estimado):**
| | antes | ahora |
|---|---|---|
| `@page margin` | `5mm 4mm 3mm 4mm` | **`0`** — el respiro va en `padding` del body |
| ancho del contenido | 72mm pegado a la izquierda | **70mm CENTRADO** en los 80 (5mm de banda a cada lado) |
| blanco arriba | 5mm de `@page` + el del papel | **2mm** |
| alto de página | el que diga el driver | **medido del recibo** |
| default de impresión | `usePrinterDefaultPageSize` | **80mm forzado** con alto medido |

El cambio de default es lo que cierra el caso: en automático el ancho y el alto los decide un driver
que evidentemente miente. Forzando 80mm el ancho lo ponemos nosotros y el alto ya se mide bien.
`'auto'` sigue disponible en el setup.

> [!success] Verificado con Electron 44 de verdad, no por lectura
> Se renderizó un recibo real de 8 ítems y se midió la caja de cada elemento:
> contenido de **6.0mm a 74.0mm** (dentro del límite de ~76), blanco arriba **2.0mm**, alto
> **164.2mm**. Y se generó el PDF con **las opciones exactas** del wrapper: **80.1 × 168.7mm, UNA
> página**. Queda en `temp/recibo-prueba-80mm.pdf` para mandarlo directo a la térmica.
> De paso quedó probado el bug viejo del alto: `documentElement.scrollHeight` devolvía **238.1mm**
> contra los **164.2mm** reales.

## El alto del rollo — ARREGLADO el 2026-08-27 (era el punto 3 de [[POS-20260827-tres-arreglos-a-medias]])
`altoDelReciboEnMicrones` ahora mide `document.body.getBoundingClientRect().height` en vez de
`Math.max(documentElement.scrollHeight, …)`, y la ventana oculta se crea con un ancho explícito
(420px) en vez del default de 800×600. El texto de abajo queda como historia de por qué:

> [!warning] (histórico) El alto del rollo: el arreglo del wrapper estaba a medias
> "Forzar 80 mm" fijaba la página en **297 mm** (A4) — casi 30 cm de rollo por recibo. Se cambió por una
> medición real (`main.js:189` → `altoDelReciboEnMicrones`), **pero mide el viewport, no el recibo**:
> `documentElement.scrollHeight` nunca baja del alto del viewport y la ventana oculta se crea sin
> `width/height`, así que hay un **piso constante de ~154 mm**. El ahorro es real (≈28,5 m/día con 200
> ventas) pero menor al que se documentó. Detalle y arreglo propuesto: [[POS-20260827-tres-arreglos-a-medias]].

## `python-escpos` — ya no está declarado, pero el venv sigue sucio
- **Se borró de `requirements.txt` en el commit `a15f6cc`.** La afirmación vieja de esta nota
  (*"está en `requirements.txt:7`"*) dejó de ser cierta ahí. Hoy `requirements.txt` **no lo lista**.
- **Sigue instalado en el `.venv` local** (arrastrando `python-barcode`, `qrcode`, etc.): nunca se corrió
  el `pip uninstall`. Es higiene del entorno, no del repo. Ver [[riesgo-deps-duplicadas-y-escpos]].
- `Pillow==11.1.0` sigue declarado (`requirements.txt:6`) y sigue siendo **dependencia muerta**: cero
  imports, cero `ImageField`, y `cloudinary` no lo pide.

## Enlaces
[[patron-cloudinary]] · [[patron-formato-cop]] · [[DESKTOP-20260821-app-escritorio-cajero-exe]] ·
[[ADR-DESKTOP-20260824-wrapper-electron-y-generador-manual]] ·
[[ADR-POS-20260827-caja-para-adulto-mayor-en-1366x768]] · [[RUN-20260827-caja-adulto-mayor-y-recibo]] ·
[[POS-20260827-tres-arreglos-a-medias]] ·
[[DOCS-20260813-claudemd-drift-post-features]] · [[riesgo-deps-duplicadas-y-escpos]]
