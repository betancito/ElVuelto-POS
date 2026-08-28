/**
 * Banco de pruebas del tragador de gesto del salvapantallas.
 *
 *     node scripts/probar-tragador-reposo.mjs
 *
 * POR QUÉ EXISTE
 * El bug de "el toque que despierta agrega un producto al carrito" ya se
 * arregló mal DOS veces (2026-08-27, dos intentos). Las dos veces el arreglo se
 * veía correcto leyéndolo y fallaba con un gesto concreto: primero con el toque
 * sostenido, después con el doble toque. Es un bug de ORDEN Y TIEMPO de eventos
 * del DOM, y eso no se ve leyendo ni lo atrapa `tsc`.
 *
 * QUÉ HACE
 * No es una copia de la lógica: extrae el TEXTO REAL de
 * `despertarConsumiendoGesto` desde IdleScreensaver.tsx y lo ejecuta contra un
 * DOM mínimo con reloj virtual. Si el archivo cambia, esto prueba lo nuevo.
 * Cero dependencias — el repo no tiene framework de tests y esto no agrega uno.
 *
 * VALIDADO: contra la versión del primer intento da 4 fallos de 8; contra la
 * del segundo intento, 1 de 8. O sea que el banco SÍ distingue arreglo de
 * espejismo. Si algún día pasa 8/8 con el código roto, el banco está mintiendo.
 *
 * Para probar otra versión del archivo:  SRC=/ruta/a/otro.tsx node scripts/...
 */
import { readFileSync } from 'node:fs'

const SRC = process.env.SRC || '/Users/betancurduque/Development/Personal/ElVuelto-POS/el_vuelto_frontend/src/components/ui/IdleScreensaver.tsx'
const src = readFileSync(SRC, 'utf8')

// ── extraer la función real ────────────────────────────────────────────────
const ini = src.indexOf('const despertarConsumiendoGesto = useCallback(')
if (ini < 0) throw new Error('no encontré despertarConsumiendoGesto')
const desde = src.indexOf('(e: React.PointerEvent) => {', ini)
let i = src.indexOf('{', desde), prof = 0, fin = -1
for (; i < src.length; i++) {
  if (src[i] === '{') prof++
  else if (src[i] === '}') { prof--; if (prof === 0) { fin = i + 1; break } }
}
let cuerpo = src.slice(desde, fin)
  .replace('(e: React.PointerEvent)', '(e)')
  .replace(/\(ev: MouseEvent\)/g, '(ev)')
  .replace(/\(ev: PointerEvent\)/g, '(ev)')
  .replace(/\(ms: number\)/g, '(ms)')
console.log('· función extraída del archivo real:', cuerpo.split('\n').length, 'líneas\n')

// constantes reales, leídas del mismo archivo
const num = (n) => Number(new RegExp(`const ${n} = ([0-9_]+)`).exec(src)[1].replace(/_/g, ''))
const GRACIA_TRAS_SOLTAR_MS = num('GRACIA_TRAS_SOLTAR_MS')
const RED_DE_SEGURIDAD_MS = num('RED_DE_SEGURIDAD_MS')
console.log(`· GRACIA_TRAS_SOLTAR_MS=${GRACIA_TRAS_SOLTAR_MS}  RED_DE_SEGURIDAD_MS=${RED_DE_SEGURIDAD_MS}\n`)

// ── DOM mínimo con reloj virtual ───────────────────────────────────────────
function crearEntorno() {
  let ahora = 0, seq = 0
  const timers = new Map()
  const cap = { click: [], pointerup: [], pointercancel: [] }
  let recibidoPorLaApp = []

  const win = {
    addEventListener: (t, fn, o) => { if (o && o.capture && cap[t]) cap[t].push(fn) },
    removeEventListener: (t, fn, o) => {
      if (o && o.capture && cap[t]) { const k = cap[t].indexOf(fn); if (k >= 0) cap[t].splice(k, 1) }
    },
    setTimeout: (fn, ms) => { const id = ++seq; timers.set(id, { fn, en: ahora + ms }); return id },
    clearTimeout: (id) => timers.delete(id),
  }
  const avanzar = (ms) => {
    const meta = ahora + ms
    for (;;) {
      let sig = null
      for (const [id, t] of timers) if (t.en <= meta && (!sig || t.en < sig[1].en)) sig = [id, t]
      if (!sig) break
      timers.delete(sig[0]); ahora = sig[1].en; sig[1].fn()
    }
    ahora = meta
  }
  // dispara un evento: capture primero; si nadie corta, llega "a la app"
  const disparar = (tipo, props = {}) => {
    let cortado = false
    const ev = { type: tipo, ...props, preventDefault() {}, stopPropagation() { cortado = true } }
    for (const fn of [...cap[tipo] || []]) fn(ev)
    if (tipo === 'click' && !cortado) recibidoPorLaApp.push(ahora)
    return !cortado
  }
  return { win, avanzar, disparar, app: () => recibidoPorLaApp, reset: () => (recibidoPorLaApp = []) }
}

