---
tags: [sesion, planner, cierre, verificacion, pos]
status: activo
updated: 2026-08-27
---

# Sesión 2026-08-27 — planner — cerrar la corrida que se quedó sin tokens

Arranque con [[INIT-AGENTS]]. El owner pidió el init **y** terminar "la tarea que no se terminó ayer
por falta de tokens". El PASO 0 la encontró en una línea: el
[[RUN-20260827-caja-adulto-mayor-y-recibo]] tenía un `> [!todo] Resultado pendiente de anexar` en la
sección **Revisión adversarial** — la madrugada se quedó sin presupuesto justo ahí.

## PASO 0 — estado real, contrastado hoy
| chequeo | resultado |
|---|---|
| HEAD | `eacaae0` (2026-08-20 20:43); **`main == origin/main`** |
| árbol de app | **sucio**, nada commiteado: Docker (08-26), el `.exe` (08-24) y la caja (08-27) |
| `npx tsc --noEmit` | **exit 0**, cero líneas |
| `temp/ElVuelto-bambipan.zip` (157 MB) | **ignorado** (`.gitignore:79`) |
| `el_vuelto_desktop/dist/` | **ignorado** (`el_vuelto_desktop/.gitignore:2`) |
| handoff del 08-27 | el relato ya estaba **anexado** al archivo del 08-26, no en archivo propio |

## La decisión que ordenó la sesión: no copiar el resumen, re-verificarlo
El [[00-INDEX]] ya afirmaba **"Todo corregido"** sobre la revisión adversarial. Lo fácil era pegar esa
frase en el RUN y cerrar. Se hizo lo otro: **7 verificadores independientes contra el código real, cada
uno con un escéptico detrás** cuyo único trabajo era encontrar por dónde el arreglo NO funciona
([[GOBERNANZA]] §1 — el código es la verdad; §8 — toda afirmación con respaldo en código que abrí).

**Valió la pena: el índice estaba equivocado. 4 de 7 aguantan, 3 no.**

## Los tres que no estaban cerrados
1. **El toque que despierta todavía agrega un producto** — y falla justo con el gesto del usuario para
   el que se rediseñó la caja entera. Los 400 ms de `IdleScreensaver.tsx:140` se cuentan **desde el
   `pointerdown`, no desde el `pointerup`**: un toque sostenido ~450-500 ms suelta cuando el tragador ya
   se removió. Y el `preventDefault()` de `:126` **no aporta** — por Pointer Events L3, cancelar
   `pointerdown` suprime `mousedown`/`mouseup` pero **no** el `click` de compatibilidad.
2. **`SuccessModal`: "Nueva Venta" sigue bajo el fold.** La barra sticky sujeta solo los **dos botones
   secundarios**; el primario quedó en flujo normal. Con 4 ítems: ≈767px contra 736 disponibles, y la
   barra opaca **tapa el botón** que se agregó para salvar. De paso, el diagnóstico original era falso:
   `git show HEAD` prueba que el modal **ya tenía** `maxHeight: 90vh` + `overflowY: auto` — esa
   descripción era de **otro** modal, el `.pos-cash-modal`.
3. **El rollo mide el viewport, no el recibo.** `documentElement.scrollHeight` nunca baja del alto del
   viewport, y la ventana oculta se crea sin `width/height` → piso constante de ~568px. El escéptico
   **corrió Electron 44**: contenido de 146px → devolvió **154,3 mm**. El ahorro es real pero es
   **≈28,5 m/día, no los ~34 m** escritos. `MIN = 40000` es código muerto.

## La lección que vale más que los tres bugs
**El "antes roto" de 5 de los 7 hallazgos no es verificable en git.** `el_vuelto_desktop/` está sin
trackear, `IdleScreensaver.tsx` es archivo nuevo, y los bloques `@media (max-height: …)` no existen en
ningún commit (revisados los 3 que tocan `pos.css`; `git diff -U0` no borra ni una línea con `scale(`).

Eran **iteraciones dentro de la misma sesión**, no defectos que hayan vivido en el repo. La corrida los
narraba como "estaba roto y lo arreglé", sostenido solo en comentarios del propio autor. En un repo cuyo
backlog lleva meses denunciando documentación que miente ([[DOCS-20260813-claudemd-drift-post-features]]),
eso importa: **un comentario del autor no es evidencia.**

## Qué se escribió (solo cerebro — cero código tocado)
- `RUN-20260827-…` — el `[!todo]` reemplazado por la sección **Resultado**, con la tabla de 7, las
  anclas archivo:línea y la corrección al propio relato de la corrida.
- **Nueva ficha** [[POS-20260827-tres-arreglos-a-medias]] — los 3 abiertos, con arreglo propuesto y la
  tabla de metros de papel.
- [[00-INDEX]] — el "Todo corregido" **marcado como falso** y corregido en su lugar.
- `00-registro-sales` — la fila pasa de 🟢 corrido-ok a **🟡 corrido-parcial**.

