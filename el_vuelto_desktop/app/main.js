'use strict'
const { app, BrowserWindow, ipcMain, Menu, shell, dialog } = require('electron')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')

const { bakedConfig, readUserConfig, writeUserConfig } = require('./config')

const CFG = bakedConfig()
const MAX_RECEIPT_BYTES = 512 * 1024 // un recibo real pesa ~4KB; el tope es contra abuso

let mainWindow = null
let setupWindow = null
let printChain = Promise.resolve() // las impresiones se serializan: una térmica es un recurso único

// Traza de beta: `ELVUELTO_DEBUG=1` deja ver por consola qué pasó con cada
// recibo. Es la única forma de diagnosticar una impresora remota sin estar
// sentado frente a la caja.
const DEBUG = process.env.ELVUELTO_DEBUG === '1'
function traza(...partes) {
  if (DEBUG) console.log('[elvuelto]', ...partes)
}

// ── Shim de window.open ──────────────────────────────────────────────────
// `printReceipt.ts:7-15` hace window.open('') → document.write(html) → close()
// → focus() → setTimeout(print). Con contextIsolation el preload NO puede
// pisar el window.open de la página, así que el shim se inyecta en el mundo
// principal desde el main process y desvía el HTML al puente de impresión.
// Gracias a esto el wrapper imprime en silencio contra la web YA desplegada,
// sin redeploy. La vía limpia (window.elVuelto.printReceipt) va aparte.
const OPEN_SHIM = `(() => {
  if (window.__elVueltoShim) return 'ya-estaba'
  if (!window.elVuelto || !window.elVuelto.printReceipt) return 'sin-puente'
  window.__elVueltoShim = true
  const nativeOpen = window.open.bind(window)
  window.open = function (url, target, features) {
    const enBlanco = !url || url === 'about:blank'
    if (!enBlanco) return nativeOpen(url, target, features)
    let buffer = ''
    return {
      closed: false,
      document: {
        write(html) { buffer += html },
        writeln(html) { buffer += html + '\\n' },
        open() {},
        close() {},
      },
      focus() {}, blur() {}, close() {},
      print() { window.elVuelto.printReceipt(buffer) },
    }
  }
  return 'instalado'
})()`

// ── Guardas de navegación ────────────────────────────────────────────────
// Esto carga código remoto dentro de una app de escritorio: todo lo que no
// sea el origen configurado sale al navegador del sistema, no acá adentro.
function mismoOrigen(url) {
  try {
    return new URL(url).origin === new URL(CFG.baseUrl).origin
  } catch {
    return false
  }
}

function blindar(contents) {
  contents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/i.test(url)) shell.openExternal(url)
    return { action: 'deny' }
  })
  contents.on('will-navigate', (e, url) => {
    if (!mismoOrigen(url)) {
      e.preventDefault()
      if (/^https?:/i.test(url)) shell.openExternal(url)
    }
  })
  contents.on('will-attach-webview', (e) => e.preventDefault())
}

function urlDeArranque() {
  const base = String(CFG.baseUrl || '').replace(/\/+$/, '')
  return CFG.slug ? `${base}/login/${CFG.slug}` : base
}

function titulo() {
  return CFG.displayName ? `El Vuelto — ${CFG.displayName}` : 'El Vuelto — Caja'
}

// ── Impresión silenciosa ─────────────────────────────────────────────────
async function esperarImagenes(win) {
  // OJO: desde el 2026-08-27 el recibo NO trae imágenes. Se quitó el logo del
  // negocio porque a 203 dpi salía como una mancha gris — ver el encabezado de
  // generateReceipt.ts. Con `document.images` vacío esto resuelve de inmediato
  // y no cuesta nada.
  //
  // Se conserva a propósito como red de seguridad: si algún día el recibo
  // vuelve a incluir una imagen (un QR de factura electrónica es el candidato
  // obvio), imprimir antes de que cargue la dejaría en blanco, y esperar sin
  // techo colgaría la caja si el servidor de esa imagen no responde.
  try {
    await win.webContents.executeJavaScript(`
      (async () => {
        const imgs = Array.from(document.images || [])
        await Promise.race([
          Promise.all(imgs.map((i) => i.complete
            ? Promise.resolve()
            : new Promise((r) => { i.onload = r; i.onerror = r }))),
          new Promise((r) => setTimeout(r, 3000)),
        ])
        return imgs.length
      })()
    `)
  } catch {
    /* si falla la espera igual imprimimos: mejor un recibo sin logo que ninguno */
  }
}

