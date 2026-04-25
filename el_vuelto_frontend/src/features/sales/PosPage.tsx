import { useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import ArrowBackOutlinedIcon from '@mui/icons-material/ArrowBackOutlined'
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
import CatalogGrid from './components/CatalogGrid'
import ProductGrid from './components/ProductGrid'
import CategoryChips from './components/CategoryChips'
import CartPanel from './components/CartPanel'
import PaymentSection from './components/PaymentSection'
import CashInputModal from './components/CashInputModal'
import SearchBar from './components/SearchBar'
import SuccessModal from './components/SuccessModal'
import type { Category, PosProduct } from '@/features/products/productsApi'

type ViewState = 'catalog' | 'products'

export default function PosPage() {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const user = useAppSelector((s) => s.auth.user)
  const { items, metodoPago, montoRecibido } = useAppSelector((s) => s.pos)

  const [view, setView] = useState<ViewState>('catalog')
  const [activeCategoryName, setActiveCategoryName] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [showCashModal, setShowCashModal] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [lastSaleTotal, setLastSaleTotal] = useState(0)
  const [lastVuelto, setLastVuelto] = useState<number | null>(null)
  const [lastMetodoPago, setLastMetodoPago] = useState<'EFECTIVO' | 'NEQUI_TRANSFERENCIA'>('EFECTIVO')
  const [saleError, setSaleError] = useState<string | null>(null)

  const { data: products = [], isLoading: loadingProducts } = useGetPosProductsQuery()
  const { data: categories = [] } = useListCategoriesQuery()
  const [createSale, { isLoading: creating }] = useCreateSaleMutation()

  const totalVenta = items.reduce((acc, i) => acc + i.precioUnitario * i.cantidad, 0)

  const productCountByCategory = useMemo<Record<string, number>>(() => {
    const map: Record<string, number> = {}
    for (const p of products) {
      if (p.category) {
        map[p.category] = (map[p.category] ?? 0) + 1
      }
    }
    return map
  }, [products])

  const filteredProducts = useMemo<PosProduct[]>(() => {
    let result = products
    if (activeCategoryName) {
      result = result.filter((p) => p.category === activeCategoryName)
    }
    const q = searchQuery.trim().toLowerCase()
    if (q) {
      result = result.filter(
        (p) =>
          p.nombre.toLowerCase().includes(q) ||
          (p.barcode != null && p.barcode.toLowerCase() === q),
      )
    }
    return result
  }, [products, activeCategoryName, searchQuery])

  const handleAddProduct = useCallback(
    (p: PosProduct) => {
      dispatch(
        addItem({
          productId: p.id,
          nombre: p.nombre,
          precioUnitario: parseFloat(p.precio_venta),
          tipo: p.tipo,
        }),
      )
    },
    [dispatch],
  )

  function handleSearchChange(v: string) {
    setSearchQuery(v)
    // auto-jump to products view when typing from catalog
    if (v.trim() && view === 'catalog') {
      setActiveCategoryName(null)
      setView('products')
    }
  }

  function handleCategorySelect(cat: Category) {
    setActiveCategoryName(cat.nombre)
    setView('products')
    setSearchQuery('')
  }

  function handleShowAll() {
    setActiveCategoryName(null)
    setView('products')
    setSearchQuery('')
  }

  function handleBackToCatalog() {
    setView('catalog')
    setActiveCategoryName(null)
    setSearchQuery('')
  }

  function handleScanEnter() {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return
    const barcodeMatch = products.find((p) => p.barcode?.toLowerCase() === q)
    if (barcodeMatch) {
      handleAddProduct(barcodeMatch)
      setSearchQuery('')
      return
    }
    const nameMatch = filteredProducts.find((p) => p.nombre.toLowerCase() === q)
    if (nameMatch) {
      handleAddProduct(nameMatch)
      setSearchQuery('')
    }
  }

  async function handleCobrar() {
    if (items.length === 0) return
    setSaleError(null)
    const montoEfectivo =
      metodoPago === 'EFECTIVO' ? (montoRecibido ?? totalVenta) : totalVenta
    const vuelto =
      metodoPago === 'EFECTIVO' && montoRecibido !== null
        ? Math.max(0, montoRecibido - totalVenta)
        : null
    try {
      await createSale({
        metodo_pago: metodoPago,
        monto_recibido: montoEfectivo,
        items: items.map((i) => ({
          product: i.productId,
          cantidad: i.cantidad,
          precio_unitario: i.precioUnitario,
        })),
      }).unwrap()
      setLastSaleTotal(totalVenta)
      setLastVuelto(vuelto)
      setLastMetodoPago(metodoPago)
      dispatch(clearCart())
      setShowSuccessModal(true)
    } catch {
      setSaleError('Hubo un error al registrar la venta. Inténtalo de nuevo.')
    }
  }

  const cobrarDisabled =
    items.length === 0 ||
    (metodoPago === 'EFECTIVO' &&
      (montoRecibido === null || montoRecibido < totalVenta))

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: 'var(--background)' }}>
      {/* ── Header ── */}
      <header
        className="flex justify-between items-center w-full px-8 py-4 shrink-0 z-10"
        style={{
          background: 'rgba(255,248,240,0.92)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(220,193,183,0.25)',
        }}
      >
        <div className="flex items-center gap-6">
          <span
            className="text-2xl font-bold"
            style={{ color: 'var(--primary)', fontFamily: "'Playfair Display', serif" }}
          >
            El Vuelto
          </span>
          {user?.tenantNombre && (
            <>
              <div
                className="h-6 w-px"
                style={{ background: 'var(--outline-variant)', opacity: 0.4 }}
              />
              <span className="font-medium text-sm" style={{ color: 'var(--on-surface-variant)' }}>
                {user.tenantNombre}
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-4">
          {user?.nombre && (
            <div
              className="hidden md:flex items-center gap-2 px-4 py-2 rounded-full"
              style={{ background: 'var(--surface-container-highest)', color: 'var(--on-surface-variant)' }}
            >
              <span className="text-sm font-medium uppercase tracking-wider">
                Cajero: {user.nombre.split(' ')[0]}
              </span>
            </div>
          )}
          <button
            onClick={() => { dispatch(logout()); navigate('/login') }}
            className="px-6 py-2 rounded-full font-bold transition-all hover:bg-surface-container active:scale-95 touch-manipulation"
            style={{
              border: '1px solid var(--outline-variant)',
              color: 'var(--primary)',
            }}
          >
            Cerrar Turno
          </button>
        </div>
      </header>

      {/* ── Body ── */}
      <main className="flex flex-1 overflow-hidden">
        {/* Left panel */}
        <section
          className="flex flex-col h-full overflow-hidden"
          style={{
            flex: 1,
            background: view === 'products' ? 'var(--surface-container-low)' : 'var(--background)',
            padding: '2rem',
            gap: '2rem',
          }}
        >
          {/* Search bar — always visible */}
          <SearchBar
            value={searchQuery}
            onChange={handleSearchChange}
            onScanEnter={handleScanEnter}
          />

          {view === 'catalog' ? (
            /* ── Catalog view ── */
            <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: 'var(--outline-variant) transparent' }}>
              <CatalogGrid
                categories={categories}
                productCountByCategory={productCountByCategory}
                onCategorySelect={handleCategorySelect}
                onShowAll={handleShowAll}
              />
            </div>
          ) : (
            /* ── Products view ── */
            <>
              {/* Back + breadcrumb + chips */}
              <div className="flex flex-col gap-4 shrink-0">
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleBackToCatalog}
                    className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-lg transition-colors touch-manipulation"
                    style={{ background: 'var(--surface-container)', color: 'var(--on-surface-variant)' }}
                  >
                    <ArrowBackOutlinedIcon style={{ fontSize: '1rem' }} />
                    Categorías
                  </button>
                  {activeCategoryName && (
                    <span className="text-sm font-bold" style={{ color: 'var(--on-surface)' }}>
                      / {activeCategoryName}
                    </span>
                  )}
                </div>
                <CategoryChips
                  categories={categories}
                  activeNombre={activeCategoryName}
                  onSelect={(nombre) => {
                    setActiveCategoryName(nombre)
                    setSearchQuery('')
                  }}
                />
              </div>

              {/* Error banner */}
              {saleError && (
                <div
                  className="px-5 py-3 rounded-xl text-sm font-medium shrink-0"
                  style={{ background: 'var(--error-container)', color: 'var(--on-error-container)' }}
                >
                  {saleError}
                </div>
              )}

              {/* Product grid */}
              <div
                className="flex-1 overflow-y-auto pr-1"
                style={{ scrollbarWidth: 'thin', scrollbarColor: 'var(--outline-variant) transparent' }}
              >
                <ProductGrid
                  products={filteredProducts}
                  isLoading={loadingProducts}
                  onAddProduct={handleAddProduct}
                />
              </div>
            </>
          )}
        </section>

        {/* Right panel — cart (34% width = −15% relative to original 40%) */}
        <CartPanel
          items={items}
          onUpdateQuantity={(id, qty) =>
            dispatch(updateQuantity({ productId: id, cantidad: qty }))
          }
          onRemove={(id) => dispatch(removeItem(id))}
          onClear={() => dispatch(clearCart())}
        >
          <PaymentSection
            totalVenta={totalVenta}
            metodoPago={metodoPago}
            montoRecibido={montoRecibido}
            onMetodoPago={(m) => dispatch(setMetodoPago(m))}
            onCobrar={handleCobrar}
            onOpenCashModal={() => setShowCashModal(true)}
            isLoading={creating}
            disabled={cobrarDisabled}
          />
        </CartPanel>
      </main>

      {/* ── Modals ── */}
      {showCashModal && (
        <CashInputModal
          total={totalVenta}
          initial={montoRecibido}
          onConfirm={(amount) => dispatch(setMontoRecibido(amount))}
          onClose={() => setShowCashModal(false)}
        />
      )}
      {showSuccessModal && (
        <SuccessModal
          total={lastSaleTotal}
          vuelto={lastVuelto}
          metodoPago={lastMetodoPago}
          onNewSale={() => { setShowSuccessModal(false); setView('catalog'); setSaleError(null) }}
          onClose={() => { setShowSuccessModal(false); setView('catalog') }}
        />
      )}
    </div>
  )
}
