import DeleteSweepOutlinedIcon from '@mui/icons-material/DeleteSweepOutlined'
import ShoppingBasketOutlinedIcon from '@mui/icons-material/ShoppingBasketOutlined'
import CartItemComponent from './CartItem'
import type { CartItem } from '@/features/sales/posSlice'

interface Props {
  items: CartItem[]
  onUpdateQuantity: (productId: string, cantidad: number) => void
  onRemove: (productId: string) => void
  onClear: () => void
  children: React.ReactNode
}

export default function CartPanel({ items, onUpdateQuantity, onRemove, onClear, children }: Props) {
  return (
    <section className="pos-cart">
      <div className="pos-cart__header">
        <h2 className="pos-cart__title">Venta Actual</h2>
        {items.length > 0 && (
          /* Decía "Cancelar" con una X, y borraba la venta de un toque sin
             preguntar. "Cancelar" en una caja es ambiguo — ¿cancelar qué? —,
             y quien lo tocaba sin querer perdía todo. Ahora dice qué hace y
             `onClear` abre una confirmación en vez de borrar. */
          <button
            className="pos-cart__cancel-btn"
            onClick={onClear}
            aria-label="Vaciar el carrito"
          >
            <DeleteSweepOutlinedIcon style={{ fontSize: '1.125rem' }} />
            Vaciar
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="pos-cart__empty">
          <div className="pos-cart__empty-icon">
            <ShoppingBasketOutlinedIcon style={{ fontSize: '2.5rem' }} />
          </div>
          <div>
            <p className="pos-cart__empty-title">Detalle del Pedido</p>
            <p className="pos-cart__empty-sub">Selecciona una categoría para empezar a agregar productos.</p>
          </div>
        </div>
      ) : (
        <div className="pos-cart__items">
          {items.map((item) => (
            <CartItemComponent
              key={item.productId}
              item={item}
              onUpdateQuantity={onUpdateQuantity}
              onRemove={onRemove}
            />
          ))}
        </div>
      )}

      <div style={{ flexShrink: 0 }}>{children}</div>
    </section>
  )
}
