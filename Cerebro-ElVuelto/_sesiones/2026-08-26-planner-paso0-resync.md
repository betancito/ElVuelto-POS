---
tags: [sesion, planner, paso0, resync]
status: activo
updated: 2026-08-27
---

# Sesión 2026-08-26 — planner — PASO 0 en frío

Arranque del Planner con [[INIT-AGENTS]]. El owner pidió **solo el init** ("only init do not execute
anything only init context"): esta nota cubre el PASO 0 y nada más. No se propuso ni se arrancó trabajo.

## Qué se leyó
[[00-INDEX]] + [[GOBERNANZA]] + la última nota de sesión ([[2026-08-24-planner-paso0-resync]], con la
sección de la tarde anexada) + [[00-planeacion]] + [[DESKTOP-20260821-app-escritorio-cajero-exe]] +
[[RUN-20260824-beta-manual-exe-caja]].

## Método
Igual que las veces anteriores: la nota del 08-24 se tomó como **hipótesis**, no como estado. Se
contrastó contra `git log`, `git status`, `git check-ignore`, `mtime` de cada archivo y lectura directa
del código. Han pasado **dos días** desde la beta del `.exe` y ninguna feature nueva tocó archivos
citados por el backlog.

## Hallazgo 1 — el código no se movió, pero el árbol de app **ya no está limpio**
- HEAD = **`eacaae0`** (2026-08-20 20:43), igual que el 08-24. **`main` == `origin/main`**: pusheado.
- **El árbol de app tiene 5 entradas sucias** — es la beta del `.exe`, sin commitear desde el 08-24:
  `el_vuelto_desktop/` (nueva), `el_vuelto_frontend/src/utils/printReceipt.ts`, `CLAUDE.md` raíz,
  `el_vuelto_frontend/CLAUDE.md` y `.gitignore`. La nota de la **mañana** del 08-24 decía "árbol de app
  limpio"; su propia sección de la tarde ya lo desmintió. Hoy solo se confirma y se le pone edad:
  **dos días**. Commitear es del owner ([[GOBERNANZA]] §0).
- Último archivo de app tocado: `el_vuelto_desktop/tools/make-ico.py` y `README.md`, **2026-08-24
  23:14**. Antes de la beta, el silencio del código de la app web sigue intacto desde el **2026-08-16
  17:50** (diez días).
- El cambio de `printReceipt.ts` está donde debe: `printReceipt.ts:17-20` consulta
  `window.elVuelto?.printReceipt` y **cae al `window.open` + `win.print()` de siempre** si no existe
  (`:23-30`). El fallback de navegador está vivo, como exige la ficha.

## Hallazgo 2 — el entorno sigue verde
- `makemigrations --check --dry-run` → **No changes detected** (exit 0).
- `npx tsc --noEmit` → **exit 0**, cero líneas de salida (corrido en `el_vuelto_frontend/`).

## Hallazgo 3 — los 5 ítems de peso siguen abiertos, y las anclas siguen exactas
Verificados hoy contra el código, no heredados de la nota:

| ítem | estado | evidencia de hoy |
|---|---|---|
| [[BACKEND-20260813-docstring-tenancy-miente-aislamiento]] | 🔴 SIGUE-ABIERTO | `tenants/viewsets.py:19-21` sigue diciendo *"automatically adds `.filter(tenant=request.tenant)`"* + *"cross-tenant data leakage is impossible"*; `products/views.py:57-59` sigue siendo el contraejemplo (el override tumba el guard y su propio comentario lo admite); `inventory/views.py:9` sigue importando `TenantModelViewSet` y **es el único hit del archivo** — import muerto |
| [[DOCS-20260813-claudemd-drift-post-features]] | 🔴 SIGUE-ABIERTO | front `:330` = *"jsPDF receipt for download"*, front `:331` = *"exports credentials as `.txt`"* — **las dos mentiras intactas y en la línea exacta que dice la ficha** |
| [[BACKEND-20260811-manage-py-settings-fallback-inseguro]] | 🔴 SIGUE-ABIERTO | `manage.py:8` sigue con `setdefault(..., "elvuelto.settings.local")` |
| [[BACKEND-20260811-falta-https-enforcement-produccion]] | 🔴 SIGUE-ABIERTO | `grep -c 'SECURE_\|SESSION_COOKIE_SECURE\|CSRF_COOKIE_SECURE'` sobre `settings/production.py` → **0** |
| [[BACKEND-20260805-residuos-del-triaje]] | 🔴 SIGUE-ABIERTO | `sales/views.py:43` (`?user=` sin validar) y `:52` (el filtro que lo usa), `products/models.py:87` (`unique_tenant_barcode`) — anclas exactas |

> [!info] Detalle que valía la pena mirar: la edición del 08-24 **no corrió** las anclas del bloque de doc
> `printReceipt.ts` creció, pero en `el_vuelto_frontend/CLAUDE.md` la línea de `printReceipt` se
> **reescribió en su lugar** (neto cero): `grep -n` confirma hoy `:330` y `:331` idénticas a lo que dice
> la ficha. Un Dev que tome ese ítem va a la línea correcta sin re-anclar.

Los 7 ítems 🔴 de prioridad baja **no** se re-verificaron, por la razón de siempre: hacerlo es el
"seguir buscando trabajo" que el owner pidió no hacer ([[elvuelto-cierre-estabilizacion]]).
**No se abrió ningún ítem nuevo.**

## Hallazgo 4 — sin trabajo a medias
**Ningún prompt 🟡 en curso** en los 7 `00-registro-<mod>`: los únicos hits de 🟡 son la línea de
leyenda de cada registro y la anotación histórica del 2026-08-04 dentro de una fila ya 🟢
(`00-registro-transversal:21`), cuyo trabajo real se sigue en
[[DOCS-20260813-claudemd-drift-post-features]].

## Hallazgo 5 — el arreglo del `.gitignore` del 08-24 aguanta (se auditó, no se creyó)
El hallazgo 5 del [[RUN-20260824-beta-manual-exe-caja]] decía que renombrar `build/` → `tools/` salvaba
el ícono y el parcheador del `.exe`. **Verificado hoy con `git check-ignore`, archivo por archivo:**
- **15 archivos de `el_vuelto_desktop/` entran al commit**, incluidos `tools/elvuelto.ico` y
  `tools/patch-exe.js` — las dos piezas que el bug se tragaba.
- Ignorados, y **está bien que lo estén**: `node_modules/`, `dist/`, `app/config.json` (lo hornea
  `build.py` por tenant) y `urls.json` (la IP local del owner). `urls.example.json` sí entra, como
  plantilla.

## Hallazgo 6 — el generador del `.exe` no es reproducible al 100% en un clon nuevo (observación, no ítem)
`.gitignore:16` ignora `package-lock.json` **en todo el repo** — convención vieja, el lockfile del
frontend tampoco está trackeado (`git ls-files` → vacío). Consecuencia para la beta:
`el_vuelto_desktop/package-lock.json` no se va a commitear, y de las tres herramientas del generador
solo **`electron` está clavado exacto** (`44.0.0`); `@electron/packager` (`^18.4.0`) y `resedit`
(`^3.0.2`) flotan. En un clon nuevo, `npm install` puede resolver otras versiones de **justamente las
dos piezas que producen y marcan el `.exe`**.
No se abre ficha: es convención preexistente del repo y el owner pidió converger, no acumular tablero.
Queda dicho para que sea **decisión suya** si la beta merece excepción al `.gitignore`.

## Hallazgo 7 — un cambio sin dueño en el `.gitignore` raíz ❓
`git diff .gitignore` muestra **una sola línea agregada: `+temp.md`**. No aparece en el
[[RUN-20260824-beta-manual-exe-caja]] (cuyo arreglo fue renombrar la carpeta, sin tocar la regla global)
ni en ninguna nota del cerebro (`grep -rn "temp\.md"` sobre `Cerebro-ElVuelto/` → cero hits).
**❓ POR CONFIRMAR:** hipótesis, lo agregó el owner en su propia sesión. Impacto bajo; se anota para no
dejar un cambio de repo sin trazabilidad.

## Estado al cerrar el PASO 0
Sin trabajo en curso, sin prompt pendiente, entorno verde. La diferencia con el 08-24 en la mañana es
una sola: **hay una entrega terminada esperando commit** (la beta del `.exe`), y con ella la deuda de
validación que decide si la feature sirve.

**La pregunta para el owner, con la fase 1 ya implementada:**
1. **Probar el `.exe` en Windows con la térmica** — [[DESKTOP-20260821-app-escritorio-cajero-exe]] fase
   1. No es código: es correr `ElVuelto-<slug>.exe`, elegir impresora y hacer una venta. Es lo único que
   decide si la arquitectura Electron valió la pena, y **la fase 2 (módulo de descarga, firma, hosting)
   no debe arrancar antes**. Si algo falla: `set ELVUELTO_DEBUG=1`.
2. **Confirmación visual de las tres features del 08-15/08-16** (pegar logo ⌘V, teclado numérico, stock
   negativo). Once días esperando; sigue siendo la deuda más barata del tablero.
3. El bloque *"la doc miente"* (alta, barato, anclas verificadas hoy y exactas).
4. La config de deploy (2 ítems; necesita una respuesta suya sobre infraestructura).
5. RLS ([[GLOBAL-20260802-migracion-rls-postgres]], desbloqueado desde el 08-09, mini-proyecto).

## Por dónde retomar en frío
1. Leer [[00-INDEX]] (sección del 2026-08-26) + [[GOBERNANZA]] + esta nota.
2. HEAD = `eacaae0`, pusheado. **Sin commitear:** la beta del `.exe` (5 entradas de app, 15 archivos
   nuevos bajo `el_vuelto_desktop/`) + el cerebro del 08-21/08-24 + lo de hoy.
3. Backlog verificado al 2026-08-26 en sus 5 ítems de peso, **anclas exactas, cero re-anclaje**.
4. Fase 1 de escritorio implementada y sin validar en papel. **Lo primero que corresponde no es código.**

---

# 2026-08-26 (tarde) — el stack en Docker

El owner cortó el hilo del Planner (*"pausemos eso"*) y pidió meter front y back en contenedores.
Pedido directo ([[GOBERNANZA]] §10). Detalle completo: [[RUN-20260826-dockerizacion-stack]] ·
decisión: [[ADR-INFRA-20260826-docker-nginx-mismo-origen]] · ficha:
[[INFRA-20260826-dockerizacion-stack]].

## Qué pidió
Front y back en Docker detrás de un nginx, con un `manage-docker.sh` de un solo comando, para **abrir
la app desde el celular en su red local**. Fijó el esquema de puertos (5173 el front, 8000 el back,
"el mismo adentro y afuera") y pidió explícitamente *"dime si algo no cuadra"*. Sobre la BD:
*"no hacer nada, usar la misma… esa funciona bien"*.

## Lo que más valió: decirle que no cuadraba, antes de escribir nada
Sus dos puertos publicados son **dos orígenes**, y eso devuelve el CORS que la tarea venía a eliminar
— más la IP horneada en el bundle, que es lo que rompe el acceso desde el celular.

Se concilió **sin negociarle los números**: nginx escucha en los dos puertos. El `:5173` sirve la app
entera en un solo origen (`/` al front, `/api/` al back) y el `:8000` es passthrough al backend. Tuvo
sus puertos y el mismo origen a la vez.

## El Discovery encontró algo que el cerebro no sabía
**El Postgres de ElVuelto es de otro proyecto.** El 5432 del host lo tiene `naia-postgres`
(`postgres:16`, de `naia-app`), y la base `elvuelto` vive adentro de ese contenedor ajeno. Ningún
`estado-<mod>` ni ADR lo decía. El owner decidió dejarlo así y cambiar `DB_HOST` cuando haya prod.

Y una contradicción vieja del repo: **`vite.config.ts` ya tenía el proxy `/api`** desde antes, con un
comentario que menciona un nginx en `192.168.1.9:5173` — pero sin `.env` en el frontend,
`VITE_API_URL` quedaba `undefined` y ganaba el fallback absoluto de `apiBase.ts:7`. El camino de mismo
origen estaba construido **y desandado por su propio default**.

## Lo que se rompió y se arregló solo por correrlo
Tres defectos propios, ninguno visible leyendo el código: el healthcheck no podía pasar nunca
(opciones de GNU `wget` contra el busybox de Alpine, y `localhost` resolviendo a `::1` con nginx en
IPv4); `build prod` iba a **pisar las imágenes de dev**; y el `.gitignore` ignorando
`package-lock.json` hacía que **`npm ci` no corriera en un clon nuevo** — la misma deuda que el
Hallazgo 6 de esta mañana, vuelta blocker.

## Deuda que nace acá
🔴 **La revisión adversarial de §10.2 no se corrió** — solo revisión propia. El setup toca CSRF y
validación de hosts, así que la omisión queda anotada, no escondida.
🟡 El host y los contenedores no pueden correr a la vez (mismos puertos, a propósito).
🟡 `el_vuelto_desktop/package-lock.json` **sigue ignorado**: la negación del `.gitignore` se hizo solo
para el frontend, por disciplina de alcance.

## Por dónde retomar en frío (actualizado)
1. Leer [[00-INDEX]] (sección del 2026-08-26 tarde) + esta nota.
2. `./scripts/manage-docker.sh up dev` levanta todo e imprime la URL de la LAN.
3. **Lo primero que corresponde no es código:** que el owner abra `http://192.168.1.75:5173` en el
   celular. Se verificó con `curl` (200 en todo, WebSocket 101), no a ojo.
4. **Nada está commiteado**: ni Docker, ni la beta del `.exe` del 08-24, ni el cerebro.
5. Sigue esperando el ojo del owner lo del 08-15/08-16 y la impresión del `.exe` en Windows.

---

# 2026-08-27 (madrugada) — la caja, rediseñada para el cajero real

El owner dejó cinco pedidos corriendo toda la noche, con una instrucción explícita: *"si hay algo que
no es claro SOLAMENTE HAZ UNA RONDA DE PROVING QUESTIONS… despues si te quedas en auto"*. Detalle
completo: [[RUN-20260827-caja-adulto-mayor-y-recibo]] · decisión:
[[ADR-POS-20260827-caja-para-adulto-mayor-en-1366x768]] · ficha:
[[POS-20260827-caja-1366x768-y-reposo]].

## Lo que más valió: la ronda de preguntas devolvió una tarea que no estaba en el pedido
Al responder qué hacer si el POS duerme con el carrito cargado, el owner agregó de su cosecha el
vaciado de un toque con confirmación y el botón de volver a categorías. Y, sobre todo, dio la
restricción que ordena las otras cuatro tareas:

> "esto sera manejado por adultos boomers colombianos que muchas veces la tecnologia los confunde"

Eso convierte cinco pedidos sueltos en **un criterio de diseño**, y explica por qué la caja venía
fallando: está construida con la densidad de una app de escritorio, sobre un equipo de 1366×768
manejado con el dedo.

## El workflow de mapeo previo se pagó solo
Antes de tocar código: 6 lectores + 1 arquitecto sobre el POS, el recibo y el wrapper. Encontraron
**tres defectos que la lectura directa no vio** — el carrito vacío empujando el bloque de pago fuera
de pantalla, el numpad flotante de cantidad abriéndose fuera del viewport (mide 311px y solo tenía
clamp horizontal), y el salvapantallas a punto de tapar el aviso de **stock negativo**, que solo viene
en la respuesta del POST y no se recupera.

Y **corrigieron un cálculo mío que estaba mal**: yo había puesto la tarjeta de producto en 12.5rem/7rem
para el breakpoint de 820px, y la cuenta real da 62px útiles contra 64px necesarios — o sea que
`overflow: hidden` **hacía desaparecer el precio en silencio**.

## La revisión adversarial encontró cosas peores en mi propio trabajo
Siete lentes independientes (incluidos dos de Docker, pagando la deuda de [[GOBERNANZA]] §10.2 que
había quedado abierta en [[RUN-20260826-dockerizacion-stack]]) → 61 hallazgos crudos, cada uno pasado
por 3 escépticos. Lo peor que salió de mi código de esta noche:

- **El toque que despierta se colaba a la pantalla de abajo** y agregaba un producto al carrito. El
  overlay se desmonta en `pointerdown`, así que el `click` del mismo dedo aterrizaba en la tarjeta que
  quedó debajo. Arreglado consumiendo el gesto entero.
- **Mi anti-escaneo solo se tragaba la PRIMERA tecla.** Un escáner escribe ~13 caracteres en menos de
  100ms: las otras doce entraban igual y el POS procesaba un código mutilado. Ahora se descartan 500ms.
- **`restaurarFullscreen` era una variable muerta:** la condición era
  `restaurarFullscreen || ARRANCAR_FULLSCREEN`, y el segundo es una constante `true`. Salir de pantalla
  completa con F11 y abrir "Impresora…" te devolvía a fullscreen sin pedirlo.
- **Mi propia afirmación en el `CLAUDE.md` era falsa.** Escribí que reponer `logoUrl` falla el
  typecheck; lo probé y `tsc` sale 0 (el chequeo de propiedades excedentes no dispara sobre una
  variable). Corregido — en un repo cuyo backlog vive denunciando documentación que miente, no podía
  dejar una mentira nueva.
- **`transform: scale(0.8)`** sobre el ícono del carrito vacío no recuperaba **un solo píxel**: el
  transform se aplica después del layout.
- **`SuccessModal` quedó fuera del pase de altura** — está 100% con estilos inline, así que la media
  query no lo alcanzaba. Sale en **cada venta**.
- Y en el wrapper: la opción "Forzar 80 mm" fijaba la página en **297 mm**, o sea ~30 cm de rollo por
  recibo. Ahora se mide el alto real: **~34 metros de papel al día** en un negocio de 200 ventas.

## Por dónde retomar en frío
1. Leer [[00-INDEX]] (sección del 2026-08-27) + [[RUN-20260827-caja-adulto-mayor-y-recibo]].
2. **Lo primero no es código: es mirar.** Nada se pudo ver en pantalla (sin navegador en el entorno).
   Para el recibo quedó `temp/recibo-antes-y-despues.html` — se abre y se manda a la térmica con
   Ctrl+P. Para el resto hace falta abrir el POS a 1366×768.
3. El `.exe` regenerado está en `temp/ElVuelto-bambipan.zip`, con el fullscreen y el arreglo del rollo.
4. **Nada está commiteado**: ni esto, ni Docker, ni la beta del `.exe` del 08-24, ni el cerebro.
