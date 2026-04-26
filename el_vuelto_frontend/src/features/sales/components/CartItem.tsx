import React, { useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import AddOutlinedIcon from '@mui/icons-material/AddOutlined'
import RemoveOutlinedIcon from '@mui/icons-material/RemoveOutlined'
import BackspaceOutlinedIcon from '@mui/icons-material/BackspaceOutlined'
import CheckOutlinedIcon from '@mui/icons-material/CheckOutlined'
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

const NUMPAD: string[] = ['1','2','3','4','5','6','7','8','9','⌫','0','✓']

const NUMPAD_WIDTH = 224 // px — must match CSS width

const CartItem = React.memo(function CartItem({ item, onUpdateQuantity }: Props) {
  const { bg, text } = avatarColor(item.nombre)
  const [editingQty, setEditingQty] = useState(false)
  const [qtyInput, setQtyInput] = useState('')
  const [numpadPos, setNumpadPos] = useState({ top: 0, left: 0 })
  const qtyBtnRef = useRef<HTMLButtonElement>(null)

  function openEditor() {
    if (qtyBtnRef.current) {
      const rect = qtyBtnRef.current.getBoundingClientRect()
      // Center horizontally over the button, clamped to viewport
      let left = rect.left + rect.width / 2 - NUMPAD_WIDTH / 2
      left = Math.max(8, Math.min(left, window.innerWidth - NUMPAD_WIDTH - 8))
      setNumpadPos({ top: rect.bottom + 8, left })
    }
    setQtyInput('')   // always start blank — display shows 0
    setEditingQty(true)
  }

  function closeEditor() {
    setEditingQty(false)
    setQtyInput('')
  }

  function appendDigit(d: string) {
    setQtyInput((prev) => {
      const base = prev === '0' ? '' : prev
      const next = base + d
      return parseInt(next, 10) > 999 ? prev : next
    })
  }

  function applyQty() {
    const val = parseInt(qtyInput, 10)
    if (!isNaN(val) && val > 0) {
      onUpdateQuantity(item.productId, val)
    }
    closeEditor()
  }

  function handleNumpadKey(k: string) {
    if (k === '⌫') { setQtyInput((p) => p.slice(0, -1)); return }
    if (k === '✓') { applyQty(); return }
    appendDigit(k)
  }

  const hasInput = qtyInput.length > 0 && parseInt(qtyInput, 10) > 0

  return (
    <div className="pos-cart-item-wrap">
      {/* ── Item row ── */}
      <div className="pos-cart-item">
        <div className="pos-cart-item__left">
          <div className="pos-cart-item__thumb">
            {item.imagen_url ? (
              <img src={item.imagen_url} alt={item.nombre} />
            ) : (
              <div className="pos-cart-item__avatar" style={{ background: bg, color: text }}>
                {item.nombre.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div style={{ minWidth: 0 }}>
            <p className="pos-cart-item__name">{item.nombre}</p>
            <p className="pos-cart-item__unit">{formatCOP(item.precioUnitario)} c/u</p>
          </div>
        </div>

        <div className="pos-cart-item__right">
          <div className="pos-cart-item__qty-pill">
            <button
              className="pos-cart-item__qty-btn"
              onClick={() => onUpdateQuantity(item.productId, item.cantidad - 1)}
            >
              <RemoveOutlinedIcon style={{ fontSize: '1rem' }} />
            </button>

            <button
              ref={qtyBtnRef}
              className={`pos-cart-item__qty-num${editingQty ? ' pos-cart-item__qty-num--active' : ''}`}
              onClick={openEditor}
              title="Cambiar cantidad"
            >
              {item.cantidad}
            </button>

            <button
              className="pos-cart-item__qty-btn"
              onClick={() => onUpdateQuantity(item.productId, item.cantidad + 1)}
            >
              <AddOutlinedIcon style={{ fontSize: '1rem' }} />
            </button>
          </div>

          <span className="pos-cart-item__total">
            {formatCOP(item.precioUnitario * item.cantidad)}
          </span>
        </div>
      </div>

      {/* ── Qty editor — rendered as a fixed overlay via portal ── */}
      {editingQty && createPortal(
        <>
          {/* Transparent backdrop — click to cancel */}
          <div className="pos-qty-editor-backdrop" onClick={closeEditor} />

          {/* Floating numpad */}
          <div
            className="pos-qty-editor"
            style={{ top: numpadPos.top, left: numpadPos.left }}
          >
            {/* Display */}
            <div className="pos-qty-editor__display">
              <span className="pos-qty-editor__display-label">Nueva cantidad</span>
              <span className={`pos-qty-editor__display-value${!hasInput ? ' pos-qty-editor__display-value--empty' : ''}`}>
                {qtyInput || '0'}
              </span>
            </div>

            {/* 3 × 4 numpad */}
            <div className="pos-qty-editor__numpad">
              {NUMPAD.map((k) => {
                if (k === '⌫') {
                  return (
                    <button
                      key="back"
                      className="pos-qty-editor__key pos-qty-editor__key--backspace"
                      onClick={() => handleNumpadKey('⌫')}
                    >
                      <BackspaceOutlinedIcon style={{ fontSize: '1.125rem' }} />
                    </button>
                  )
                }
                if (k === '✓') {
                  return (
                    <button
                      key="confirm"
                      className={`pos-qty-editor__key pos-qty-editor__key--confirm${!hasInput ? ' pos-qty-editor__key--confirm-disabled' : ''}`}
                      onClick={() => handleNumpadKey('✓')}
                      disabled={!hasInput}
                    >
                      <CheckOutlinedIcon style={{ fontSize: '1.125rem' }} />
                    </button>
                  )
                }
                return (
                  <button
                    key={k}
                    className="pos-qty-editor__key"
                    onClick={() => handleNumpadKey(k)}
                  >
                    {k}
                  </button>
                )
              })}
            </div>
          </div>
        </>,
        document.body,
      )}
    </div>
  )
})

export default CartItem
