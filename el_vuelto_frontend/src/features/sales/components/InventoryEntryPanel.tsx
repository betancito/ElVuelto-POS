import { useState } from 'react'
import { toast } from 'react-toastify'
import BackspaceOutlinedIcon from '@mui/icons-material/BackspaceOutlined'
import AddCircleOutlineOutlinedIcon from '@mui/icons-material/AddCircleOutlineOutlined'
import InventoryOutlinedIcon from '@mui/icons-material/InventoryOutlined'
import BakeryDiningOutlinedIcon from '@mui/icons-material/BakeryDiningOutlined'
import { useCreateMovementMutation } from '@/features/inventory/inventoryApi'
import type { PosProduct } from '@/features/products/productsApi'

interface Props {
  product: PosProduct | null
  onClear: () => void
}

const DIGIT_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9']

export default function InventoryEntryPanel({ product, onClear }: Props) {
  const [display, setDisplay] = useState('')
  const [createMovement, { isLoading }] = useCreateMovementMutation()

  const qty = display ? parseInt(display, 10) : 0
  const canSubmit = !!product && qty > 0

  function appendDigit(d: string) {
    setDisplay((prev) => {
      const next = prev + d
      return parseInt(next, 10) > 9999 ? prev : next
    })
  }

  async function handleSubmit() {
    if (!canSubmit || isLoading) return
    try {
      await createMovement({
        product: product!.id,
        tipo_movimiento: 'ENTRADA',
        cantidad: qty,
      }).unwrap()
      toast.success(`Entrada registrada: ${qty} × ${product!.nombre}`, { position: 'bottom-left' })
      setDisplay('')
      onClear()
    } catch {
      toast.error('Error al registrar la entrada. Intenta de nuevo.', { position: 'bottom-left' })
    }
  }

  return (
    <div className="pos-cart" style={{ display: 'flex', flexDirection: 'column' }}>
      <div className="pos-inv-header">
        <h2 className="pos-inv-header-title">Entrada de stock</h2>
      </div>

      {!product ? (
        <div className="pos-cart__empty">
          <div className="pos-cart__empty-icon">
            <InventoryOutlinedIcon style={{ fontSize: '2.25rem' }} />
          </div>
          <p className="pos-cart__empty-title">Selecciona un producto</p>
          <p className="pos-cart__empty-sub">
            Escanea un código de barras o toca un producto para registrar una entrada de inventario.
          </p>
        </div>
      ) : (
        <div className="pos-inv-body">
          {/* Product card */}
          <div className="pos-inv-product-card">
            <div className="pos-inv-product-img">
              {product.imagen_url ? (
                <img src={product.imagen_url} alt={product.nombre} />
              ) : (
                <BakeryDiningOutlinedIcon style={{ fontSize: '1.75rem' }} />
              )}
            </div>
            <div className="pos-inv-product-info">
              <p className="pos-inv-product-name">{product.nombre}</p>
              {product.barcode && (
                <p className="pos-inv-product-meta">{product.barcode}</p>
              )}
            </div>
            {/* This panel is where the lead cashier registers the arrival, so
                it is the one screen where a negative must not look like any
                other number — it is the reason they are standing here. */}
            <span
              className="pos-inv-stock-badge"
              style={
                product.stock_actual < 0
                  ? { background: 'var(--error-container)', color: 'var(--on-error-container)' }
                  : undefined
              }
            >
              Stock: {product.stock_actual}
            </span>
          </div>

          {/* Quantity */}
          <div className="pos-inv-qty-section">
            <p className="pos-inv-qty-label">Cantidad a ingresar</p>
            <div className="pos-inv-qty-display">
              <span className="pos-inv-qty-label">Unidades</span>
              <span className={`pos-inv-qty-value${!display ? ' pos-inv-qty-value--empty' : ''}`}>
                {display || '0'}
              </span>
            </div>

            <div className="pos-inv-numpad">
              {DIGIT_KEYS.map((k) => (
                <button
                  key={k}
                  className="pos-inv-numpad-key"
                  onClick={() => appendDigit(k)}
                >
                  {k}
                </button>
              ))}
              <button
                className="pos-inv-numpad-key pos-inv-numpad-key--backspace"
                onClick={() => setDisplay((p) => p.slice(0, -1))}
              >
                <BackspaceOutlinedIcon style={{ fontSize: '1.375rem' }} />
              </button>
              <button className="pos-inv-numpad-key" onClick={() => appendDigit('0')}>0</button>
              <button className="pos-inv-numpad-key" onClick={() => appendDigit('00')}>00</button>
            </div>
          </div>

          <button
            className={`pos-inv-submit pos-inv-submit--${canSubmit ? 'active' : 'disabled'}`}
            onClick={handleSubmit}
            disabled={!canSubmit || isLoading}
          >
            <AddCircleOutlineOutlinedIcon style={{ fontSize: '1.25rem' }} />
            {isLoading ? 'Registrando...' : `Registrar${qty > 0 ? ` ${qty}` : ''} entrada`}
          </button>
        </div>
      )}
    </div>
  )
}
