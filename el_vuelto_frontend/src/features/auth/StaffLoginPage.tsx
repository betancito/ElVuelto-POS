import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import BadgeIcon from '@mui/icons-material/Badge'
import LoginIcon from '@mui/icons-material/Login'
import TipsAndUpdatesIcon from '@mui/icons-material/TipsAndUpdates'
import { useCheckTenantBySlugQuery } from '@/features/tenants/tenantsApi'
import { useLoginWorkerMutation } from './authApi'
import { APP_VERSION } from '@/constants/version'
import Spinner from '@/components/ui/Spinner'
import NumericKeypad from './components/NumericKeypad'
import styles from './StaffLoginPage.module.css'

// ── PIN input (4 boxes) ──────────────────────────────────────────────────────
interface PinInputHandle {
  /** Focus the first empty box (the last one when all four are filled). */
  focusNextEmpty: () => void
}

interface PinInputProps {
  value: string
  onChange: (v: string) => void
  /** A box was tapped/clicked — the page opens the keypad on it. Bound to the
   *  pointer, not to `focus`: a box that already holds focus fires no `focus`
   *  on the next tap, and that is exactly how the cashier reopens a keypad they
   *  dismissed. */
  onActivate?: () => void
  /** `'none'` suppresses the OS on-screen keyboard so it cannot stack on top of
   *  ours; a physical keyboard types either way. The page decides the value —
   *  it is **not** tied to whether the keypad is currently up (see
   *  `fieldInputMode` there for why). */
  inputMode?: 'numeric' | 'none'
}

