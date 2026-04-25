import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined'
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined'
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined'
import { formatCOP } from '@/utils/formatCOP'

interface Props {
  totalVenta: number
  metodoPago: 'EFECTIVO' | 'NEQUI_TRANSFERENCIA'
  montoRecibido: number | null
  onMetodoPago: (m: 'EFECTIVO' | 'NEQUI_TRANSFERENCIA') => void
  onCobrar: () => void
  onOpenCashModal: () => void
  isLoading: boolean
  disabled: boolean
}

export default function PaymentSection({
  totalVenta,
  metodoPago,
  montoRecibido,
  onMetodoPago,
  onCobrar,
  onOpenCashModal,
  isLoading,
  disabled,
}: Props) {
  const vuelto =
    montoRecibido !== null && metodoPago === 'EFECTIVO'
      ? Math.max(0, montoRecibido - totalVenta)
      : null

  return (
    <div
      className="p-8 rounded-t-2xl space-y-6"
      style={{ background: 'var(--surface-container-low)' }}
    >
      {/* Total */}
      <div className="flex justify-between items-end">
        <span className="font-medium" style={{ color: 'var(--on-surface-variant)' }}>
          Total a pagar
        </span>
        <span
          className="text-4xl font-bold"
          style={{ color: 'var(--primary)', fontFamily: 'var(--font-mono)' }}
        >
          {formatCOP(totalVenta)}
        </span>
      </div>

      {/* Payment method cards */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => onMetodoPago('EFECTIVO')}
          className="flex flex-col items-center justify-center gap-2 p-6 rounded-xl transition-all active:scale-95 touch-manipulation"
          style={{
            background: metodoPago === 'EFECTIVO' ? 'var(--surface-container-lowest)' : 'var(--surface-container-highest)',
            border: metodoPago === 'EFECTIVO' ? '2px solid var(--primary)' : '2px solid transparent',
            boxShadow: metodoPago === 'EFECTIVO' ? '0 2px 8px rgba(106,38,0,0.12)' : 'none',
          }}
        >
          <PaymentsOutlinedIcon
            style={{
              fontSize: '1.875rem',
              color: metodoPago === 'EFECTIVO' ? 'var(--primary)' : 'var(--on-surface-variant)',
            }}
          />
          <span
            className="font-bold text-sm"
            style={{
              color: metodoPago === 'EFECTIVO' ? 'var(--primary)' : 'var(--on-surface-variant)',
            }}
          >
            Efectivo
          </span>
        </button>
        <button
          onClick={() => onMetodoPago('NEQUI_TRANSFERENCIA')}
          className="flex flex-col items-center justify-center gap-2 p-6 rounded-xl transition-all active:scale-95 touch-manipulation"
          style={{
            background: metodoPago === 'NEQUI_TRANSFERENCIA' ? 'var(--surface-container-lowest)' : 'var(--surface-container-highest)',
            border: metodoPago === 'NEQUI_TRANSFERENCIA' ? '2px solid var(--primary)' : '2px solid transparent',
            boxShadow: metodoPago === 'NEQUI_TRANSFERENCIA' ? '0 2px 8px rgba(106,38,0,0.12)' : 'none',
          }}
        >
          <AccountBalanceWalletOutlinedIcon
            style={{
              fontSize: '1.875rem',
              color: metodoPago === 'NEQUI_TRANSFERENCIA' ? 'var(--primary)' : 'var(--on-surface-variant)',
            }}
          />
          <span
            className="font-bold text-sm"
            style={{
              color: metodoPago === 'NEQUI_TRANSFERENCIA' ? 'var(--primary)' : 'var(--on-surface-variant)',
            }}
          >
            Nequi
          </span>
        </button>
      </div>

      {/* Cash: recibido + vuelto */}
      {metodoPago === 'EFECTIVO' && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label
              className="block text-xs uppercase tracking-widest font-bold mb-2"
              style={{ color: 'var(--on-surface-variant)' }}
            >
              Recibido
            </label>
            <button
              onClick={onOpenCashModal}
              className="w-full h-14 px-4 rounded-2xl text-left transition-all touch-manipulation flex items-center min-h-[44px]"
              style={{
                background: 'var(--surface-container-highest)',
                color: 'var(--on-surface)',
                fontFamily: 'var(--font-mono)',
                fontSize: '1rem',
                fontWeight: 600,
                border: '1.5px solid var(--outline-variant)',
                boxShadow: '0 1px 4px rgba(106,38,0,0.05)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--primary)'
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(106,38,0,0.09)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--outline-variant)'
                e.currentTarget.style.boxShadow = '0 1px 4px rgba(106,38,0,0.05)'
              }}
            >
              {montoRecibido !== null
                ? formatCOP(montoRecibido)
                : <span style={{ color: 'var(--on-surface-variant)', fontWeight: 400, fontSize: '0.8125rem', fontFamily: 'var(--font-sans)' }}>Toca para ingresar</span>}
            </button>
          </div>
          <div>
            <label
              className="block text-xs uppercase tracking-widest font-bold mb-2"
              style={{ color: 'var(--on-surface-variant)' }}
            >
              Vuelto
            </label>
            <div
              className="w-full h-14 flex items-center px-4 rounded-2xl"
              style={{
                background: vuelto !== null ? 'var(--tertiary-fixed)' : 'var(--surface-container-high)',
                border: '1.5px solid transparent',
              }}
            >
              <span
                className="text-lg font-bold"
                style={{
                  color: vuelto !== null ? 'var(--tertiary)' : 'var(--on-surface-variant)',
                  fontFamily: 'var(--font-mono)',
                  opacity: vuelto !== null ? 1 : 0.4,
                }}
              >
                {vuelto !== null ? formatCOP(vuelto) : '—'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Cobrar button */}
      <button
        onClick={onCobrar}
        disabled={disabled || isLoading}
        className="w-full py-6 rounded-2xl text-white text-xl font-bold flex items-center justify-center gap-3 transition-transform active:scale-[0.98] touch-manipulation"
        style={{
          background: disabled || isLoading ? 'var(--surface-dim)' : 'var(--gradient-baked)',
          color: disabled || isLoading ? 'var(--on-surface-variant)' : 'white',
          boxShadow: disabled || isLoading ? 'none' : '0 6px 20px rgba(106,38,0,0.28)',
          cursor: disabled ? 'not-allowed' : 'pointer',
          letterSpacing: '0.02em',
        }}
      >
        {isLoading ? (
          <span className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : (
          <>
            <CheckCircleOutlinedIcon style={{ fontSize: '1.375rem' }} />
            Cobrar Venta
          </>
        )}
      </button>
    </div>
  )
}