function nuevoTragador(env) {
  const limpiarTragadorRef = { current: null }
  let despertares = 0
  const despertar = () => despertares++
  const fn = new Function(
    'window', 'GRACIA_TRAS_SOLTAR_MS', 'RED_DE_SEGURIDAD_MS', 'limpiarTragadorRef', 'despertar',
    `return ${cuerpo}`,
  )(env.win, GRACIA_TRAS_SOLTAR_MS, RED_DE_SEGURIDAD_MS, limpiarTragadorRef, despertar)
  return { fn, limpiarTragadorRef, despertares: () => despertares }
}

// ── casos ──────────────────────────────────────────────────────────────────
let ok = 0, mal = 0
const caso = (nombre, esperado, fn) => {
  const env = crearEntorno()
  const t = nuevoTragador(env)
  fn(env, t)
  const fantasmas = env.app().length
  const pasa = fantasmas === esperado
  console.log(`${pasa ? '✅' : '🔴'} ${nombre}\n     clicks que llegaron a la app: ${fantasmas} (esperado ${esperado})`)
  pasa ? ok++ : mal++
}

caso('1· Toque simple: down → up(80ms) → click', 0, (env, t) => {
  t.fn({ pointerId: 1, preventDefault() {}, stopPropagation() {} })
  env.avanzar(80); env.disparar('pointerup', { pointerId: 1 })
  env.avanzar(5); env.disparar('click')
})

caso('2· DOBLE TOQUE (el bug que encontró la revisión)', 0, (env, t) => {
  t.fn({ pointerId: 1, preventDefault() {}, stopPropagation() {} })
  env.avanzar(80); env.disparar('pointerup', { pointerId: 1 })
  env.avanzar(5);  env.disparar('click')                       // click #1
  env.avanzar(150); env.disparar('pointerup', { pointerId: 2 }) // 2º toque (overlay ya desmontado)
  env.avanzar(5);  env.disparar('click')                       // click #2 ← este se colaba
})

caso('3· Toque sostenido 600ms (el gesto del adulto mayor)', 0, (env, t) => {
  t.fn({ pointerId: 1, preventDefault() {}, stopPropagation() {} })
  env.avanzar(600); env.disparar('pointerup', { pointerId: 1 })
  env.avanzar(5);   env.disparar('click')
})

caso('4· Toque sostenido 8s (pasa la red de seguridad de 5s)', 0, (env, t) => {
  t.fn({ pointerId: 1, preventDefault() {}, stopPropagation() {} })
  env.avanzar(8000); env.disparar('pointerup', { pointerId: 1 })
  env.avanzar(5);    env.disparar('click')
})

caso('5· pointercancel (scroll del navegador se roba el gesto)', 0, (env, t) => {
  t.fn({ pointerId: 1, preventDefault() {}, stopPropagation() {} })
  env.avanzar(50); env.disparar('pointercancel', { pointerId: 1 })
  env.avanzar(5);  env.disparar('click')
})

caso('6· NO sobre-traga: click legítimo 1.2s después SÍ debe pasar', 1, (env, t) => {
  t.fn({ pointerId: 1, preventDefault() {}, stopPropagation() {} })
  env.avanzar(80); env.disparar('pointerup', { pointerId: 1 })
  env.avanzar(5);  env.disparar('click')      // el del despertar: tragado
  env.avanzar(1200); env.disparar('click')    // el cajero apretando de verdad
})

caso('7· Otro dedo (pointerId distinto) no cierra la ventana antes de tiempo', 0, (env, t) => {
  t.fn({ pointerId: 1, preventDefault() {}, stopPropagation() {} })
  env.avanzar(20); env.disparar('pointerup', { pointerId: 9 })  // otro dedo suelta
  env.avanzar(400); env.disparar('pointerup', { pointerId: 1 }) // el nuestro
  env.avanzar(5);   env.disparar('click')
})

caso('8· Dos despertares seguidos no dejan tragadores huérfanos', 1, (env, t) => {
  t.fn({ pointerId: 1, preventDefault() {}, stopPropagation() {} })
  env.avanzar(80); env.disparar('pointerup', { pointerId: 1 })
  env.avanzar(5);  env.disparar('click')
  env.avanzar(10000)
  t.fn({ pointerId: 2, preventDefault() {}, stopPropagation() {} })  // 2º reposo
  env.avanzar(80); env.disparar('pointerup', { pointerId: 2 })
  env.avanzar(5);  env.disparar('click')
  env.avanzar(2000); env.disparar('click')   // legítimo: debe pasar
})

console.log(`\n───────────────────────────────\nPASAN: ${ok}   FALLAN: ${mal}`)
process.exit(mal ? 1 : 0)
