import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutlined'
import AddShoppingCartOutlinedIcon from '@mui/icons-material/AddShoppingCartOutlined'
import { formatCOP } from '@/utils/formatCOP'

interface Props {
  total: number
  vuelto: number | null
  metodoPago: 'EFECTIVO' | 'NEQUI_TRANSFERENCIA'
  onNewSale: () => void
  onClose: () => void
}

export default function SuccessModal({ total, vuelto, metodoPago, onNewSale, onClose }: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
    >
      <div
        className="w-full max-w-sm rounded-3xl overflow-hidden"
        style={{ background: 'var(--surface-container-lowest)', boxShadow: 'var(--shadow-lg)' }}
      >
        {/* Success header */}
        <div
          className="flex flex-col items-center py-8 px-6 gap-3"
          style={{ background: 'var(--gradient-baked)' }}
        >
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.2)' }}
          >
            <CheckCircleOutlineIcon style={{ fontSize: '2.5rem', color: 'white' }} />
          </div>
          <h3
            className="text-xl font-bold text-white"
            style={{ fontFamily: 'var(--font-headline)' }}
          >
            ¡Venta Completada!
          </h3>
        </div>

        {/* Details */}
        <div className="p-6 flex flex-col gap-4">
          {/* Total */}
          <div
            className="flex items-center justify-between px-4 py-3 rounded-xl"
            style={{ background: 'var(--surface-container-low)' }}
          >
            <span className="text-sm font-semibold" style={{ color: 'var(--on-surface-variant)' }}>
              Total cobrado
            </span>
            <span
              className="text-xl font-bold"
              style={{ color: 'var(--primary)', fontFamily: 'var(--font-mono)' }}
            >
              {formatCOP(total)}
            </span>
          </div>

          {/* Payment method badge */}
          <div className="flex items-center justify-between">
            <span className="text-sm" style={{ color: 'var(--on-surface-variant)' }}>
              Método de pago
            </span>
            <span
              className="text-sm font-semibold px-3 py-1 rounded-full"
              style={
                metodoPago === 'EFECTIVO'
                  ? { background: 'var(--secondary-container)', color: 'var(--on-secondary-container)' }
                  : { background: 'var(--tertiary-fixed)', color: 'var(--on-tertiary-fixed)' }
              }
            >
              {metodoPago === 'EFECTIVO' ? 'Efectivo' : 'Nequi / Transferencia'}
            </span>
          </div>

          {/* Vuelto */}
          {vuelto !== null && metodoPago === 'EFECTIVO' && (
            <div
              className="flex items-center justify-between px-4 py-3 rounded-xl"
              style={{ background: 'var(--tertiary-fixed)', color: 'var(--on-tertiary-fixed)' }}
            >
              <span className="text-sm font-semibold">Vuelto a entregar</span>
              <span className="text-2xl font-bold" style={{ fontFamily: 'var(--font-mono)' }}>
                {formatCOP(vuelto)}
              </span>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col gap-2 pt-2">
            <button
              onClick={onNewSale}
              className="w-full py-4 rounded-xl font-bold text-base flex items-center justify-center gap-2 touch-manipulation"
              style={{ background: 'var(--gradient-baked)', color: 'white' }}
            >
              <AddShoppingCartOutlinedIcon style={{ fontSize: '1.25rem' }} />
              Nueva Venta
            </button>
            <button
              onClick={onClose}
              className="w-full py-3 rounded-xl font-semibold text-sm touch-manipulation"
              style={{ background: 'var(--surface-container)', color: 'var(--on-surface-variant)' }}
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