/**
 * Alto real del recibo, en micrones, para la opción "Forzar 80 mm".
 *
 * `pageSize` de Electron exige alto fijo — no existe "auto" como en el
 * `@page { size: 80mm auto }` del recibo. Estaba clavado en 297000 (el alto de
 * un A4): con esa opción activada, **cada venta avanzaba casi 30 cm de rollo**
 * para imprimir un recibo de 9. El cajero llega a esta opción justamente cuando
 * el automático le salió mal, así que es un camino probable, no exótico.
 *
 * Medirlo resuelve las dos puntas: ni desperdicia rollo ni corta un recibo
 * largo. Los topes son por si la medición sale absurda.
 */
async function altoDelReciboEnMicrones(win) {
  const POR_PX = 25400 / 96 // 1px CSS = 1/96 pulgada
  const MIN = 40000 //  4 cm — un recibo mínimo
  const MAX = 800000 // 80 cm — tope de cordura
  const FALLBACK = 200000 // 20 cm si no se pudo medir
  try {
    // OJO: NO usar `documentElement.scrollHeight`. Por CSSOM, el scrollHeight
    // del elemento raíz nunca baja del alto del VIEWPORT, así que en una
    // ventana oculta devuelve el alto de la ventana, no el del recibo — un
    // piso constante que hacía imprimir ~15cm de rollo para un recibo de 11.
    // El alto de verdad lo da la caja del <body>, que es quien tiene el
    // contenido y su padding.
    const px = await win.webContents.executeJavaScript(
      'Math.ceil(document.body.getBoundingClientRect().height || document.body.scrollHeight)',
    )
    if (!Number.isFinite(px) || px <= 0) return FALLBACK
    // Unos milímetros de cola para que el corte no se coma la última línea.
    const micrones = Math.round(px * POR_PX) + 4000
    return Math.min(MAX, Math.max(MIN, micrones))
  } catch {
    return FALLBACK
  }
}

async function imprimirHTML(html) {
  const user = readUserConfig()
  if (!user.printer) {
    abrirSetup('Elegí la impresora antes de imprimir el primer recibo.')
    traza('imprimir: rechazado —', 'sin-impresora')
    return { ok: false, motivo: 'sin-impresora' }
  }
  if (typeof html !== 'string' || !html.trim()) {
    traza('imprimir: rechazado —', 'recibo-vacio')
    return { ok: false, motivo: 'recibo-vacio' }
  }
  if (Buffer.byteLength(html, 'utf8') > MAX_RECEIPT_BYTES) {
    traza('imprimir: rechazado —', 'recibo-demasiado-grande')
    return { ok: false, motivo: 'recibo-demasiado-grande' }
  }

  traza('imprimir: recibí', Buffer.byteLength(html, 'utf8'), 'bytes para', JSON.stringify(user.printer))

  const tmp = path.join(os.tmpdir(), `elvuelto-recibo-${process.pid}-${Date.now()}.html`)
  fs.writeFileSync(tmp, html, 'utf8')

  const win = new BrowserWindow({
    show: false,
    // Tamaño explícito: el recibo mide 80mm (~302px a 96dpi) y con el default
    // de 800x600 el layout se calcula sobre un ancho que no es el del papel.
    width: 420,
    height: 400,
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true },
  })

  try {
    await win.loadFile(tmp)
    await esperarImagenes(win)

    const opciones = {
      silent: true,
      deviceName: user.printer,
      printBackground: true,
      margins: { marginType: 'none' },
    }
    // Sin decir nada, Chromium asume Carta/A4 — sobre una térmica de 80mm eso
    // sale cortado o comiéndose el rollo.
    //
    // POR DEFECTO se fuerza 80mm con alto MEDIDO, no el tamaño del driver.
    // Se cambió el 2026-08-27 con una térmica real enfrente: en automático el
    // recibo salía con un blanco grande arriba y recortado abajo y a la
    // derecha, que es lo que pasa cuando el driver reporta una página que no
    // es el rollo. Forzando 80mm el ancho lo ponemos nosotros, y el alto ya se
    // mide de verdad (ver altoDelReciboEnMicrones), así que no sobra ni falta
    // papel. 'auto' queda disponible por si una impresora se lleva mal con
    // pageSize explícito.
    if (user.pageWidth !== 'auto') {
      opciones.pageSize = { width: 80000, height: await altoDelReciboEnMicrones(win) }
    } else {
      opciones.usePrinterDefaultPageSize = true
    }

    traza('imprimir: opciones', JSON.stringify(opciones))

    const { success, failureReason } = await new Promise((resolve) => {
      win.webContents.print(opciones, (ok, motivo) => resolve({ success: ok, failureReason: motivo }))
    })

    traza('imprimir: resultado', success ? 'OK' : `FALLÓ (${failureReason})`)

    if (!success) {
      // Un recibo NO se puede perder en silencio: si no salió, el cajero se entera.
      dialog.showMessageBox(mainWindow ?? undefined, {
        type: 'error',
        title: 'No se pudo imprimir',
        message: `El recibo no salió por «${user.printer}».`,
        detail: String(failureReason || 'La impresora no respondió.'),
        buttons: ['Cambiar impresora', 'Cerrar'],
        defaultId: 0,
      }).then(({ response }) => { if (response === 0) abrirSetup() })
      return { ok: false, motivo: String(failureReason || 'error-impresora') }
    }
    return { ok: true }
  } catch (err) {
    dialog.showMessageBox(mainWindow ?? undefined, {
      type: 'error',
      title: 'No se pudo imprimir',
      message: 'El recibo no se pudo preparar para imprimir.',
      detail: String((err && err.message) || err),
      buttons: ['Cerrar'],
    })
    return { ok: false, motivo: String((err && err.message) || err) }
  } finally {
    if (!win.isDestroyed()) win.destroy()
    fs.unlink(tmp, () => {})
  }
}

