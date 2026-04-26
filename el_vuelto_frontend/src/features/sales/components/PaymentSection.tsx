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
    <div className="pos-payment">
      <div className="pos-payment__total-row">
        <span className="pos-payment__total-label">Total a pagar</span>
        <span className="pos-payment__total-amount">{formatCOP(totalVenta)}</span>
      </div>

      <div className="pos-payment__methods">
        <button
          className={`pos-payment__method-btn ${metodoPago === 'EFECTIVO' ? 'pos-payment__method-btn--active' : 'pos-payment__method-btn--inactive'}`}
          onClick={() => onMetodoPago('EFECTIVO')}
        >
          <PaymentsOutlinedIcon style={{ fontSize: '1.75rem' }} />
          Efectivo
        </button>
        <button
          className={`pos-payment__method-btn ${metodoPago === 'NEQUI_TRANSFERENCIA' ? 'pos-payment__method-btn--active' : 'pos-payment__method-btn--inactive'}`}
          onClick={() => onMetodoPago('NEQUI_TRANSFERENCIA')}
        >
          <AccountBalanceWalletOutlinedIcon style={{ fontSize: '1.75rem' }} />
          Nequi
        </button>
      </div>

      {metodoPago === 'EFECTIVO' && (
        <div className="pos-payment__cash-row">
          <div>
            <label className="pos-payment__cash-label">Recibido</label>
            <button className="pos-payment__cash-input-btn" onClick={onOpenCashModal}>
              {montoRecibido !== null
                ? <span style={{ fontFamily: 'var(--font-mono)' }}>{formatCOP(montoRecibido)}</span>
                : <span className="pos-payment__cash-input-btn--placeholder">Toca para ingresar</span>
              }
            </button>
          </div>
          <div>
            <label className="pos-payment__cash-label">Vuelto</label>
            <div className={`pos-payment__vuelto-display ${vuelto !== null ? 'pos-payment__vuelto-display--active' : 'pos-payment__vuelto-display--empty'}`}>
              <span className={`pos-payment__vuelto-amount ${vuelto !== null ? 'pos-payment__vuelto-amount--active' : 'pos-payment__vuelto-amount--empty'}`}>
                {vuelto !== null ? formatCOP(vuelto) : '—'}
              </span>
            </div>
          </div>
        </div>
      )}

      <button
        className={`pos-payment__cobrar-btn ${disabled || isLoading ? 'pos-payment__cobrar-btn--disabled' : 'pos-payment__cobrar-btn--active'}`}
        onClick={onCobrar}
        disabled={disabled || isLoading}
      >
        {isLoading
          ? <span className="pos-spinner" />
          : <><CheckCircleOutlinedIcon style={{ fontSize: '1.375rem' }} />Cobrar Venta</>
        }
      </button>
    </div>
  )
}
