import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import BackspaceOutlinedIcon from '@mui/icons-material/BackspaceOutlined'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import styles from './NumericKeypad.module.css'

/** On-screen numeric keypad for the staff login, which runs on a touch POS.
 *
 *  Dumb by design: it holds no state and never touches the DOM of the field it
 *  feeds. The page owns `cedula`/`pin` and decides what a digit means, so the
 *  typed path and the tapped path stay one code path (same auto-submit, same
 *  "changing the cédula clears the PIN" rule).
 *
 *  Visual language is copied from the three numpads the POS already ships
 *  (`features/sales/pos.css`: `pos-cash-modal__numpad`, `pos-qty-editor__numpad`,
 *  `pos-inv-numpad`) — 3-column grid, mono 700, `scale(0.93)` on press,
 *  backspace in `--error-container`.
 */
interface Props {
  /** A digit key was pressed. Always a single character, '0'–'9'. */
  onDigit: (digit: string) => void
  onBackspace: () => void
  /** When present, renders the "Siguiente" key (cédula → PIN). Omit on the last
   *  field: the 4th PIN digit submits on its own, so there is nowhere to go. */
  onNext?: () => void
  /** Dismiss without touching the value. */
  onClose: () => void
  /** Measured height in px, reported on mount and on every resize.
   *  The page reserves exactly this much room at the bottom — hardcoding the
   *  number in CSS drifts the moment a key size, a padding or the safe-area
   *  inset changes, and then the panel covers the submit button. */
  onHeightChange?: (px: number) => void
}

const DIGITS = ['1', '2', '3', '4', '5', '6', '7', '8', '9']

export default function NumericKeypad({
  onDigit,
  onBackspace,
  onNext,
  onClose,
  onHeightChange,
}: Props) {
  const panelRef = useRef<HTMLDivElement>(null)

  // Report the real rendered height instead of letting the page guess it.
  // `ResizeObserver` covers the two things a constant cannot: the
  // `max-height: 700px` breakpoint swapping key sizes, and `env(safe-area-inset-bottom)`
  // on a notched device.
  //
  // `box: 'border-box'` matters: the default observed box is the *content* box,
  // and a safe-area change moves only padding — so the panel would grow while
  // the observer stayed silent, which is the hardcoded-constant bug all over
  // again. It also matches what `getBoundingClientRect()` reports below.
  useEffect(() => {
    const el = panelRef.current
    if (!el || !onHeightChange) return
    const report = () => onHeightChange(el.getBoundingClientRect().height)
    report()
    const ro = new ResizeObserver(report)
    ro.observe(el, { box: 'border-box' })
    return () => ro.disconnect()
    // `onNext` is deliberately NOT a dep: it changes identity on every render of
    // the page, and toggling it does not change the height anyway — the grid
    // keeps its 12 cells either way (the placeholder `<span>` holds the slot).
  }, [onHeightChange])

  /** Keeps the focus on the input the keypad is feeding.
   *
   *  `pointerdown` is the event that moves focus, so it is the one to cancel;
   *  `click` still fires normally. Without it every key would blur the field,
   *  the caret would leave the PIN boxes, and the page's "focus the box the
   *  next digit lands in" would have nothing to hold on to.
   */
  function keepFocus(e: React.PointerEvent) {
    e.preventDefault()
  }

  return createPortal(
    <div ref={panelRef} className={styles.panel} role="group" aria-label="Teclado numérico">
      <div className={styles.inner}>
        <div className={styles.handleRow}>
          <button
            type="button"
            className={styles.close}
            onPointerDown={keepFocus}
            onClick={onClose}
            aria-label="Ocultar el teclado numérico"
          >
            Ocultar
          </button>
        </div>

        <div className={styles.grid}>
          {DIGITS.map((d) => (
            <button
              key={d}
              type="button"
              className={styles.key}
              onPointerDown={keepFocus}
              onClick={() => onDigit(d)}
            >
              {d}
            </button>
          ))}

          <button
            type="button"
            className={[styles.key, styles.keyBackspace].join(' ')}
            onPointerDown={keepFocus}
            onClick={onBackspace}
            aria-label="Borrar el último dígito"
          >
            <BackspaceOutlinedIcon style={{ fontSize: '1.5rem' }} />
          </button>

          <button
            type="button"
            className={styles.key}
            onPointerDown={keepFocus}
            onClick={() => onDigit('0')}
          >
            0
          </button>

          {onNext ? (
            <button
              type="button"
              className={[styles.key, styles.keyNext].join(' ')}
              onPointerDown={keepFocus}
              onClick={onNext}
            >
              Siguiente
              <ArrowForwardIcon style={{ fontSize: '1.125rem' }} />
            </button>
          ) : (
            // Holds the third column so the grid keeps its shape between fields —
            // the 0 must not slide sideways when "Siguiente" disappears.
            <span aria-hidden="true" />
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}