function encolarImpresion(html) {
  printChain = printChain.then(() => imprimirHTML(html), () => imprimirHTML(html))
  return printChain
}

function reciboDePrueba() {
  const ahora = new Date().toLocaleString('es-CO')
  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"/>
<title>Prueba de impresión</title><style>
@page { size: 80mm auto; margin: 5mm 4mm 3mm 4mm; }
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: 'Courier New', Courier, monospace; font-size: 12px; width: 72mm; color: #000; line-height: 1.5; }
.c { text-align: center; }
pre { font-family: inherit; white-space: pre-wrap; }
</style></head><body>
<div class="c"><strong>EL VUELTO</strong></div>
<div class="c">PRUEBA DE IMPRESIÓN</div>
<pre>${'─'.repeat(32)}
Si estás leyendo esto en papel,
la impresora quedó bien
configurada.

Fecha: ${ahora}
${'─'.repeat(32)}</pre>
<div class="c">Gracias 🧾</div>
</body></html>`
}

// ── Setup de impresora (pantalla LOCAL, no remota) ───────────────────────
// Dos banderas distintas a propósito:
//  · restaurarFullscreen — la ventana YA estaba en pantalla completa y se salió
//    solo para mostrar el setup; hay que devolverla.
//  · entrarFullscreenTrasSetup — primer arranque: la ventana nació en modo
//    ventana para que el setup no quedara detrás, y hay que entrar al cerrarlo.
//
// Estaban colapsadas en `restaurarFullscreen || ARRANCAR_FULLSCREEN`, que es
// SIEMPRE verdadero (ARRANCAR_FULLSCREEN es una constante true). Efecto real:
// alguien que salía de pantalla completa con F11 y abría "Impresora…" volvía a
// fullscreen sin haberlo pedido.
let restaurarFullscreen = false
let entrarFullscreenTrasSetup = false

/** `!!mainWindow` solo dice que el objeto existe, no que sirva como padre. */
function ventanaViva() {
  return !!mainWindow && !mainWindow.isDestroyed()
}

function abrirSetup(aviso) {
  if (setupWindow && !setupWindow.isDestroyed()) {
    setupWindow.focus()
    return
  }

  // En Windows una ventana hija sobre un padre en pantalla completa puede
  // quedar detrás y dejar la caja congelada sin nada visible que tocar.
  // Se sale de fullscreen mientras dure el setup y se vuelve a entrar al
  // cerrarlo. Es la única forma que no depende del z-order del compositor.
  if (ventanaViva() && mainWindow.isFullScreen()) {
    restaurarFullscreen = true
    mainWindow.setFullScreen(false)
  }

  setupWindow = new BrowserWindow({
    width: 580,
    height: 680,
    title: 'El Vuelto — Impresora',
    parent: ventanaViva() ? mainWindow : undefined,
    // Modal: el cajero no puede tocar la caja hasta elegir impresora, que es
    // justamente el estado en que imprimir no funcionaría. Se exige ventana
    // VIVA: con una destruida, Electron construye un modal sin padre real que
    // queda sin dueño y sin forma de volver.
    modal: ventanaViva(),
    autoHideMenuBar: true,
    backgroundColor: '#fff8f0',
    webPreferences: {
      preload: path.join(__dirname, 'setup-preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })
  setupWindow.setMenuBarVisibility(false)
  setupWindow.loadFile(path.join(__dirname, 'setup.html'), {
    query: aviso ? { aviso } : undefined,
  })
  setupWindow.on('closed', () => {
    setupWindow = null
    if (ventanaViva()) {
      // Vuelve a pantalla completa SOLO si venía de ahí, o si este era el
      // primer arranque (que nace en ventana justamente para no tapar el setup).
      if (restaurarFullscreen || entrarFullscreenTrasSetup) {
        mainWindow.setFullScreen(true)
      }
      mainWindow.focus()
    }
    restaurarFullscreen = false
    entrarFullscreenTrasSetup = false
  })
}

// ── Ventana principal ────────────────────────────────────────────────────
// La caja abre a pantalla completa: el cajero no tiene que apretar F11 ni
// maximizar nada. NO es modo kiosko — F11 sigue saliendo (ver construirMenu).
const ARRANCAR_FULLSCREEN = true

function crearVentana() {
  // Primer arranque sin impresora configurada: se abre en ventana para que el
  // setup (que es ventana hija) no compita con un padre en pantalla completa.
  // Al cerrar el setup se entra en fullscreen. Sin esto hay parpadeo o, peor,
  // un diálogo invisible detrás.
  const yaConfigurada = !!readUserConfig().printer
  entrarFullscreenTrasSetup = ARRANCAR_FULLSCREEN && !yaConfigurada

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    fullscreen: ARRANCAR_FULLSCREEN && yaConfigurada,
    show: false,
    backgroundColor: '#fff8f0',
    title: titulo(),
    icon: path.join(__dirname, 'assets', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
    },
  })

  blindar(mainWindow.webContents)
  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
    // El setup es ventana hija: abrirlo antes de que el padre exista en
    // pantalla lo deja detrás o sin mostrarse en Windows.
    if (!readUserConfig().printer) {
      abrirSetup('Primero elegí a qué impresora salen los recibos.')
    }
  })

  // El shim se reinyecta en cada navegación del SPA.
  mainWindow.webContents.on('dom-ready', () => {
    mainWindow.webContents.executeJavaScript(OPEN_SHIM)
      .then((r) => traza('shim window.open:', r))
      .catch((e) => traza('shim window.open: ERROR', e && e.message))
  })

  if (DEBUG) {
    // La firma de 'console-message' cambió entre versiones de Electron:
    // vieja (event, nivel, mensaje), nueva (event, detalles). Aguanta las dos.
    mainWindow.webContents.on('console-message', (...args) => {
      const posible = args[1]
      const mensaje = posible && typeof posible === 'object' ? posible.message : args[2]
      traza('página:', mensaje)
    })
  }

  mainWindow.webContents.on('did-fail-load', (_e, code, desc, url, esPrincipal) => {
    if (!esPrincipal || code === -3 /* abortado por navegación */) return
    // Si la carga falló, 'ready-to-show' no disparó y la ventana sigue oculta:
    // un diálogo modal de una ventana oculta puede quedar invisible en Windows.
    if (!mainWindow.isVisible()) mainWindow.show()
    dialog.showMessageBox(mainWindow, {
      type: 'error',
      title: 'No se pudo conectar',
      message: 'No se pudo abrir la caja de El Vuelto.',
      detail: `${url}\n\n${desc} (${code})\n\nRevisá que el servidor esté encendido y que el equipo tenga red.`,
      buttons: ['Reintentar', 'Salir'],
      defaultId: 0,
    }).then(({ response }) => {
      if (response === 0) mainWindow.loadURL(urlDeArranque())
      else app.quit()
    })
  })

  mainWindow.loadURL(urlDeArranque())
}

// Un .exe sin config horneada no puede abrir nada. Es un error del generador,
// no del cajero: hay que decirlo con todas las letras y no dejar una ventana
// en blanco que parezca "no hay internet".
function configIncompleta() {
  return !CFG.baseUrl || !CFG.slug
}

function construirMenu() {
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    {
      label: 'El Vuelto',
      submenu: [
        { label: 'Impresora…', accelerator: 'CmdOrCtrl+P', click: () => abrirSetup() },
        { label: 'Recargar', accelerator: 'CmdOrCtrl+R', click: () => mainWindow?.reload() },
        // Sin esto F11 no hace NADA: este menú es a medida y no trae los roles
        // por defecto de Electron. Es la salida de emergencia de la pantalla
        // completa — el dueño pidió explícitamente que no fuera modo kiosko.
        // Deliberadamente NO se captura Escape: la webapp lo usa para cerrar
        // sus modales, y robárselo sacaría al cajero de fullscreen sin querer.
        { label: 'Pantalla completa', accelerator: 'F11', role: 'togglefullscreen' },
        { type: 'separator' },
        { label: 'Herramientas de desarrollo', accelerator: 'F12', click: () => mainWindow?.webContents.toggleDevTools() },
        { type: 'separator' },
        { role: 'quit', label: 'Salir' },
      ],
    },
    { label: 'Edición', submenu: [{ role: 'cut', label: 'Cortar' }, { role: 'copy', label: 'Copiar' }, { role: 'paste', label: 'Pegar' }, { role: 'selectAll', label: 'Seleccionar todo' }] },
  ]))
}

// ── IPC ──────────────────────────────────────────────────────────────────
// Ojo: 'elvuelto:print' queda expuesto a la página REMOTA. Es la feature, no
// un descuido — por eso las impresiones se serializan y el HTML tiene tope.
ipcMain.handle('elvuelto:print', (_e, html) => encolarImpresion(html))
ipcMain.handle('elvuelto:open-setup', () => { abrirSetup(); return true })

// Solo para la pantalla local de setup:
ipcMain.handle('elvuelto:printers', async () => {
  const wc = setupWindow?.webContents ?? mainWindow?.webContents
  return wc ? await wc.getPrintersAsync() : []
})
ipcMain.handle('elvuelto:get-config', () => ({ ...CFG, ...readUserConfig() }))
ipcMain.handle('elvuelto:save-config', (_e, patch) => {
  const limpio = {}
  if (typeof patch?.printer === 'string') limpio.printer = patch.printer
  if (patch?.pageWidth === 'auto' || patch?.pageWidth === '80mm') limpio.pageWidth = patch.pageWidth
  return writeUserConfig(limpio)
})
ipcMain.handle('elvuelto:test-print', (_e, patch) => {
  if (patch) {
    const limpio = {}
    if (typeof patch.printer === 'string') limpio.printer = patch.printer
    if (patch.pageWidth === 'auto' || patch.pageWidth === '80mm') limpio.pageWidth = patch.pageWidth
    writeUserConfig(limpio)
  }
  return encolarImpresion(reciboDePrueba())
})
ipcMain.handle('elvuelto:close-setup', () => { setupWindow?.close(); return true })

// ── Arranque ─────────────────────────────────────────────────────────────
// Una sola instancia: dos cajas abiertas contra la misma impresora es un lío.
if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })

  app.whenReady().then(() => {
    if (configIncompleta()) {
      dialog.showErrorBox(
        'Esta copia no está configurada',
        'El ejecutable se generó sin servidor o sin negocio.\n\n' +
        'Volvé a generarlo con build.py indicando la IP del servidor y el slug del negocio.',
      )
      app.quit()
      return
    }
    construirMenu()
    crearVentana() // el setup lo abre 'ready-to-show' si falta la impresora
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) crearVentana()
    })
  })

  app.on('window-all-closed', () => app.quit())
}
