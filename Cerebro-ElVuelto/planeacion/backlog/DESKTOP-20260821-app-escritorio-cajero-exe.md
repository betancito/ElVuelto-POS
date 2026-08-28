---
tags: [tarea, feature, desktop, front, impresion]
status: 🟡
prioridad: feature
updated: 2026-08-24
---

# DESKTOP-20260821-app-escritorio-cajero-exe — App de escritorio (.exe) para la caja

> [!decision] El owner lo va a hacer "sí o sí"
> Esto no es una idea suelta: el owner pidió explícitamente dejarlo documentado porque **es una feature
> que va a construir**. Lo que sigue es la evaluación de factibilidad del 2026-08-21, con las
> alternativas que se descartaron y por qué. **Nada está implementado.** El ADR se escribe cuando se
> apruebe el plan de la fase 1.

## Qué pidió el owner (textual)
Un módulo nuevo en el **dashboard del tenant admin** desde el cual se pueda **descargar un `.exe`** de
una aplicación ligada a la página del cajero de ese negocio — p. ej.
`www.elvuelto.com/login/<tenant_slug>` — con el dominio configurado en el `.env` del frontend cuando
exista.

## Motivos reales, confirmados por el owner (2026-08-21)
Se le preguntó cuál era el dolor de fondo. Marcó **tres de cuatro**:
1. 🖨️ **Impresión silenciosa del recibo** — que salga a la térmica sin el diálogo de Windows.
2. 🖥️ **Ícono en el escritorio / ventana propia** — que el cajero no escriba una URL.
3. 💼 **Verse más profesional al vender el SaaS** — que el cliente sienta que instaló un software.

**NO marcó** modo kiosko / bloquear el equipo. Queda fuera del alcance salvo que lo pida después.

> El punto 1 es el que decide la arquitectura, y **no salió del pedido**: lo encontró el Planner leyendo
> `printReceipt.ts`. Es lo único de los tres que un navegador no puede hacer por diseño.

## Veredicto de factibilidad: ✅ posible, pero el pedido tiene el peso al revés
El "módulo para descargar el `.exe`" es **la pieza más chica de todo el trabajo** (una card + un endpoint
que hace redirect). El trabajo real es el wrapper y el puente de impresión.

## La trampa: NO se genera un `.exe` por tenant en el servidor
Un `.exe` es un binario de Windows; un Django en Linux no lo compila bajo demanda, y aunque pudiera
serían minutos de CPU y ~100MB por descarga. **No hace falta:** el binario es un navegador apuntando a
una URL, así que se compila **uno solo** y el slug entra por fuera. Tres formas, de mejor a peor:

| # | Cómo | Costo por tenant | Nota |
|---|---|---|---|
| 1 | **Slug en el nombre del archivo** — se sirve el mismo binario como `ElVuelto-<slug>.exe`; al primer arranque la app lee su `process.execPath`, extrae el slug y lo guarda | cero | Renombrar un `.exe` **no rompe la firma Authenticode** (firma el contenido PE, no el nombre) |
| 2 | **ZIP con `config.json`** al lado del exe | cero | El admin descarga un `.zip`, no un `.exe` — contradice el pedido |
| 3 | **Pantalla de configuración inicial** — la app pregunta una vez cuál es el negocio | cero | Lo más tonto y lo más robusto; buen fallback |

⚠️ **Lo que NO se puede hacer: inyectar el slug dentro del binario.** Agregarle bytes a un `.exe` firmado
**invalida la firma**. Por eso el slug va por nombre de archivo o por config, nunca embebido.

> [!warning] Gotcha del nombre de archivo (opción 1)
> Si el admin descarga dos veces, Windows guarda `ElVuelto-panaderia (1).exe` y el parser del slug se
> rompe. El parser tiene que tolerar el sufijo ` (n)`.