## Barrido de cabos sueltos — 13 hallazgos, 10 arreglados hoy
Un agente aparte barrió el vault buscando lo demás que quedó a medias. **No hay ni un enlace `[[wiki]]` roto**
en las notas del 27 (verificado cruzando todos los enlaces contra los nombres de archivo). Lo que sí
había, y quedó **arreglado**:

| # | qué estaba mal | arreglo |
|---|---|---|
| 1 | `00-global` (índice canónico de ADRs) se quedó en el 08-15 — **faltaban 3 ADRs** | agregados los del `.exe`, Docker y la caja |
| 2 | `patron-impresion-recibos` **mentía**: decía que `printReceipt.ts` tiene 16 líneas y es *"el único mecanismo"* (tiene **31** y el puente del wrapper desde el 08-24); el callout *"si se implementa el wrapper"* estaba en futuro | reescrito contra código real + sección nueva del recibo térmico |
| 3 | Las filas nuevas de los **dos registros** quedaron **fuera de la tabla** (después del encabezado) | movidas adentro |
| 4 | `00-planeacion` con `updated` viejo y sin la ficha nueva | al día |
| 5 | La deuda de §10.2 **se pagó el 27** y **tres** lugares seguían diciendo que estaba abierta | los 3 corregidos |
| 6 | El frontmatter del archivo del 08-26 decía `2026-08-26` conteniendo la madrugada del 27 | corregido |
| 7 | La sección del 27 en `00-INDEX` no cerraba con `Detalle: [[<sesión>]]` como todas las demás | agregado |
| 10 | La decisión del **alto del rollo** no vivía en **ningún ADR** (es diseño, no detalle de corrida) | anexada al ADR, con su estado real |
| 11 | La lista "Entregado" de la ficha no incluía `SuccessModal.tsx`, `SalesHistoryPage.tsx` ni los dos `CLAUDE.md` | completada |

### Lo que NO toqué, y por qué
- 🔴 **`el_vuelto_frontend/vite.config.js` entra al commit.** Untracked y **no ignorado**
  (`git check-ignore` → sin match): es el `vite.config.ts` transpilado, del 08-27 00:50. El
  `.gitignore:23` ignora `vite.config.d.ts` pero **no** el `.js` hermano. Con un `git add -A` se
  commitea basura de build. **Es una línea en el `.gitignore` raíz, que es código de la app** — fuera
  de los permisos del Planner ([[INIT-AGENTS]]). Queda para el owner.
- 🟡 **El módulo `sales` no se enteró de nada.** Sus seis notas (`estado-`, `mapa-`, `formularios-`,
  `contratos-`, `datos-`, `preguntas-sales`) siguen en `updated: 2026-08-02`, y `00-modulos` también.
  Cero menciones en todo `modules/` de `IdleScreensaver`, `ClearCartModal` ni `generateReceiptHTML`.
  Es un resync de módulo completo, no un parche: merece su propia sesión.
- 🟡 **`el_vuelto_desktop/README.md`** (doc canónica del wrapper, y el `CLAUDE.md` raíz manda ahí) es
  del 08-24 mientras `main.js` es del 08-27: no menciona el fullscreen ni F11, y su sección de
  "Forzar 80 mm" describe el comportamiento viejo, el de los 297 mm. Está **fuera del vault**.

## Preguntas abiertas
- **P-1 [pos] ¿El escaneo sobre el `SuccessModal` es un hábito de caja?** Sigue sin respuesta desde
  ayer; bloquea [[POS-20260827-escaner-activo-con-modales]]. Hipótesis: nadie lo usa a propósito.

## Por dónde retomar en frío
1. **Lo primero sigue sin ser código: es mirar.** Nada se ha visto en pantalla (sin navegador en el
   entorno). El recibo se valida abriendo `temp/recibo-antes-y-despues.html` y mandándolo a la térmica
   con Ctrl+P; el resto necesita el POS abierto a 1366×768.
2. Si el owner quiere cerrar de verdad la caja: [[POS-20260827-tres-arreglos-a-medias]], **en ese
   orden** (el toque primero — es el único que corrompe una venta en silencio).
3. **Nada está commiteado**: ni Docker, ni el `.exe` del 08-24, ni la caja, ni el cerebro. Commitear es
   del owner ([[GOBERNANZA]] §0).
4. El `.exe` regenerado sigue en `temp/ElVuelto-bambipan.zip`; su `main.js` empaquetado es **idéntico**
   a la fuente (diff vacío), así que lleva el fullscreen y el arreglo del rollo — con el defecto de
   medición del punto 3 adentro.

## Enlaces
[[RUN-20260827-caja-adulto-mayor-y-recibo]] · [[POS-20260827-tres-arreglos-a-medias]] ·
[[POS-20260827-caja-1366x768-y-reposo]] · [[POS-20260827-escaner-activo-con-modales]] ·
[[ADR-POS-20260827-caja-para-adulto-mayor-en-1366x768]] · [[2026-08-26-planner-paso0-resync]]
