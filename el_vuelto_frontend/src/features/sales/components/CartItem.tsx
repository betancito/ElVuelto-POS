import React from 'react'
import AddOutlinedIcon from '@mui/icons-material/AddOutlined'
import RemoveOutlinedIcon from '@mui/icons-material/RemoveOutlined'
import { formatCOP } from '@/utils/formatCOP'
import type { CartItem as CartItemType } from '@/features/sales/posSlice'

interface Props {
  item: CartItemType
  onUpdateQuantity: (productId: string, cantidad: number) => void
  onRemove: (productId: string) => void
}

const AVATAR_COLORS = [
  { bg: '#fecea5', text: '#795635' },
  { bg: '#b1f0ce', text: '#00452d' },
  { bg: '#ffdbcd', text: '#6a2600' },
  { bg: '#e8e2d7', text: '#55433b' },
]

function avatarColor(name: string) {
  const idx = name.charCodeAt(0) % AVATAR_COLORS.length
  return AVATAR_COLORS[idx]
}

const CartItem = React.memo(function CartItem({ item, onUpdateQuantity, onRemove }: Props) {
  const { bg, text } = avatarColor(item.nombre)

  return (
    <div className="flex items-center justify-between gap-4 group">
      {/* Left: avatar + name + unit price */}
      <div className="flex items-center gap-4 min-w-0">
        <div
          className="w-14 h-14 rounded-lg flex items-center justify-center shrink-0 text-xl font-bold"
          style={{ background: bg, color: text }}
        >
          {item.nombre.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <h4 className="font-bold text-sm leading-snug truncate" style={{ color: 'var(--on-surface)' }}>
            {item.nombre}
          </h4>
          <p className="text-sm mt-0.5" style={{ color: 'var(--on-surface-variant)', fontFamily: 'var(--font-mono)' }}>
            {formatCOP(item.precioUnitario)} c/u
          </p>
        </div>
      </div>

      {/* Right: qty controls + total */}
      <div className="flex items-center gap-4 shrink-0">
        {/* Qty pill */}
        <div
          className="flex items-center rounded-full p-1"
          style={{ background: 'var(--surface-container-high)' }}
        >
          <button
            className="w-8 h-8 rounded-full flex items-center justify-center transition-colors touch-manipulation hover:bg-white"
            style={{ color: 'var(--on-surface)' }}
            onClick={() => onUpdateQuantity(item.productId, item.cantidad - 1)}
          >
            <RemoveOutlinedIcon style={{ fontSize: '1rem' }} />
          </button>
          <span
            className="w-9 text-center font-bold text-sm"
            style={{ color: 'var(--on-surface)', fontFamily: 'var(--font-mono)' }}
          >
            {item.cantidad}
          </span>
          <button
            className="w-8 h-8 rounded-full flex items-center justify-center transition-colors touch-manipulation hover:bg-white"
            style={{ color: 'var(--on-surface)' }}
            onClick={() => onUpdateQuantity(item.productId, item.cantidad + 1)}
          >
            <AddOutlinedIcon style={{ fontSize: '1rem' }} />
          </button>
        </div>

        {/* Total */}
        <p
          className="font-bold text-sm w-20 text-right"
          style={{ color: 'var(--on-surface)', fontFamily: 'var(--font-mono)' }}
        >
          {formatCOP(item.precioUnitario * item.cantidad)}
        </p>
      </div>
    </div>
  )
})

export default CartItem
