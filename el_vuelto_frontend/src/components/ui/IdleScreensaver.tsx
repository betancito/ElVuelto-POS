import { useCallback, useEffect, useRef, useState } from 'react'
import './idle-screensaver.css'

/**
 * Salvapantallas de reposo para las pantallas de caja.
 *
 * Tras `timeoutMs` sin actividad tapa la pantalla con la marca de El Vuelto. Al
 * tocarla llama a `onWake`, que es donde el POS refresca sus datos (un refetch
 * de RTK Query, NO un location.reload: recargar la página tiraría el estado del
 * turno del cajero).
 *
 * Reglas que importan y no son obvias:
 *
 * - **`disabled` corta todo.** El POS lo activa cuando el carrito tiene
 *   productos. Un cajero que dejó media venta cargada y se fue a buscar algo no
 *   puede volver y encontrarse un salvapantallas encima de su venta.
 * - **Mover el mouse cuenta como presencia, pero NO despierta.** Son dos cosas
 *   distintas a propósito: `pointermove` reinicia el reloj de inactividad
 *   (alguien está ahí), pero con la pantalla ya dormida solo la sacan del
 *   reposo un toque, un clic o una tecla. En una caja el mouse se roza sin
 *   querer todo el tiempo, y si eso despertara, el reposo no serviría de nada.
 *   Efecto conocido: en un equipo cuyo sensor de mouse tiene deriva, el reposo
 *   podría no llegar a entrar nunca. Es preferible a lo contrario.
 * - **La actividad se anota en un ref, no en estado.** `pointermove` dispara
 *   decenas de veces por segundo: pasarlo por `useState` re-renderizaría el POS
 *   entero mientras el cajero mueve el mouse.
 * - **El logo se desplaza despacio.** Una caja queda encendida el día entero
 *   contra el mismo fondo; un logo fijo es justamente cómo se quema un panel.
 */

/** Eventos que cuentan como "el cajero está ahí". */
const ACTIVITY_EVENTS = ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart'] as const

/** Cada cuánto se revisa el reloj de inactividad. */
const CHECK_MS = 5_000

/**
 * Cuánto se siguen descartando teclas después de despertar con una.
 *
 * Un escáner de códigos de barras es un teclado que escribe ~13 caracteres en
 * menos de 100ms y cierra con Enter. Si solo se descarta la PRIMERA tecla, las
 * otras doce entran igual al buffer de PosPage y el POS procesa un código
 * mutilado. 500ms cubre el escaneo entero y además supera los 300ms de espera
 * con que ese buffer se vacía solo, así que lo que quedó adentro se descarta.
 */
const TRAGAR_TECLAS_MS = 500

/**
 * Cuánto se sigue tragando el `click` después de que el dedo SE LEVANTA.
 *
 * El `click` de compatibilidad llega inmediatamente después del `pointerup`,
 * pero en táctil puede demorarse unos ms. 400 cubre dos cosas: ese click, y el
 * SEGUNDO toque de un doble toque (intervalo humano típico 150-300ms), que es
 * el agujero por el que se colaba el producto fantasma cuando el tragador se
 * desarmaba con el primer click. Y son muy pocos para comerse un toque que el
 * cajero pensó aparte: nadie levanta el dedo y vuelve a tocar en 400ms.
 */
const GRACIA_TRAS_SOLTAR_MS = 400

/**
 * Tope absoluto del tragador, por si el `pointerup` nunca llega (el dedo sale
 * del digitalizador, la ventana pierde el foco, otro elemento captura el
 * puntero). Sin esto el tragador se quedaría armado esperando para comerse el
 * próximo toque bueno.
 */
const RED_DE_SEGURIDAD_MS = 5_000

export const IDLE_TIMEOUT_MS = 5 * 60 * 1000

interface Props {
  /** Inactividad necesaria para entrar en reposo. */
  timeoutMs?: number
  /** Si es true, nunca entra en reposo (y si ya estaba, despierta). */
  disabled?: boolean
  /** Se llama al despertar. Acá va el refetch. */
  onWake?: () => void
}