## Alternativas de tecnología evaluadas — se propone **Electron**
| opción | veredicto |
|---|---|
| **PWA** (manifest + service worker) | ❌ **Descartada por el motivo 1.** Da ícono, ventana propia y URL horneada por ~1 día de trabajo, sin firma ni hosting — pero **no puede imprimir sin diálogo**, por diseño del navegador. Habría sido la respuesta si el owner solo hubiera marcado los motivos 2 y 3 |
| **Tauri** | ❌ Descartada. Pesa ~5MB contra ~100MB de Electron (usa el WebView2 del sistema), pero su impresión pasa por el `window.print()` del webview → diálogo. Justo lo que hay que eliminar |
| **Electron** | ✅ **Propuesta.** `webContents.print({silent: true, deviceName})` es API documentada de primera clase y funciona también en macOS. Los ~100MB se instalan una vez |

**Esta elección todavía NO es un ADR ratificado** — es la recomendación del Planner. Se formaliza cuando
el owner apruebe el plan de la fase 1.

## Alcance real — 4 piezas, en orden de riesgo
1. **Wrapper Electron** — un `BrowserWindow` cargando la URL del tenant. Chico, pero con seguridad no
   negociable: `contextIsolation: true`, `nodeIntegration: false`, preload angosto. Se está cargando
   **código remoto dentro de una app de escritorio**.
2. **Puente de impresión silenciosa** — ver abajo; es el corazón de la feature.
3. **Selector de impresora** — `getPrintersAsync()` una vez y guardado, o el cajero no sabe a dónde
   salió el recibo.
4. **Módulo de descarga en el tenant admin** — lo que el owner pidió; molde ya existe (ver abajo).

## Anclas de código (verificadas el 2026-08-21, HEAD `eacaae0`)
- `src/utils/printReceipt.ts:7` — `window.open('', '_blank', ...)`, y `:12-14` `win.print()` + `win.close()`.
  **Dentro de Electron ese `window.open` dispara el handler de ventanas nuevas y se comporta distinto:
  adaptarlo NO es opcional.** La forma correcta es que `printReceipt` detecte si corre en el wrapper
  (`window.elVuelto?.printReceipt(html)`) y si no, caiga al comportamiento actual — un solo archivo,
  idéntico en navegador.
- Call sites de `printReceipt`: `src/features/sales/components/SuccessModal.tsx:202` y
  `src/features/sales/SalesHistoryPage.tsx:69`. **Son solo dos.**
- `src/utils/generateReceipt.ts:10` — `generateReceiptHTML(sale, tenant): string`. El recibo ya es un
  string de HTML autocontenido: **el puente puede pasarlo tal cual**, no hay que rehacer el layout.
- `src/app/router.tsx:73` — `path: '/login/:tenantSlug'`. La ruta que el wrapper va a cargar ya existe.
- `src/app/apiBase.ts:7` — `import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api'`. Único punto
  donde vive la URL base hoy.
- `src/features/users/UsersPage.tsx:235` — `ta-url-card` con la URL de acceso del personal + botón
  copiar. **Es el molde exacto del módulo de descarga**; no hay que inventar diseño.
- `el_vuelto_backend/elvuelto/settings/base.py:173-175` — `CORS_ALLOWED_ORIGINS` sale de `.env`, default
  `http://localhost:5173`.

## Lo que cuesta (y no es código)
- 🔴 **Firma de código, ~USD 200-400/año.** Sin firmar, Windows muestra *"Windows protegió su PC"*
  (SmartScreen) y el cajero tiene que entrar a "Más información → Ejecutar de todas formas". Desde 2023
  el certificado OV exige token físico o HSM en la nube. **Un `.exe` sin firmar se ve MENOS profesional
  que una PWA** — o sea, contradice el motivo 3. Si se va por este camino, el certificado no es opcional.
  - Ventaja del binario único: **una sola reputación de SmartScreen** para todos los tenants.
- 🔴 **Hosting del binario.** Cloudinary es para imágenes; ~100MB de instalador no van ahí. Hace falta
  S3/R2/GitHub Releases. El backend solo devuelve un redirect con el `Content-Disposition` armado.
- 🟡 **Runner Windows** para compilar (GitHub Actions `windows-latest`, gratis, ~15 líneas de YAML).

