import CloseIcon from '@mui/icons-material/Close'
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
    <section
      className="flex flex-col overflow-hidden rounded-2xl"
      style={{
        width: '30%',
        minWidth: '300px',
        background: 'var(--surface-container-lowest)',
        boxShadow: 'var(--shadow-md)',
      }}
    >
      {/* Header */}
      <div className="px-8 py-6 flex justify-between items-center shrink-0">
        <h2
          className="text-2xl font-bold"
          style={{ color: 'var(--on-surface)', fontFamily: 'var(--font-headline)' }}
        >
          Venta Actual
        </h2>
        {items.length > 0 && (
          <button
            className="flex items-center gap-2 font-medium text-sm transition-colors touch-manipulation"
            style={{ color: 'var(--on-surface-variant)' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--error)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--on-surface-variant)')}
            onClick={onClear}
          >
            <CloseIcon style={{ fontSize: '1rem' }} />
            Cancelar
          </button>
        )}
      </div>

      {/* Items */}
      <div
        className="flex-1 overflow-y-auto px-8"
        style={{ scrollbarWidth: 'thin', scrollbarColor: 'var(--outline-variant) transparent' }}
      >
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-12 gap-5">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center"
              style={{ background: 'var(--surface-container-high)' }}
            >
              <ShoppingBasketOutlinedIcon
                style={{ fontSize: '2.5rem', color: 'var(--on-surface-variant)', opacity: 0.4 }}
              />
            </div>
            <div className="text-center space-y-1">
              <h3
                className="text-xl font-bold"
                style={{ color: 'var(--on-surface)', fontFamily: 'var(--font-headline)' }}
              >
                Detalle del Pedido
              </h3>
              <p className="text-sm" style={{ color: 'var(--on-surface-variant)' }}>
                Selecciona una categoría para empezar a agregar productos.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
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
      </div>

      {/* Payment section slot */}
      <div className="shrink-0 pb-2">{children}</div>
    </section>
  )
}
