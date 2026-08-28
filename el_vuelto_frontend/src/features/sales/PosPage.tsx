import './pos.css'
import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { toast } from 'react-toastify'
import { useNavigate } from 'react-router-dom'
import ArrowBackOutlinedIcon from '@mui/icons-material/ArrowBackOutlined'
import PersonIcon from '@mui/icons-material/Person'
import LogoutIcon from '@mui/icons-material/Logout'
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined'
import InventoryOutlinedIcon from '@mui/icons-material/InventoryOutlined'
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
import { getServerErrorMessage } from '@/utils/applyServerErrors'
import CatalogGrid from './components/CatalogGrid'
import ProductGrid from './components/ProductGrid'
import CategoryChips from './components/CategoryChips'
import CartPanel from './components/CartPanel'
import PaymentSection from './components/PaymentSection'
import CashInputModal from './components/CashInputModal'
import SearchBar from './components/SearchBar'
import SuccessModal from './components/SuccessModal'
import InventoryEntryPanel from './components/InventoryEntryPanel'
import ClearCartModal from './components/ClearCartModal'
import IdleScreensaver from '@/components/ui/IdleScreensaver'
import type { Category, PosProduct } from '@/features/products/productsApi'
import type { Sale } from '@/features/sales/salesApi'

type ViewState = 'catalog' | 'products'
type PosMode = 'sale' | 'inventory'