## Restricciones del entorno del owner (2026-08-21)
- ~~**Trabaja en macOS.** Desde ahí **no se genera un `.exe` confiable**…~~ ❌ **DESMENTIDO el
  2026-08-24.** Se generó un `.exe` real desde el Mac (arm64, **sin wine**): `@electron/packager` para
  `win32/x64` + `resedit` (JS puro) para el ícono y los metadatos. `file` → `PE32+ executable (GUI)
  x86-64`. Lo que exigía wine era `rcedit`, y `resedit` lo reemplaza. **El CI en Windows no es
  prerrequisito para producir binarios** — servirá para firmar y automatizar. Ver
  [[ADR-DESKTOP-20260824-wrapper-electron-y-generador-manual]].
- ⚠️ **Corregido también el plan de validación:** la ficha proponía validar el wrapper en el Mac como
  `.app`. El owner lo descartó el 2026-08-24 — *"NO VOY A TESTEAR EN LA MAC… ESTE WEBAPP ESTA PENSADO
  PARA WINDOWS"*. La validación funcional es en Windows, con la térmica.
- ⚠️ **La validación final de impresión tiene que ser en Windows con la térmica real** — el driver de una
  80mm se comporta distinto en Windows que en macOS.
- **No hay deploy todavía** (el owner lo hace el fin de semana del 2026-08-22/23). **No es bloqueante
  para la fase 1:** para desarrollar el wrapper alcanza `localhost`.
- El owner va a exponer sus contenedores a la LAN con nginx para probar desde otro dispositivo apuntando
  a la IP de su máquina. **Eso lo hace él por separado — el Planner no lo planea ni lo ejecuta**
  (pedido explícito). El wrapper puede apuntar a `http://192.168.x.x:5173/login/<slug>` igual de bien
  que a un dominio.
- Dependencia real: [[BACKEND-20260811-falta-https-enforcement-produccion]] (🔴, `settings/production.py`
  con **cero** `SECURE_*`). En producción el wrapper tiene que cargar HTTPS.

## Fases propuestas
**Fase 1 — 🟢 IMPLEMENTADA el 2026-08-24 como beta manual, ⚠️ sin validar en papel.** Wrapper Electron +
puente de impresión + selector de impresora + generador `build.py`, en `el_vuelto_desktop/`. Ver
[[RUN-20260824-beta-manual-exe-caja]]. Lo que falta es exactamente lo que decide si la feature vale la
pena: **que el owner la corra en Windows contra la térmica**. Si la impresión silenciosa no sale limpia,
mejor saberlo antes de comprar el certificado.

**Fase 2 — después del deploy:** módulo de descarga en el tenant admin, build del `.exe` en CI, hosting y
firma de código.

## Lo que esta feature NO da
❌ **Offline.** Sigue siendo un navegador apuntando al servidor: si se cae el internet del local, el POS
se cae igual. Un POS offline de verdad es otro proyecto (BD local + cola de ventas + resolución de
conflictos). **No dejar que el `.exe` cree esa ilusión ante el cliente.**

## Decisiones pendientes
- ✅ **Resuelto para la beta (2026-08-24):** el slug va en un `config.json` **horneado dentro del
  paquete** — la forma más simple, viable porque todavía no se firma. Cuando entre la firma hay que
  pasar a la opción 1 (nombre de archivo): agregarle bytes a un `.exe` firmado invalida la firma.
- ✅ **Resuelto (2026-08-24):** la estructura es `el_vuelto_desktop/` con su propio `package.json`,
  ratificada en [[ADR-DESKTOP-20260824-wrapper-electron-y-generador-manual]].
- ❓ Cuál de las 3 formas de meter el slug **para cuando haya firma** (recomendada: **1**).
- ❓ Estructura en el monorepo: una carpeta nueva `el_vuelto_desktop/` con su propio `package.json`.
  Es un cambio estructural del repo → amerita ADR.
- ❓ Auto-update: como el wrapper es delgado sobre una URL, la app web se actualiza sola al recargar y el
  wrapper casi nunca necesita update. Cuando lo necesite hace falta un feed (`electron-updater`).

## Enlaces
[[patron-impresion-recibos]] · [[BACKEND-20260811-falta-https-enforcement-produccion]] ·
[[2026-08-20-planner-paso0-resync]]