export default function IdleScreensaver({
  timeoutMs = IDLE_TIMEOUT_MS,
  disabled = false,
  onWake,
}: Props) {
  const [idle, setIdle] = useState(false)
  const [tragandoTeclas, setTragandoTeclas] = useState(false)
  const [now, setNow] = useState(() => new Date())
  const lastActivityRef = useRef(Date.now())
  /** Cierra el tragador de click del gesto en curso, si hay uno. */
  const limpiarTragadorRef = useRef<(() => void) | null>(null)

  // ── Registrar actividad ────────────────────────────────────────────────
  useEffect(() => {
    const marcar = () => {
      lastActivityRef.current = Date.now()
    }
    for (const ev of ACTIVITY_EVENTS) {
      window.addEventListener(ev, marcar, { passive: true })
    }
    return () => {
      for (const ev of ACTIVITY_EVENTS) window.removeEventListener(ev, marcar)
    }
  }, [])

  // ── Vigilar el reloj de inactividad ────────────────────────────────────
  useEffect(() => {
    if (disabled) {
      // Que el carrito deje de estar vacío mientras la pantalla duerme no
      // debería poder pasar, pero si pasa, gana la venta.
      setIdle(false)
      lastActivityRef.current = Date.now()
      return
    }
    const id = window.setInterval(() => {
      if (Date.now() - lastActivityRef.current >= timeoutMs) setIdle(true)
    }, CHECK_MS)
    return () => window.clearInterval(id)
  }, [disabled, timeoutMs])

  // ── Reloj visible, solo mientras duerme ────────────────────────────────
  useEffect(() => {
    if (!idle) return
    setNow(new Date())
    const id = window.setInterval(() => setNow(new Date()), 30_000)
    return () => window.clearInterval(id)
  }, [idle])

  const despertar = useCallback(() => {
    lastActivityRef.current = Date.now()
    setIdle(false)
    onWake?.()
  }, [onWake])

  /**
   * El toque que despierta NO debe llegar a la pantalla de abajo.
   *
   * `onPointerDown` desmonta el overlay de inmediato, así que el `click` que
   * viene después del mismo dedo aterriza sobre lo que quedó debajo: si eso era
   * una tarjeta de producto, el cajero despierta la caja y **agrega un producto
   * que nunca quiso**. Es un fantasma difícil de diagnosticar porque solo pasa
   * en el primer toque tras el reposo.
   *
   * > `preventDefault()` sobre `pointerdown` NO sirve para esto. Por spec
   * > (Pointer Events L3, "Compatibility mapping with mouse events") cancelar
   * > `pointerdown` suprime `mousedown`/`mouseup`, pero **el `click` se dispara
   * > igual**. O sea que el tragador no es la segunda defensa: es la ÚNICA.
   *
   * Por eso el tragador NO puede vivir contra un reloj arrancado en el
   * `pointerdown`. La primera versión se removía a los 400ms desde que el dedo
   * BAJABA, y un toque sostenido medio segundo —el gesto normal de un adulto
   * mayor, que es justo para quien se diseñó esta caja— soltaba cuando el
   * tragador ya no estaba: el `click` pasaba y el producto entraba igual.
   *
   * La ventana se ata al GESTO, no al reloj: se cierra un ratito después del
   * `pointerup`/`pointercancel` del MISMO `pointerId`, que es cuando el `click`
   * de compatibilidad realmente puede llegar. El reloj queda solo como red de
   * seguridad por si el `pointerup` nunca aparece (el dedo se va del
   * digitalizador, la ventana pierde el foco, el gesto lo captura otro).
   */
  const despertarConsumiendoGesto = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault()
      e.stopPropagation()

      limpiarTragadorRef.current?.()

      const pointerId = e.pointerId
      let cerrado = false
      let dedoAbajo = true

      // NO se desarma al tragar. La primera versión de esto llamaba a `cerrar()`
      // acá, y era un tragador de un solo tiro: en un DOBLE TOQUE —down1, up1,
      // click1, down2, up2, click2— el click1 lo desarmaba y el click2 pasaba
      // limpio a la tarjeta de abajo. O sea que el fantasma volvía por la puerta
      // de al lado, y justo con el hábito de quien viene del escritorio, que es
      // el perfil de esta caja. La ventana la cierra SOLO el reloj.
      const tragarClick = (ev: MouseEvent) => {
        ev.preventDefault()
        ev.stopPropagation()
      }

      const alSoltar = (ev: PointerEvent) => {
        if (ev.pointerId !== pointerId) return
        dedoAbajo = false
        window.removeEventListener('pointerup', alSoltar, { capture: true })
        window.removeEventListener('pointercancel', alSoltar, { capture: true })
        // El `click` llega justo después del `pointerup`; en táctil puede
        // demorarse unos ms. Esta es la única espera contra reloj que queda, y
        // arranca donde debe: cuando el dedo SE LEVANTA. 400ms cubren de sobra
        // el click propio Y el segundo toque de un doble toque (150-300ms),
        // y son muy pocos para comerse un toque que el cajero pensó aparte.
        reprogramar(GRACIA_TRAS_SOLTAR_MS)
      }

      const cerrar = () => {
        if (cerrado) return
        cerrado = true
        window.clearTimeout(temporizador)
        window.removeEventListener('click', tragarClick, { capture: true })
        window.removeEventListener('pointerup', alSoltar, { capture: true })
        window.removeEventListener('pointercancel', alSoltar, { capture: true })
        if (limpiarTragadorRef.current === cerrar) limpiarTragadorRef.current = null
      }

      // La red de seguridad NO puede cerrar con el dedo todavía abajo: el click
      // no ha pasado y cerrar ahí deja el fantasma servido. Si a los 5s el dedo
      // sigue apoyado (se quedó pensando, o se apoyó la palma), se renueva.
      const vencer = () => {
        if (dedoAbajo) {
          temporizador = window.setTimeout(vencer, RED_DE_SEGURIDAD_MS)
          return
        }
        cerrar()
      }
      let temporizador = window.setTimeout(vencer, RED_DE_SEGURIDAD_MS)
      const reprogramar = (ms: number) => {
        window.clearTimeout(temporizador)
        temporizador = window.setTimeout(cerrar, ms)
      }

      window.addEventListener('click', tragarClick, { capture: true })
      window.addEventListener('pointerup', alSoltar, { capture: true })
      window.addEventListener('pointercancel', alSoltar, { capture: true })
      limpiarTragadorRef.current = cerrar

      despertar()
    },
    [despertar],
  )

  // Los listeners del tragador se registran a mano (no en un efecto), así que
  // hay que soltarlos si el componente se va con un gesto todavía en curso.
  useEffect(() => () => limpiarTragadorRef.current?.(), [])

  // Una tecla también despierta — pero el evento se DESCARTA, no se deja pasar.
  //
  // El POS tiene un listener de códigos de barras en `document` (keydown en
  // burbujeo) que acumula caracteres con un timer de 300ms. Si un escaneo sobre
  // la pantalla dormida despertara y además dejara correr las teclas, el primer
  // carácter (o los primeros) ya se habría perdido en el despertar y al buffer
  // le entraría un código MUTILADO: el POS agregaría un producto equivocado, o
  // ninguno, sin que el cajero entienda por qué.
  //
  // Por eso el listener va en `window` en fase de CAPTURA — que corre antes que
  // el de `document` en burbujeo — y corta la propagación. El escaneo despierta
  // la pantalla y el cajero vuelve a pasar el producto.
  useEffect(() => {
    if (!idle) return
    const onKey = (e: KeyboardEvent) => {
      e.stopPropagation()
      e.preventDefault()
      // Descartar solo ESTA tecla no alcanza: al despertar, el overlay se va y
      // las once o doce teclas restantes del escaneo entran igual. Hay que
      // seguir tragando un rato (ver TRAGAR_TECLAS_MS).
      setTragandoTeclas(true)
      despertar()
    }
    window.addEventListener('keydown', onKey, { capture: true })
    return () => window.removeEventListener('keydown', onKey, { capture: true })
  }, [idle, despertar])

  // Ventana de gracia tras despertar con una tecla: se descarta todo el resto
  // del escaneo para que el buffer de códigos de PosPage no reciba un fragmento.
  useEffect(() => {
    if (!tragandoTeclas) return
    const tragar = (e: KeyboardEvent) => {
      e.stopPropagation()
      e.preventDefault()
    }
    window.addEventListener('keydown', tragar, { capture: true })
    const id = window.setTimeout(() => setTragandoTeclas(false), TRAGAR_TECLAS_MS)
    return () => {
      window.removeEventListener('keydown', tragar, { capture: true })
      window.clearTimeout(id)
    }
  }, [tragandoTeclas])

  if (!idle) return null

  const hora = now.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
  const fecha = now.toLocaleDateString('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  return (
    <div
      className="idle-screensaver"
      role="button"
      tabIndex={0}
      aria-label="Pantalla en reposo. Toca para continuar."
      onPointerDown={despertarConsumiendoGesto}
    >
      <div className="idle-screensaver__drift">
        <img
          src="/logos/El_Vuelto_v2_NO_BG.png"
          alt="El Vuelto"
          className="idle-screensaver__logo"
          draggable={false}
        />
        <div className="idle-screensaver__clock">{hora}</div>
        <div className="idle-screensaver__date">{fecha}</div>
      </div>

      <div className="idle-screensaver__hint">Toca la pantalla para continuar</div>
    </div>
  )
}
