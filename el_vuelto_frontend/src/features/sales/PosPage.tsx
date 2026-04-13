import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGetPosProductsQuery, useListCategoriesQuery } from '@/features/products/productsApi'
import { useCreateSaleMutation } from '@/features/sales/salesApi'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import {
  addItem,
  removeItem,
  updateQuantity,
  clearCart,
  setMetodoPago,
  setMontoRecibido,
} from './posSlice'
import { logout } from '@/features/auth/authSlice'
import { formatCOP } from '@/utils/formatCOP'
import Button from '@/components/ui/Button'
import Spinner from '@/components/ui/Spinner'
import type { PosProduct } from '@/features/products/productsApi'
import styles from './PosPage.module.css'

export default function PosPage() {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const user = useAppSelector((s) => s.auth.user)
  const { items, metodoPago, montoRecibido } = useAppSelector((s) => s.pos)

  const [activeCategory, setActiveCategory] = useState<string>('todos')
  const [saleSuccess, setSaleSuccess] = useState(false)

  const { data: products, isLoading: loadingProducts } = useGetPosProductsQuery()
  const { data: categories } = useListCategoriesQuery()
  const [createSale, { isLoading: creating }] = useCreateSaleMutation()

  const totalVenta = items.reduce((acc, i) => acc + i.precioUnitario * i.cantidad, 0)
  const vuelto = montoRecibido !== null && metodoPago === 'EFECTIVO'
    ? Math.max(0, montoRecibido - totalVenta)
    : 0

  const filtered =
    activeCategory === 'todos'
      ? (products ?? [])
      : (products ?? []).filter((p) => p.category === activeCategory)

  async function cobrar() {
    if (items.length === 0) return
    try {
      await createSale({
        metodo_pago: metodoPago,
        monto_recibido: metodoPago === 'EFECTIVO' ? (montoRecibido ?? totalVenta) : totalVenta,
        items: items.map((i) => ({
          product: i.productId,
          cantidad: i.cantidad,
          precio_unitario: i.precioUnitario,
        })),
      }).unwrap()
      dispatch(clearCart())
      setSaleSuccess(true)
      setTimeout(() => setSaleSuccess(false), 2000)
    } catch {}
  }

  function handleAddProduct(p: PosProduct) {
    dispatch(
      addItem({
        productId: p.id,
        nombre: p.nombre,
        precioUnitario: parseFloat(p.precio_venta),
        tipo: p.tipo,
      }),
    )
  }

  return (
    <div className={styles.root}>
      {/* Top bar */}
      <header className={styles.topBar}>
        <div className={styles.topLeft}>
          <span className={styles.brandName}>El Vuelto</span>
          <span className={styles.tenantName}>{user?.tenantNombre}</span>
        </div>
        <div className={styles.topRight}>
          <span className={styles.workerName}>{user?.nombre}</span>
          <button
            className={styles.logoutBtn}
            onClick={() => { dispatch(logout()); navigate('/login') }}
          >
            <span className="material-symbols-outlined">logout</span>
          </button>
        </div>
      </header>

      <div className={styles.body}>
        {/* Product area */}
        <section className={styles.productArea}>
          {/* Category pills */}
          <div className={styles.pills}>
            <button
              className={[styles.pill, activeCategory === 'todos' ? styles.pillActive : ''].join(' ')}
              onClick={() => setActiveCategory('todos')}
            >
              Todos
            </button>
            {(categories ?? []).map((c) => (
              <button
                key={c.id}
                className={[styles.pill, activeCategory === c.id ? styles.pillActive : ''].join(' ')}
                onClick={() => setActiveCategory(c.id)}
              >
                {c.nombre}
              </button>
            ))}
          </div>

          {/* Product grid */}
          {loadingProducts ? (
            <div className={styles.loadingCenter}><Spinner /></div>
          ) : (
            <div className={styles.grid}>
              {filtered.map((p) => (
                <button key={p.id} className={styles.productCard} onClick={() => handleAddProduct(p)}>
                  {p.imagen ? (
                    <img src={p.imagen} alt={p.nombre} className={styles.productImg} />
                  ) : (
                    <div className={styles.productImgPlaceholder}>
                      <span className="material-symbols-outlined">bakery_dining</span>
                    </div>
                  )}
                  <div className={styles.productInfo}>
                    <span className={styles.productName}>{p.nombre}</span>
                    <span className={styles.productPrice}>{formatCOP(parseFloat(p.precio_venta))}</span>
                  </div>
                  <div className={styles.addIcon}>
                    <span className="material-symbols-outlined">add_circle</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Cart panel */}
        <aside className={styles.cartPanel}>
          <div className={styles.cartHeader}>
            <h2 className={styles.cartTitle}>Venta Actual</h2>
            {items.length > 0 && (
              <button className={styles.clearBtn} onClick={() => dispatch(clearCart())}>
                Limpiar
              </button>
            )}
          </div>

          <div className={styles.cartItems}>
            {items.length === 0 ? (
              <p className={styles.emptyCart}>Agrega productos para comenzar</p>
            ) : (
              items.map((item) => (
                <div key={item.productId} className={styles.cartItem}>
                  <div className={styles.cartItemInfo}>
                    <span className={styles.cartItemName}>{item.nombre}</span>
                    <span className={styles.cartItemPrice}>
                      {formatCOP(item.precioUnitario * item.cantidad)}
                    </span>
                  </div>
                  <div className={styles.qtyControls}>
                    <button
                      className={styles.qtyBtn}
                      onClick={() => dispatch(updateQuantity({ productId: item.productId, cantidad: item.cantidad - 1 }))}
                    >
                      <span className="material-symbols-outlined">remove</span>
                    </button>
                    <span className={styles.qty}>{item.cantidad}</span>
                    <button
                      className={styles.qtyBtn}
                      onClick={() => dispatch(updateQuantity({ productId: item.productId, cantidad: item.cantidad + 1 }))}
                    >
                      <span className="material-symbols-outlined">add</span>
                    </button>
                    <button
                      className={styles.deleteBtn}
                      onClick={() => dispatch(removeItem(item.productId))}
                    >
                      <span className="material-symbols-outlined">delete</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Payment section */}
          <div className={styles.paymentSection}>
            {/* Method toggle */}
            <div className={styles.methodToggle}>
              <button
                className={[styles.methodBtn, metodoPago === 'EFECTIVO' ? styles.methodActive : ''].join(' ')}
                onClick={() => dispatch(setMetodoPago('EFECTIVO'))}
              >
                <span className="material-symbols-outlined">payments</span>
                Efectivo
              </button>
              <button
                className={[styles.methodBtn, metodoPago === 'NEQUI_TRANSFERENCIA' ? styles.methodActive : ''].join(' ')}
                onClick={() => dispatch(setMetodoPago('NEQUI_TRANSFERENCIA'))}
              >
                <span className="material-symbols-outlined">smartphone</span>
                Nequi
              </button>
            </div>

            {/* Total */}
            <div className={styles.totalRow}>
              <span>Total</span>
              <span className={styles.totalAmount}>{formatCOP(totalVenta)}</span>
            </div>

            {/* Recibido (efectivo only) */}
            {metodoPago === 'EFECTIVO' && (
              <>
                <div className={styles.recibidoRow}>
                  <label className={styles.recibidoLabel}>Recibido</label>
                  <input
                    type="number"
                    className={styles.recibidoInput}
                    placeholder="0"
                    value={montoRecibido ?? ''}
                    onChange={(e) =>
                      dispatch(setMontoRecibido(e.target.value ? Number(e.target.value) : null))
                    }
                  />
                </div>
                {montoRecibido !== null && (
                  <div className={styles.vueltoRow}>
                    <span>Vuelto</span>
                    <span className={styles.vueltoAmount}>{formatCOP(vuelto)}</span>
                  </div>
                )}
              </>
            )}

            <Button
              fullWidth
              size="lg"
              loading={creating}
              disabled={
                items.length === 0 ||
                (metodoPago === 'EFECTIVO' && (montoRecibido === null || montoRecibido < totalVenta))
              }
              onClick={cobrar}
              className={saleSuccess ? styles.successBtn : ''}
            >
              {saleSuccess ? '✓ Venta registrada' : 'Cobrar Venta'}
            </Button>
          </div>
        </aside>
      </div>
    </div>
  )
}
