import { useState } from 'react'
import CloseIcon from '@mui/icons-material/Close'
import BackspaceOutlinedIcon from '@mui/icons-material/BackspaceOutlined'
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined'
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined'
import { formatCOP } from '@/utils/formatCOP'

interface Props {
  total: number
  initial: number | null
  onConfirm: (amount: number) => void
  onClose: () => void
}

const BILLS = [2000, 5000, 10000, 20000, 50000, 100000]
const COINS = [100, 200, 500, 1000]
const NUMPAD_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '00', '0']

export default function CashInputModal({ total, initial, onConfirm, onClose }: Props) {
  const [display, setDisplay] = useState(initial !== null ? String(initial) : '')

  const amount = display ? parseInt(display, 10) : 0
  const isEnough = amount >= total
  const vuelto = amount > 0 ? Math.max(0, amount - total) : null

  function appendDigits(d: string) {
    setDisplay((prev) => {
      const next = prev + d
      return parseInt(next, 10) > 9_999_999 ? prev : next
    })
  }

  function handleConfirm() {
    if (amount > 0) {
      onConfirm(amount)
      onClose()
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl overflow-hidden"
        style={{
          background: 'var(--surface)',
          boxShadow: '0 24px 64px rgba(106,38,0,0.18), 0 4px 16px rgba(0,0,0,0.12)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-5"
          style={{
            background: 'var(--surface-container-low)',
            borderBottom: '1px solid rgba(220,193,183,0.3)',
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'var(--primary-fixed)', color: 'var(--primary)' }}
            >
              <PaymentsOutlinedIcon style={{ fontSize: '1.375rem' }} />
            </div>
            <div>
              <h3
                className="font-bold text-lg leading-tight"
                style={{ color: 'var(--on-surface)', fontFamily: 'var(--font-headline)' }}
              >
                Pago en efectivo
              </h3>
              <p className="text-xs" style={{ color: 'var(--on-surface-variant)' }}>
                Total:{' '}
                <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--primary)' }}>
                  {formatCOP(total)}
                </strong>
              </p>
            </div>
          </div>
          <button
            className="w-10 h-10 rounded-xl flex items-center justify-center transition-colors touch-manipulation min-w-[44px] min-h-[44px]"
            style={{ background: 'var(--surface-container)', color: 'var(--on-surface-variant)' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-container-high)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--surface-container)')}
            onClick={onClose}
          >
            <CloseIcon style={{ fontSize: '1.25rem' }} />
          </button>
        </div>

        <div className="p-6 flex flex-col gap-5">
          {/* Amount display */}
          <div
            className="rounded-2xl px-5 py-5 flex items-center justify-between"
            style={{
              background: amount > 0 && isEnough ? 'var(--tertiary-fixed)' : 'var(--primary-fixed)',
              border: `1.5px solid ${amount > 0 && isEnough ? 'var(--tertiary)' : 'var(--outline-variant)'}`,
              transition: 'all 0.2s ease',
            }}
          >
            <span
              className="text-xs font-bold uppercase tracking-widest"
              style={{ color: amount > 0 && isEnough ? 'var(--tertiary)' : 'var(--on-surface-variant)' }}
            >
              Recibido
            </span>
            <span
              className="text-3xl font-bold"
              style={{
                color: amount > 0 && isEnough ? 'var(--tertiary)' : 'var(--primary)',
                fontFamily: 'var(--font-mono)',
              }}
            >
              {display ? formatCOP(amount) : '$0'}
            </span>
          </div>

          {/* Vuelto / faltante indicator */}
          {vuelto !== null && (
            <div
              className="rounded-xl px-4 py-3 flex items-center justify-between"
              style={{
                background: isEnough ? 'rgba(0,69,45,0.08)' : 'var(--error-container)',
                color: isEnough ? 'var(--tertiary)' : 'var(--on-error-container)',
                border: `1px solid ${isEnough ? 'rgba(0,69,45,0.15)' : 'transparent'}`,
              }}
            >
              <span className="text-sm font-bold uppercase tracking-wide">
                {isEnough ? 'Vuelto' : 'Faltante'}
              </span>
              <span className="text-base font-bold" style={{ fontFamily: 'var(--font-mono)' }}>
                {isEnough ? formatCOP(vuelto) : formatCOP(total - amount)}
              </span>
            </div>
          )}

          {/* Preset bills */}
          <div>
            <p
              className="text-xs font-bold uppercase tracking-widest mb-2.5"
              style={{ color: 'var(--on-surface-variant)' }}
            >
              Billetes
            </p>
            <div className="grid grid-cols-3 gap-2.5">
              {BILLS.map((b) => {
                const active = display === String(b)
                return (
                  <button
                    key={b}
                    onClick={() => setDisplay(String(b))}
                    className="py-4 rounded-2xl text-sm font-bold transition-all touch-manipulation active:scale-95 min-h-[44px]"
                    style={{
                      background: active ? 'var(--gradient-baked)' : 'var(--surface-container-highest)',
                      color: active ? 'white' : 'var(--on-surface)',
                      fontFamily: 'var(--font-mono)',
                      border: active ? '1.5px solid transparent' : '1.5px solid var(--outline-variant)',
                      boxShadow: active ? '0 2px 8px rgba(106,38,0,0.2)' : 'none',
                    }}
                  >
                    {formatCOP(b)}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Preset coins */}
          <div>
            <p
              className="text-xs font-bold uppercase tracking-widest mb-2.5"
              style={{ color: 'var(--on-surface-variant)' }}
            >
              Monedas
            </p>
            <div className="grid grid-cols-4 gap-2.5">
              {COINS.map((c) => {
                const active = display === String(c)
                return (
                  <button
                    key={c}
                    onClick={() => setDisplay(String(c))}
                    className="py-3 rounded-2xl text-sm font-bold transition-all touch-manipulation active:scale-95 min-h-[44px]"
                    style={{
                      background: active ? 'var(--gradient-baked)' : 'var(--surface-container-highest)',
                      color: active ? 'white' : 'var(--on-surface)',
                      fontFamily: 'var(--font-mono)',
                      border: active ? '1.5px solid transparent' : '1.5px solid var(--outline-variant)',
                      boxShadow: active ? '0 2px 8px rgba(106,38,0,0.2)' : 'none',
                    }}
                  >
                    {formatCOP(c)}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Numpad */}
          <div className="grid grid-cols-3 gap-2.5">
            {NUMPAD_KEYS.map((k) => (
              <button
                key={k}
                onClick={() => appendDigits(k)}
                className="py-5 rounded-2xl text-xl font-bold transition-all touch-manipulation active:scale-95 min-h-[56px]"
                style={{
                  background: 'var(--surface-container-highest)',
                  color: 'var(--on-surface)',
                  fontFamily: 'var(--font-mono)',
                  border: '1.5px solid var(--outline-variant)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--primary-fixed)'
                  e.currentTarget.style.borderColor = 'var(--primary)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'var(--surface-container-highest)'
                  e.currentTarget.style.borderColor = 'var(--outline-variant)'
                }}
              >
                {k}
              </button>
            ))}
            <button
              onClick={() => setDisplay((prev) => prev.slice(0, -1))}
              className="py-5 rounded-2xl flex items-center justify-center transition-all touch-manipulation active:scale-95 min-h-[56px]"
              style={{
                background: 'var(--error-container)',
                color: 'var(--on-error-container)',
                border: '1.5px solid transparent',
              }}
            >
              <BackspaceOutlinedIcon style={{ fontSize: '1.375rem' }} />
            </button>
          </div>

          {/* Confirm */}
          <button
            onClick={handleConfirm}
            disabled={amount <= 0}
            className="w-full py-5 rounded-2xl font-bold text-base flex items-center justify-center gap-2 transition-all touch-manipulation active:scale-[0.98] min-h-[56px]"
            style={{
              background: amount > 0 ? 'var(--gradient-baked)' : 'var(--surface-dim)',
              color: amount > 0 ? 'white' : 'var(--on-surface-variant)',
              boxShadow: amount > 0 ? '0 6px 20px rgba(106,38,0,0.28)' : 'none',
              opacity: amount <= 0 ? 0.6 : 1,
              cursor: amount <= 0 ? 'not-allowed' : 'pointer',
              letterSpacing: '0.02em',
            }}
          >
            <CheckCircleOutlinedIcon style={{ fontSize: '1.375rem' }} />
            Confirmar — {display ? formatCOP(amount) : '$0'}
          </button>
        </div>
      </div>
    </div>
  )
}
