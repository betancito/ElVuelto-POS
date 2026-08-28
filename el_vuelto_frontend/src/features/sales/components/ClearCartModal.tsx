import { useEffect } from 'react'
import DeleteSweepOutlinedIcon from '@mui/icons-material/DeleteSweepOutlined'
import ArrowBackOutlinedIcon from '@mui/icons-material/ArrowBackOutlined'
import { formatCOP } from '@/utils/formatCOP'
import type { CartItem } from '@/features/sales/posSlice'

interface Props {
  items: CartItem[]
  /** Efectivo ya digitado. `clearCart` también lo borra, así que hay que avisar. */
  montoRecibido: number | null
  onConfirm: () => void
  onCancel: () => void
}

/**
 * Confirmación antes de vaciar el carrito.
 *
 * Antes, el botón "Cancelar" del carrito borraba la venta entera de un toque,
 * sin preguntar y sin deshacer. La caja la manejan personas mayores sobre una
 * pantalla táctil: un roce basta para perder una venta ya cargada.
 *
 * Tres decisiones deliberadas para ese usuario:
 * - **Se listan los productos.** "¿Estás seguro?" no dice qué se pierde; la
 *   lista sí. Es la diferencia entre confirmar a ciegas y decidir.
 * - **La opción segura va primera y es la grande.** Volver es lo que el 90% de
 *   la gente que abre este modal por accidente quiere.
 * - **Los botones dicen qué hacen**, no "Aceptar" / "Cancelar" — con esas dos
 *   palabras, "Cancelar" en un diálogo sobre cancelar una venta es una trampa.
 */
export default function ClearCartModal({ items, montoRecibido, onConfirm, onCancel }: Props) {
  const total = items.reduce((acc, i) => acc + i.precioUnitario * i.cantidad, 0)
  const unidades = items.reduce((acc, i) => acc + i.cantidad, 0)

  // Escape siempre CANCELA, nunca confirma: en un diálogo destructivo la tecla
  // de escape tiene que ser la salida segura.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onCancel()
      }
    }
    window.addEventListener('keydown', onKey, { capture: true })
    return () => window.removeEventListener('keydown', onKey, { capture: true })
  }, [onCancel])

  return (
    <div
      className="pos-clear-modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel()
      }}
    >
      <div className="pos-clear-modal" role="dialog" aria-modal="true" aria-labelledby="clear-cart-title">
        <div className="pos-clear-modal__header">
          <div className="pos-clear-modal__icon">
            <DeleteSweepOutlinedIcon style={{ fontSize: '1.75rem' }} />
          </div>
          <div>
            <h2 className="pos-clear-modal__title" id="clear-cart-title">
              ¿Vaciar el carrito?
            </h2>
            <p className="pos-clear-modal__subtitle">
              Se van a quitar {unidades} {unidades === 1 ? 'unidad' : 'unidades'} y la venta empieza de
              cero.
            </p>
          </div>
        </div>

        <div className="pos-clear-modal__list">
          {items.map((item) => (
            <div className="pos-clear-modal__row" key={item.productId}>
              <span className="pos-clear-modal__qty">{item.cantidad}×</span>
              <span className="pos-clear-modal__name">{item.nombre}</span>
              <span className="pos-clear-modal__amount">
                {formatCOP(item.precioUnitario * item.cantidad)}
              </span>
            </div>
          ))}
        </div>

        <div className="pos-clear-modal__total-row">
          <span>Total que se pierde</span>
          <span className="pos-clear-modal__total-amount">{formatCOP(total)}</span>
        </div>

        {/* `clearCart` no solo vacía los ítems: también pone montoRecibido en
            null y el método de pago de vuelta en EFECTIVO (posSlice.ts:49-53).
            Si el cajero ya contó la plata, eso se borra — y no avisarlo sería
            justamente la sorpresa que este modal viene a evitar. */}
        {montoRecibido !== null && montoRecibido > 0 && (
          <p className="pos-clear-modal__warning">
            También se borra el efectivo que ya digitaste ({formatCOP(montoRecibido)}). Vas a tener
            que contarlo de nuevo.
          </p>
        )}

        <div className="pos-clear-modal__actions">
          {/* La salida segura va primera y ocupa más: quien llegó acá sin
              querer tiene que poder salir sin leer con cuidado. */}
          <button className="pos-clear-modal__btn pos-clear-modal__btn--keep" onClick={onCancel} autoFocus>
            <ArrowBackOutlinedIcon style={{ fontSize: '1.25rem' }} />
            No, seguir vendiendo
          </button>
          <button className="pos-clear-modal__btn pos-clear-modal__btn--clear" onClick={onConfirm}>
            <DeleteSweepOutlinedIcon style={{ fontSize: '1.25rem' }} />
            Sí, vaciar todo
          </button>
        </div>
      </div>
    </div>
  )
}