export default function PosPage() {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const user = useAppSelector((s) => s.auth.user)
  const { items, metodoPago, montoRecibido } = useAppSelector((s) => s.pos)

  const [posMode, setPosMode] = useState<PosMode>('sale')
  const posModeRef = useRef<PosMode>('sale')
  const [inventoryProduct, setInventoryProduct] = useState<PosProduct | null>(null)

  const [view, setView] = useState<ViewState>('catalog')
  const [activeCategoryName, setActiveCategoryName] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [showCashModal, setShowCashModal] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [lastSale, setLastSale] = useState<Sale | null>(null)
  const [saleError, setSaleError] = useState<string | null>(null)
  const [showClearConfirm, setShowClearConfirm] = useState(false)

  useEffect(() => { posModeRef.current = posMode }, [posMode])

  function handleModeChange(mode: PosMode) {
    setPosMode(mode)
    setInventoryProduct(null)
    setSearchQuery('')
    setView('catalog')
  }

  const { data: products = [], isLoading: loadingProducts, refetch: refetchProducts } =
    useGetPosProductsQuery()
  const { data: categories = [], refetch: refetchCategories } = useListCategoriesQuery()
  const [createSale, { isLoading: creating }] = useCreateSaleMutation()

  // Stable ref — never goes stale inside the barcode listener closure
  const productsRef = useRef(products)
  useEffect(() => { productsRef.current = products }, [products])

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
    if (posMode === 'inventory') {
      result = result.filter((p) => p.tipo === 'CON_CODIGO')
    }
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
  }, [products, activeCategoryName, searchQuery, posMode])

  const handleAddProduct = useCallback(
    (p: PosProduct) => {
      dispatch(
        addItem({
          productId: p.id,
          nombre: p.nombre,
          precioUnitario: parseFloat(p.precio_venta),
          tipo: p.tipo,
          imagen_url: p.imagen_url,
        }),
      )
    },
    [dispatch],
  )

  const handleSelectInventoryProduct = useCallback((p: PosProduct) => {
    setInventoryProduct(p)
  }, [])

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

  // SearchBar calls this on Enter with the live DOM value (bypasses stale React state).
  // Handles manual text search; also catches scans when the input happens to be focused.
  function handleScanEnter(domValue: string) {
    const code = domValue.trim()
    if (!code) return

    if (posMode === 'inventory') {
      const match = products.find(
        (p) => p.tipo === 'CON_CODIGO' && p.barcode != null && p.barcode.toLowerCase() === code.toLowerCase(),
      ) ?? filteredProducts.find((p) => p.tipo === 'CON_CODIGO' && p.nombre.toLowerCase() === code.toLowerCase())
      if (match) {
        handleSelectInventoryProduct(match)
        setSearchQuery('')
        toast.success(`${match.nombre} seleccionado`, { position: 'bottom-left' })
      }
      return
    }

    const barcodeMatch = products.find(
      (p) => p.barcode != null && p.barcode.toLowerCase() === code.toLowerCase(),
    )
    if (barcodeMatch) {
      handleAddProduct(barcodeMatch)
      setSearchQuery('')
      toast.success(`${barcodeMatch.nombre} agregado al carrito`, { position: 'bottom-left' })
      return
    }

    const nameMatch = filteredProducts.find((p) => p.nombre.toLowerCase() === code.toLowerCase())
    if (nameMatch) {
      handleAddProduct(nameMatch)
      setSearchQuery('')
      toast.success(`${nameMatch.nombre} agregado al carrito`, { position: 'bottom-left' })
    }
  }

  // Global barcode listener — mirrors the inventory module pattern exactly.
  // Activates only when no INPUT/TEXTAREA/SELECT has focus (scanner fired while page-level focus).
  // Uses a 300 ms idle timer (same as inventory) instead of a per-keystroke timing check.
  useEffect(() => {
    let buffer = ''
    let timer: ReturnType<typeof setTimeout> | null = null

    function flush() {
      const code = buffer.trim()
      buffer = ''
      if (timer) { clearTimeout(timer); timer = null }

      if (code.length < 3) return

      if (posModeRef.current === 'inventory') {
        const match = productsRef.current.find(
          (p) => p.tipo === 'CON_CODIGO' && p.barcode != null && p.barcode.toLowerCase() === code.toLowerCase(),
        )
        if (match) {
          handleSelectInventoryProduct(match)
          setSearchQuery('')
          toast.success(`${match.nombre} seleccionado`, { position: 'bottom-left' })
        } else {
          toast.error(`Código "${code}" no encontrado`, { position: 'bottom-left' })
        }
        return
      }

      const match = productsRef.current.find(
        (p) => p.barcode != null && p.barcode.toLowerCase() === code.toLowerCase(),
      )

      if (match) {
        handleAddProduct(match)
        setSearchQuery('')
        toast.success(`${match.nombre} agregado al carrito`, { position: 'bottom-left' })
      } else {
        toast.error(`Código "${code}" no encontrado`, { position: 'bottom-left' })
      }
    }

    function onKeyDown(e: KeyboardEvent) {
      const tag = (document.activeElement as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return

      console.log('[POS Barcode] key:', e.key, '| buffer so far:', buffer)

      if (e.key === 'Enter') {
        if (timer) clearTimeout(timer)
        flush()
        return
      }
      if (e.key.length === 1) {
        buffer += e.key
        if (timer) clearTimeout(timer)
        timer = setTimeout(flush, 300)
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      if (timer) clearTimeout(timer)
    }
  }, [handleAddProduct, handleSelectInventoryProduct])

  async function handleCobrar() {
    if (items.length === 0) return
    setSaleError(null)
    const montoEfectivo =
      metodoPago === 'EFECTIVO' ? (montoRecibido ?? totalVenta) : totalVenta
    try {
      const sale = await createSale({
        metodo_pago: metodoPago,
        monto_recibido: montoEfectivo,
        items: items.map((i) => ({
          product: i.productId,
          cantidad: i.cantidad,
          precio_unitario: i.precioUnitario,
        })),
      }).unwrap()
      setLastSale(sale)
      dispatch(clearCart())
      setShowSuccessModal(true)
    } catch (err) {
      setSaleError(
        getServerErrorMessage(err, 'Hubo un error al registrar la venta. Inténtalo de nuevo.'),
      )
    }
  }

  const cobrarDisabled =
    items.length === 0 ||
    (metodoPago === 'EFECTIVO' &&
      (montoRecibido === null || montoRecibido < totalVenta))

  return (
    <div className="pos-root">
      {/* ── Header ── */}
      <header className="pos-header">
        <div className="flex items-center">
          <img
            src="/logos/El%20Vuelto%20-%20El_Vuelto_banner_v1_NO_BG.png"
            alt="El Vuelto"
            className="pos-header__logo"
          />
          {user?.tenantNombre && (
            <>
              <div className="pos-header__divider" />
              {user.tenantLogoUrl ? (
                <img
                  src={user.tenantLogoUrl}
                  alt={user.tenantNombre}
                  className="pos-header__tenant-logo"
                />
              ) : (
                <span className="pos-header__tenant">{user.tenantNombre}</span>
              )}
            </>
          )}
        </div>

        <div className="flex items-center gap-3">
          {user?.nombre && (
            <div className="pos-header__user-chip">
              <PersonIcon style={{ fontSize: '1rem' }} />
              <span>{user.nombre.split(' ')[0]}</span>
            </div>
          )}
          <button
            className="pos-header__close-btn"
            onClick={() => {
              // The slug is whatever the backend persisted for this tenant
              // (login response). Recomputing it here from `tenantNombre` sent
              // every business with a tilde to a URL that 'no existe'.
              const slug = user?.tenantSlug ?? null
              dispatch(logout())
              navigate(slug ? `/login/${slug}` : '/login')
            }}
          >
            <LogoutIcon style={{ fontSize: '1rem' }} />
            Cerrar Turno
          </button>
        </div>
      </header>

      {/* ── Body ── */}
      <main className="pos-body">
        {/* Left panel */}
        <section className="pos-left">
          {/* Search bar — always visible */}
          <SearchBar
            value={searchQuery}
            onChange={handleSearchChange}
            onScanEnter={handleScanEnter}
          />

          {/* Mode tab bar — only for lead cashiers */}
          {user?.leadCashier && (
            <div className="pos-tab-bar">
              <button
                className={`pos-tab-btn${posMode === 'sale' ? ' pos-tab-btn--active' : ''}`}
                onClick={() => handleModeChange('sale')}
              >
                <ShoppingCartOutlinedIcon style={{ fontSize: '1rem' }} />
                Venta
              </button>
              <button
                className={`pos-tab-btn${posMode === 'inventory' ? ' pos-tab-btn--active' : ''}`}
                onClick={() => handleModeChange('inventory')}
              >
                <InventoryOutlinedIcon style={{ fontSize: '1rem' }} />
                Inventario
              </button>
            </div>
          )}

          {view === 'catalog' ? (
            /* ── Catalog view ── */
            <CatalogGrid
              categories={categories}
              productCountByCategory={productCountByCategory}
              onCategorySelect={handleCategorySelect}
              onShowAll={handleShowAll}
            />
          ) : (
            /* ── Products view ── */
            <>
              {/* Back + breadcrumb + chips */}
              <div className="flex flex-col gap-4 shrink-0">
                <div className="flex items-center gap-3">
                  <button className="pos-back-btn" onClick={handleBackToCatalog}>
                    <ArrowBackOutlinedIcon style={{ fontSize: '1rem' }} />
                    Categorías
                  </button>
                  {activeCategoryName && (
                    <span className="pos-breadcrumb">/ {activeCategoryName}</span>
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
                <div className="pos-error-banner">{saleError}</div>
              )}

              {/* Product grid */}
              <ProductGrid
                products={filteredProducts}
                isLoading={loadingProducts}
                onAddProduct={posMode === 'inventory' ? handleSelectInventoryProduct : handleAddProduct}
              />
            </>
          )}
        </section>

        {/* Right panel — cart or inventory entry */}
        {posMode === 'inventory' ? (
          <InventoryEntryPanel
            product={inventoryProduct}
            onClear={() => setInventoryProduct(null)}
          />
        ) : (
          <CartPanel
            items={items}
            onUpdateQuantity={(id, qty) =>
              dispatch(updateQuantity({ productId: id, cantidad: qty }))
            }
            onRemove={(id) => dispatch(removeItem(id))}
            onClear={() => setShowClearConfirm(true)}
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
        )}
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
      {showClearConfirm && (
        <ClearCartModal
          items={items}
          montoRecibido={montoRecibido}
          onCancel={() => setShowClearConfirm(false)}
          onConfirm={() => {
            dispatch(clearCart())
            setShowClearConfirm(false)
          }}
        />
      )}
      {showSuccessModal && lastSale && (
        <SuccessModal
          sale={lastSale}
          tenantNombre={user?.tenantNombre ?? ''}
          onNewSale={() => { setShowSuccessModal(false); setView('catalog'); setSaleError(null) }}
          onClose={() => { setShowSuccessModal(false); setView('catalog') }}
        />
      )}

      {/* ── Modo reposo ──────────────────────────────────────────────────
          Vive DENTRO de PosPage a propósito: el refetch pasa por
          `baseQueryWithReauth`, y tras una noche dormido es justo donde el
          refresh puede fallar y despachar `logout()`. Montado desde afuera, el
          overlay quedaría colgado encima de la pantalla de login; acá se
          desmonta con la ruta.

          La guarda es larga porque cada término tapa una forma distinta de
          perderle trabajo al cajero:
          · items.length     — media venta cargada en el carrito.
          · posMode          — en inventario la cantidad a medio teclear vive en
                               estado LOCAL de InventoryEntryPanel, no en Redux,
                               así que `items` no la ve.
          · showSuccessModal — `handleCobrar` vacía el carrito ANTES de abrir
                               este modal, o sea que items ya es 0 mientras el
                               cajero lee el vuelto y el aviso de stock negativo.
                               Ese aviso solo viene en la respuesta del POST: si
                               el salvapantallas lo tapa, se pierde para siempre.
          · saleError        — no tapar un error que el cajero no leyó.        */}
      <IdleScreensaver
        disabled={
          user?.rol !== 'CAJERO' ||
          posMode !== 'sale' ||
          items.length > 0 ||
          showCashModal ||
          showSuccessModal ||
          showClearConfirm ||
          saleError !== null
        }
        onWake={() => {
          // Refetch, NO location.reload(): el carrito no está persistido
          // (store.ts solo persiste auth), así que recargar lo destruiría.
          refetchProducts()
          refetchCategories()
        }}
      />
    </div>
  )
}