const PinInput = forwardRef<PinInputHandle, PinInputProps>(function PinInput(
  { value, onChange, onActivate, inputMode = 'numeric' },
  ref,
) {
  const refs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ]

  // Lets the page drive the caret when the digits come from the keypad instead
  // of from a keystroke: physical typing moves focus in `handleChange` below,
  // tapping has nothing that would.
  useImperativeHandle(
    ref,
    () => ({
      focusNextEmpty() {
        refs[Math.min(value.length, 3)].current?.focus()
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [value],
  )

  function handleChange(idx: number, char: string) {
    if (!/^\d?$/.test(char)) return
    const arr = value.padEnd(4, ' ').split('')
    arr[idx] = char || ' '
    const next = arr.join('').replace(/ /g, '').padEnd(4, ' ')
    onChange(next.trimEnd())
    if (char && idx < 3) refs[idx + 1].current?.focus()
  }

  function handleKeyDown(idx: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace') {
      if (!value[idx] && idx > 0) {
        const arr = value.padEnd(4, ' ').split('')
        arr[idx - 1] = ' '
        onChange(arr.join('').trimEnd())
        refs[idx - 1].current?.focus()
      }
    }
  }

  return (
    <div className={styles.pinRow}>
      {[0, 1, 2, 3].map((i) => (
        <input
          key={i}
          ref={refs[i]}
          className={styles.pinBox}
          type="password"
          inputMode={inputMode}
          maxLength={1}
          value={value[i] ?? ''}
          onChange={(e) => handleChange(i, e.target.value.slice(-1))}
          onKeyDown={(e) => handleKeyDown(i, e)}
          // `preventDefault` so the browser does not focus the *tapped* box:
          // `onActivate` pins the caret to the box the next digit lands in, and
          // a ring sitting anywhere else would promise an edit the keypad
          // cannot make. Typing is untouched — this only cancels pointers.
          onPointerDown={(e) => { e.preventDefault(); onActivate?.() }}
          onClick={onActivate}
          autoComplete="off"
        />
      ))}
    </div>
  )
})

// ── Main page ────────────────────────────────────────────────────────────────
export default function StaffLoginPage() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>()
  const navigate = useNavigate()

  const { data: tenantCheck, isLoading: loadingTenant } = useCheckTenantBySlugQuery(
    tenantSlug ?? '',
    { skip: !tenantSlug }
  )

  const [loginWorker, { isLoading }] = useLoginWorkerMutation()

  const [cedula, setCedula] = useState('')
  const [pin, setPin] = useState('')
  const [apiError, setApiError] = useState<string | null>(null)

  // ── On-screen keypad ───────────────────────────────────────────────────────
  // This screen runs on a touch POS, where both fields are numeric. `null` =
  // hidden; otherwise it names the field the keys write into. It is the only
  // state the feature adds: the keypad never touches the DOM of the inputs, it
  // feeds `cedula`/`pin` — so tapping and typing stay one code path (same
  // auto-submit below, same "changing the cédula clears the PIN" rule).
  const [activeField, setActiveField] = useState<'cedula' | 'pin' | null>(null)
  const [keypadHeight, setKeypadHeight] = useState(0)
  const [hasPhysicalKeyboard, setHasPhysicalKeyboard] = useState(false)
  const cedulaRef = useRef<HTMLInputElement>(null)
  const pinGroupRef = useRef<HTMLDivElement>(null)
  const errorRef = useRef<HTMLParagraphElement>(null)
  const pinRef = useRef<PinInputHandle>(null)
  const keypadOpen = activeField !== null

  // `inputMode="none"` from the start, not "while the keypad is up": the
  // browser decides whether to raise the OS keyboard *during* the focus event,
  // and a value derived from `activeField` only lands on the render **after**
  // it — so the very first tap would flash the OS keyboard before ours. It goes
  // back to 'numeric' only once we know there is a physical keyboard, which is
  // the one case where the OS one is a sane fallback.
  const fieldInputMode = hasPhysicalKeyboard ? 'numeric' : 'none'

  /** Opens the keypad on the given field. Bound to `pointerdown` **and**
   *  `click`, never to `focus`:
   *
   *  - Not `focus`, because after "Ocultar" (or after a physical key hid the
   *    panel) the input still holds focus, so the next tap emits no `focus` at
   *    all — a touch-only POS would end up with no keyboard and no way back.
   *    Focus would also fire on Tab, flashing an on-screen keypad at the one
   *    user who demonstrably does not need it.
   *  - `click` as well as `pointerdown`, because `<label htmlFor="st-cedula">`
   *    forwards a *click* to the input but never a pointer event: tapping the
   *    label (a fat, obvious target right above the field) focused it while
   *    leaving `inputMode="none"` and no keypad — a field with no keyboard of
   *    any kind. Same gap covers screen-reader activation and `.click()`.
   *
   *  Setting the same value twice is a React bail-out, so the two events
   *  together cost nothing.
   */
  function openKeypad(field: 'cedula' | 'pin') {
    // A finger is evidence of "touch" exactly as a keystroke is evidence of
    // "physical keyboard". Without this the flag below is a one-way latch, and
    // this POS has HID barcode scanners whose keydowns are indistinguishable
    // from typing: one stray scan would classify a pure-touch tablet as
    // keyboard-bearing *forever*, and from then on every tap would raise the OS
    // keyboard on top of ours.
    setHasPhysicalKeyboard(false)
    setActiveField(field)
    // On touch the digits fill left to right and the only correction is
    // backspace — the same contract as any phone lockscreen. So the caret is
    // pinned to the box the next digit lands in; letting it sit on a tapped box
    // would promise positional editing that `handleKeypadDigit` (which appends)
    // does not implement. With a physical keyboard the panel closes and
    // `handleChange` gives real positional editing.
    if (field === 'pin') pinRef.current?.focusNextEmpty()
  }

  // The owner's rule: the moment you use a physical keyboard, the on-screen one
  // goes away. The keypad's keys are <button>s driven by click/tap, and their
  // `onPointerDown` cancels the default so they never even take focus — so a
  // keydown reaching here is a physical keyboard. (Were someone to reach a key
  // by Tab and press Enter, the panel would close on that keydown, which is
  // still the right answer: they are using a keyboard.)
  useEffect(() => {
    if (!keypadOpen) return
    const hide = () => {
      setHasPhysicalKeyboard(true)
      setActiveField(null)
    }
    document.addEventListener('keydown', hide)
    return () => document.removeEventListener('keydown', hide)
  }, [keypadOpen])

  /** Scrolls `el` clear of the panel.
   *
   *  `block: 'nearest'` + `scroll-margin-bottom`, not `block: 'center'`:
   *  "center" means centre of the *viewport*, and the bottom slice of that
   *  viewport is exactly what the fixed panel is sitting on — on a short POS
   *  screen the centred element still lands behind the keys. `nearest` scrolls
   *  the minimum needed while honouring the margin, so the target clears the
   *  panel by construction.
   */
  function scrollClearOfKeypad(el: HTMLElement | null) {
    if (!el) return
    el.style.scrollMarginBottom = `${keypadHeight + 16}px`
    el.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }

  // Bring the active field into view. Targeted by **state**, not by
  // `document.activeElement`: this effect runs before the focus has moved
  // (React flushes effects in declaration order), so reading the DOM here would
  // centre the field we just left — the cédula instead of the PIN on
  // "Siguiente".
  useEffect(() => {
    if (!keypadOpen) return
    scrollClearOfKeypad(activeField === 'pin' ? pinGroupRef.current : cedulaRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keypadOpen, activeField, keypadHeight])

  // A failed login paints its message *below* the PIN, which is where the panel
  // is. Its own effect rather than a branch in the one above: sharing it made
  // `apiError` outrank `activeField` for as long as the message stayed on
  // screen, so every later field change scrolled to the error instead of to the
  // field being typed into.
  useEffect(() => {
    if (apiError && keypadOpen) scrollClearOfKeypad(errorRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiError])

  // Tapping has nothing that would advance the caret across the four boxes the
  // way typing does, so drive it from here whenever the value changes.
  //
  // Deps are `[pin]` alone: `activeField` does not belong, because entering the
  // PIN already focuses explicitly (in `openKeypad`/`goToPin`) and re-running
  // this on every field change would fight them.
  useEffect(() => {
    if (activeField === 'pin') pinRef.current?.focusNextEmpty()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin])

  function handleKeypadDigit(digit: string) {
    if (activeField === 'cedula') {
      // Mirrors the input's own onChange: a different cédula invalidates the PIN.
      setCedula((prev) => prev + digit)
      setPin('')
    } else if (activeField === 'pin') {
      setPin((prev) => (prev.length >= 4 ? prev : prev + digit))
    }
  }

  function handleKeypadBackspace() {
    if (activeField === 'cedula') {
      setCedula((prev) => prev.slice(0, -1))
      setPin('')
    } else if (activeField === 'pin') {
      setPin((prev) => prev.slice(0, -1))
    }
  }

  function goToPin() {
    setActiveField('pin')
    // No wait needed: "Siguiente" only exists while the cédula is non-empty,
    // which is the same condition that renders the PIN block — so the boxes and
    // their refs are already mounted when this runs.
    pinRef.current?.focusNextEmpty()
  }

  // auto-submit when 4 PIN digits entered
  useEffect(() => {
    if (pin.length === 4 && cedula.trim() && tenantCheck?.exists) {
      handleSubmit()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin])

  async function handleSubmit() {
    if (!tenantCheck?.exists) return
    setApiError(null)
    const cedulaTrimmed = cedula.trim()
    try {
      const result = await loginWorker({
        cedula: cedulaTrimmed,
        password: pin,
        ...(tenantCheck.id ? { tenant_id: tenantCheck.id } : {}),
      }).unwrap()
      if (result.user.rol === 'CAJERO') {
        navigate('/staff')
      } else {
        navigate('/dashboard')
      }
    } catch (err: unknown) {
      const e = err as { status?: number; data?: { detail?: string; message?: string } }
      const message =
        e?.data?.detail ??
        e?.data?.message ??
        (e?.status === 401 ? 'Credenciales incorrectas' : 'Error al iniciar sesión. Intenta de nuevo.')
      setApiError(message)
      setPin('')
    }
  }

  if (loadingTenant) {
    return (
      <div className={styles.centered}>
        <Spinner size="lg" />
      </div>
    )
  }

  // Tenant not found or inactive
  if (!tenantCheck || !tenantCheck.exists) {
    return (
      <div className={styles.page}>
        <div className={styles.bakeryPattern} />
        <main className={styles.container}>
          <div className={styles.card}>
            <p className={styles.notFound}>
              Sucursal "<strong>{tenantSlug}</strong>" no encontrada o inactiva.
            </p>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div
      className={styles.page}
      // Reserve exactly the panel's measured height so it never covers the
      // submit button or the error line. Measured rather than hardcoded: the
      // real height moves with the `max-height` breakpoint and with
      // `env(safe-area-inset-bottom)`.
      style={keypadOpen ? { paddingBottom: keypadHeight } : undefined}
    >
      <div className={styles.bakeryPattern} />

      <main className={styles.container}>
        {/* Tenant brand */}
        <div className={styles.brand}>
          {tenantCheck.logo_url ? (
            <img
              src={tenantCheck.logo_url}
              alt={tenantCheck.nombre ?? ''}
              className={styles.brandLogo}
            />
          ) : (
            <span className={styles.brandItalic}>{tenantCheck.nombre}</span>
          )}
        </div>

        {/* Login card */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>Login de Colaborador</h2>
            <p className={styles.cardSub}>
              Identifícate para acceder al punto de venta.
            </p>
          </div>

          <div className={styles.form}>
            {/* Cédula */}
            <div className={styles.fieldGroup}>
              <label htmlFor="st-cedula" className={styles.fieldLabel}>
                Número de identificación
              </label>
              <div className={styles.fieldWrap}>
                <BadgeIcon className={styles.fieldIcon} />
                <input
                  id="st-cedula"
                  ref={cedulaRef}
                  type="text"
                  className={styles.input}
                  placeholder="Ej: 1020304050"
                  value={cedula}
                  onChange={(e) => { setCedula(e.target.value); setPin('') }}
                  onPointerDown={() => openKeypad('cedula')}
                  onClick={() => openKeypad('cedula')}
                  autoComplete="off"
                  inputMode={fieldInputMode}
                />
              </div>
            </div>

            {/* PIN */}
            {cedula.trim() && (
              <div className={styles.fieldGroup} ref={pinGroupRef}>
                <label className={styles.fieldLabel}>PIN de acceso</label>
                <PinInput
                  ref={pinRef}
                  value={pin}
                  onChange={setPin}
                  onActivate={() => openKeypad('pin')}
                  inputMode={fieldInputMode}
                />
              </div>
            )}

            {apiError && <p className={styles.apiError} ref={errorRef}>{apiError}</p>}

            {cedula.trim() && (
              <div className={styles.submitWrap}>
                <button
                  type="button"
                  className={styles.submitBtn}
                  disabled={isLoading || pin.length < 4}
                  onClick={handleSubmit}
                >
                  {isLoading ? (
                    <span className={styles.spinner} />
                  ) : (
                    <>
                      Iniciar Sesión
                      <LoginIcon sx={{ fontSize: '1.25rem' }} />
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Consejo del día */}
          <div className={styles.tipSection}>
            <div className={styles.tipCard}>
              <div className={styles.tipIcon}>
                <TipsAndUpdatesIcon sx={{ fontSize: '2rem', color: 'var(--primary)' }} />
              </div>
              <div>
                <p className={styles.tipLabel}>Consejo del día</p>
                <p className={styles.tipQuote}>
                  "La paciencia es el ingrediente secreto de un buen pan y de una excelente venta."
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className={styles.footer}>
        <p className={styles.footerText}>© 2024 El Vuelto. Todos los derechos reservados.</p>
        <p className={styles.footerVersion}>{APP_VERSION}</p>
      </footer>

      {/* On-screen keypad — portalled to <body>, fixed to the bottom edge.
          "Siguiente" only while filling the cédula: on the PIN the 4th digit
          submits on its own, so there is nowhere left to go. */}
      {keypadOpen && (
        <NumericKeypad
          onDigit={handleKeypadDigit}
          onBackspace={handleKeypadBackspace}
          onNext={activeField === 'cedula' && cedula.trim() ? goToPin : undefined}
          onClose={() => setActiveField(null)}
          onHeightChange={setKeypadHeight}
        />
      )}
    </div>
  )
}
