import { useState, useRef, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  useListMovementsQuery,
  useCreateMovementMutation,
  useGetStockQuery,
  type InventoryMovement,
  type StockItem,
} from './inventoryApi'
import { formatCOP } from '@/utils/formatCOP'
import Spinner from '@/components/ui/Spinner'
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutlined'
import CloseIcon from '@mui/icons-material/Close'
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined'
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined'
import AttachMoneyOutlinedIcon from '@mui/icons-material/AttachMoneyOutlined'
import QrCodeScannerOutlinedIcon from '@mui/icons-material/QrCodeScannerOutlined'
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined'
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined'
import ErrorOutlinedIcon from '@mui/icons-material/ErrorOutlined'

// ─── Schema ───────────────────────────────────────────────────────────────────
const schema = z.object({
  product: z.string().min(1, 'Selecciona un producto'),
  tipo_movimiento: z.enum(['ENTRADA', 'AJUSTE']),
  cantidad: z.coerce.number().min(1, 'Mínimo 1'),
  precio_costo: z.string().min(1, 'Requerido'),
  nota: z.string().optional(),
})
type FormData = z.infer<typeof schema>

const TIPO_LABEL: Record<string, string> = {
  ENTRADA: 'Entrada',
  SALIDA_VENTA: 'Venta',
  AJUSTE: 'Ajuste',
}
const TIPO_BADGE: Record<string, string> = {
  ENTRADA: 'ta-badge--success',
  SALIDA_VENTA: 'ta-badge--warning',
  AJUSTE: 'ta-badge--neutral',
}

// ─── ChevronIcon ──────────────────────────────────────────────────────────────
function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      style={{ transition: 'transform 0.18s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)', flexShrink: 0 }}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

// ─── ProductPicker ────────────────────────────────────────────────────────────
interface ProductPickerProps {
  value: string
  onChange: (id: string) => void
  stock: StockItem[]
}

function ProductPicker({ value, onChange, stock }: ProductPickerProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const dropRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    const id = setTimeout(() => searchRef.current?.focus(), 60)
    return () => clearTimeout(id)
  }, [open])

  useEffect(() => {
    if (!open) return
    function onMouseDown(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setOpen(false)
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onMouseDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onMouseDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const selected = stock.find((s) => s.id === value)
  const filtered = search
    ? stock.filter((s) => s.nombre.toLowerCase().includes(search.toLowerCase()))
    : stock

  return (
    <div ref={dropRef} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: '0.625rem',
          padding: '0.625rem 0.875rem',
          background: 'var(--surface-container-highest)',
          border: '1.5px solid transparent',
          borderBottom: '1.5px solid var(--outline-variant)',
          borderRadius: '8px 8px 0 0',
          cursor: 'pointer', minHeight: '2.75rem', textAlign: 'left',
          fontSize: '0.9375rem',
          color: selected ? 'var(--on-surface)' : 'var(--on-surface-variant)',
        }}
      >
        {selected ? (
          <>
            {selected.imagen_url ? (
              <img src={selected.imagen_url} alt="" style={{ width: '1.75rem', height: '1.75rem', borderRadius: '4px', objectFit: 'cover', flexShrink: 0 }} />
            ) : (
              <div style={{ width: '1.75rem', height: '1.75rem', borderRadius: '4px', background: 'var(--surface-container)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span className="material-symbols-outlined" style={{ fontSize: '1rem', color: 'var(--outline)' }}>inventory_2</span>
              </div>
            )}
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selected.nombre}</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)', fontFamily: 'var(--font-mono)', flexShrink: 0 }}>
              stock: {selected.stock_actual}
            </span>
          </>
        ) : (
          <span style={{ flex: 1 }}>Seleccionar producto...</span>
        )}
        <ChevronIcon open={open} />
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
          background: '#fff',
          border: '1.5px solid var(--outline-variant)', borderTop: 'none',
          borderRadius: '0 0 8px 8px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          overflow: 'hidden',
        }}>
          <div style={{ padding: '0.5rem', borderBottom: '1px solid var(--surface-container-low)' }}>
            <div style={{ position: 'relative' }}>
              <SearchOutlinedIcon style={{ position: 'absolute', left: '0.625rem', top: '50%', transform: 'translateY(-50%)', fontSize: '1rem', color: 'var(--outline)', pointerEvents: 'none' }} />
              <input
                ref={searchRef}
                type="text"
                placeholder="Buscar..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  width: '100%', paddingLeft: '2rem', paddingRight: '0.5rem',
                  paddingTop: '0.375rem', paddingBottom: '0.375rem',
                  border: 'none', outline: 'none', fontSize: '0.875rem',
                  background: 'var(--surface-container-low)', borderRadius: '6px', boxSizing: 'border-box',
                }}
              />
            </div>
          </div>
          <div style={{ maxHeight: 'calc(3.25rem * 4 + 0.5rem)', overflowY: 'auto' }}>
            {filtered.length === 0 ? (
              <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--on-surface-variant)', fontSize: '0.875rem' }}>
                Sin resultados
              </div>
            ) : (
              filtered.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => { onChange(s.id); setOpen(false); setSearch('') }}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: '0.625rem',
                    padding: '0.625rem 0.875rem',
                    background: s.id === value ? 'var(--surface-container-low)' : 'transparent',
                    border: 'none', borderBottom: '1px solid var(--surface-container-low)',
                    cursor: 'pointer', textAlign: 'left',
                  }}
                  onMouseEnter={(e) => { if (s.id !== value) (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface-container)' }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = s.id === value ? 'var(--surface-container-low)' : 'transparent' }}
                >
                  {s.imagen_url ? (
                    <img src={s.imagen_url} alt="" style={{ width: '2rem', height: '2rem', borderRadius: '4px', objectFit: 'cover', flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: '2rem', height: '2rem', borderRadius: '4px', background: 'var(--surface-container)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '1.125rem', color: 'var(--outline)' }}>inventory_2</span>
                    </div>
                  )}
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <div style={{ fontSize: '0.9375rem', fontWeight: s.id === value ? 700 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {s.nombre}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: s.stock_actual <= 0 ? 'var(--error)' : 'var(--on-surface-variant)', fontFamily: 'var(--font-mono)' }}>
                      stock: {s.stock_actual}
                    </div>
                  </div>
                  {s.id === value && (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── MovementModal ────────────────────────────────────────────────────────────
interface MovementModalProps {
  onClose: () => void
  initialProductId: string | null
  stock: StockItem[]
}

function MovementModal({ onClose, initialProductId, stock }: MovementModalProps) {
  const [createMovement, { isLoading: creating }] = useCreateMovementMutation()
  const [success, setSuccess] = useState(false)

  const { handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      product: initialProductId ?? '',
      tipo_movimiento: 'ENTRADA',
      cantidad: 1,
      precio_costo: '',
      nota: '',
    },
  })

  const selectedId = watch('product')
  const tipoMovimiento = watch('tipo_movimiento')
  const selectedProduct = stock.find((s) => s.id === selectedId)

  useEffect(() => {
    if (selectedProduct?.precio_costo) {
      setValue('precio_costo', selectedProduct.precio_costo)
    }
  }, [selectedId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function onSubmit(data: FormData) {
    try {
      await createMovement(data).unwrap()
      setSuccess(true)
      setTimeout(() => { reset(); onClose() }, 1200)
    } catch {}
  }

  return (
    <div
      className="ta-modal-backdrop"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="ta-modal ta-modal--lg">
        <div className="ta-modal-header">
          <div>
            <h2 className="ta-modal-title">Registrar Movimiento</h2>
            <p className="ta-modal-sub">Entrada de stock o ajuste manual</p>
          </div>
          <button type="button" className="ta-btn-icon" onClick={onClose}>
            <CloseIcon style={{ fontSize: '1.25rem' }} />
          </button>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}
        >
          <div className="ta-modal-body">
            {/* Product picker */}
            <div className="ta-field">
              <label className="ta-label">Buscar producto</label>
              <ProductPicker
                value={selectedId}
                onChange={(id) => setValue('product', id, { shouldValidate: true })}
                stock={stock}
              />
              {errors.product && <span className="ta-field-error">{errors.product.message}</span>}
            </div>

            {/* Selected product preview */}
            {selectedProduct && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '1rem',
                padding: '0.875rem 1rem',
                background: 'var(--surface-container-low)',
                borderRadius: '8px',
                border: '1px solid var(--outline-variant)',
              }}>
                {selectedProduct.imagen_url ? (
                  <img src={selectedProduct.imagen_url} alt="" style={{ width: '3.5rem', height: '3.5rem', borderRadius: '8px', objectFit: 'cover', flexShrink: 0 }} />
                ) : (
                  <div style={{ width: '3.5rem', height: '3.5rem', borderRadius: '8px', background: 'var(--surface-container)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '1.5rem', color: 'var(--outline)' }}>inventory_2</span>
                  </div>
                )}
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--on-surface)' }}>{selectedProduct.nombre}</div>
                  <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.25rem', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.8125rem', color: 'var(--on-surface-variant)' }}>
                      Stock actual:{' '}
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: selectedProduct.stock_actual <= 0 ? 'var(--error)' : 'var(--tertiary)' }}>
                        {selectedProduct.stock_actual}
                      </span>
                    </span>
                    {selectedProduct.proveedor && (
                      <span style={{ fontSize: '0.8125rem', color: 'var(--on-surface-variant)' }}>
                        Proveedor: <span style={{ color: 'var(--on-surface)' }}>{selectedProduct.proveedor}</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Movement type toggle */}
            <div className="ta-field">
              <label className="ta-label">Tipo de movimiento</label>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                {(['ENTRADA', 'AJUSTE'] as const).map((tipo) => (
                  <button
                    key={tipo}
                    type="button"
                    onClick={() => setValue('tipo_movimiento', tipo)}
                    style={{
                      flex: 1, padding: '0.625rem 0.875rem',
                      border: '1.5px solid',
                      borderColor: tipoMovimiento === tipo ? 'var(--primary)' : 'var(--outline-variant)',
                      borderRadius: '8px',
                      background: tipoMovimiento === tipo ? 'var(--primary-fixed)' : 'transparent',
                      color: tipoMovimiento === tipo ? 'var(--primary)' : 'var(--on-surface-variant)',
                      fontWeight: tipoMovimiento === tipo ? 700 : 400,
                      cursor: 'pointer', fontSize: '0.9375rem',
                    }}
                  >
                    {tipo === 'ENTRADA' ? 'Entrada' : 'Ajuste manual'}
                  </button>
                ))}
              </div>
            </div>

            {/* Qty + cost */}
            <div className="ta-form-grid">
              <div className="ta-field">
                <label className="ta-label">Cantidad</label>
                <input
                  className="ta-input ta-mono"
                  type="number"
                  min={1}
                  placeholder="1"
                  value={watch('cantidad')}
                  onChange={(e) => setValue('cantidad', Number(e.target.value), { shouldValidate: true })}
                />
                {errors.cantidad && <span className="ta-field-error">{errors.cantidad.message}</span>}
              </div>
              <div className="ta-field">
                <label className="ta-label">Costo unitario</label>
                <input
                  className="ta-input ta-mono"
                  type="text"
                  inputMode="numeric"
                  placeholder="$ 0"
                  value={watch('precio_costo')}
                  onChange={(e) => setValue('precio_costo', e.target.value, { shouldValidate: true })}
                />
                {errors.precio_costo && <span className="ta-field-error">{errors.precio_costo.message}</span>}
              </div>
            </div>

            {/* Note */}
            <div className="ta-field">
              <label className="ta-label">Nota (opcional)</label>
              <input
                className="ta-input"
                type="text"
                placeholder="Ej: Compra a proveedor..."
                value={watch('nota') ?? ''}
                onChange={(e) => setValue('nota', e.target.value)}
              />
            </div>
          </div>

          <div className="ta-modal-footer">
            <button type="button" className="ta-btn ta-btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button
              type="submit"
              className="ta-btn ta-btn-primary"
              disabled={creating || success}
              style={success ? { background: 'var(--tertiary)', borderColor: 'var(--tertiary)' } : undefined}
            >
              <SaveOutlinedIcon style={{ fontSize: '1.125rem' }} />
              {success ? '✓ Registrado' : creating ? 'Guardando...' : 'Confirmar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── MovementsTable ───────────────────────────────────────────────────────────
function MovementsTable({ movements }: { movements: InventoryMovement[] }) {
  return (
    <table className="ta-table">
      <thead className="ta-thead">
        <tr>
          <th className="ta-th">Fecha</th>
          <th className="ta-th">Producto</th>
          <th className="ta-th">Tipo</th>
          <th className="ta-th">Cantidad</th>
          <th className="ta-th">Costo unit.</th>
          <th className="ta-th">Usuario</th>
          <th className="ta-th">Nota</th>
        </tr>
      </thead>
      <tbody>
        {movements.map((m) => {
          const isPositive = m.cantidad > 0
          return (
            <tr key={m.id} className="ta-tr">
              <td className="ta-td ta-mono ta-mono--muted" style={{ fontSize: '0.8125rem' }}>
                {new Date(m.created_at).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })}
              </td>
              <td className="ta-td" style={{ fontWeight: 700 }}>{m.product_nombre}</td>
              <td className="ta-td">
                <span className={`ta-badge ${TIPO_BADGE[m.tipo_movimiento] ?? 'ta-badge--neutral'}`}>
                  {TIPO_LABEL[m.tipo_movimiento] ?? m.tipo_movimiento}
                </span>
              </td>
              <td className="ta-td ta-mono" style={{ color: isPositive ? 'var(--tertiary)' : 'var(--error)', fontWeight: 700 }}>
                {isPositive ? `+${m.cantidad}` : m.cantidad}
              </td>
              <td className="ta-td ta-mono ta-mono--muted" style={{ fontSize: '0.875rem' }}>
                {m.precio_costo ? formatCOP(parseFloat(m.precio_costo)) : '—'}
              </td>
              <td className="ta-td" style={{ fontSize: '0.875rem' }}>{m.user_nombre}</td>
              <td className="ta-td" style={{ fontSize: '0.875rem', color: 'var(--on-surface-variant)', fontStyle: m.nota ? 'normal' : 'italic' }}>
                {m.nota || '—'}
              </td>
            </tr>
          )
        })}
        {movements.length === 0 && (
          <tr>
            <td colSpan={7} className="ta-empty">Sin movimientos registrados</td>
          </tr>
        )}
      </tbody>
    </table>
  )
}

// ─── InventoryPage ────────────────────────────────────────────────────────────
export default function InventoryPage() {
  const { data: movements, isLoading } = useListMovementsQuery()
  const { data: stock } = useGetStockQuery()

  const [showModal, setShowModal] = useState(false)
  const [barcodeProductId, setBarcodeProductId] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [notFoundCode, setNotFoundCode] = useState('')

  const stockRef = useRef<StockItem[]>([])
  useEffect(() => { stockRef.current = stock ?? [] }, [stock])

  // Global barcode detection — buffer rapid keystrokes from HID scanner
  useEffect(() => {
    let buffer = ''
    let timer: ReturnType<typeof setTimeout> | null = null

    function flush() {
      const code = buffer.trim()
      buffer = ''
      if (code.length < 3) return
      const found = stockRef.current.find((s) => s.barcode === code)
      if (found) {
        setBarcodeProductId(found.id)
        setShowModal(true)
      } else {
        setNotFoundCode(code)
        setNotFound(true)
        setTimeout(() => setNotFound(false), 3500)
      }
    }

    function onKeyDown(e: KeyboardEvent) {
      const tag = (document.activeElement as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
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
  }, [])

  function openFreshModal() {
    setBarcodeProductId(null)
    setShowModal(true)
  }

  function closeModal() {
    setShowModal(false)
    setBarcodeProductId(null)
  }

  /* KPIs */
  const totalProductos = stock?.length ?? 0
  const valorTotal = stock?.reduce((acc, s) => {
    const costo = parseFloat(s.precio_costo ?? '0')
    return acc + s.stock_actual * (isNaN(costo) ? 0 : costo)
  }, 0) ?? 0
  const alertas = stock?.filter((s) => s.bajo_minimo).length ?? 0

  return (
    <div className="ta-page">
      {/* ── Not-found banner ── */}
      {notFound && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.75rem',
          padding: '0.75rem 1.25rem',
          background: 'var(--error-container)', borderRadius: '8px',
          color: 'var(--on-error-container)', fontSize: '0.9375rem',
        }}>
          <ErrorOutlinedIcon style={{ fontSize: '1.125rem', flexShrink: 0 }} />
          <span>Código <strong style={{ fontFamily: 'var(--font-mono)' }}>{notFoundCode}</strong> no encontrado en inventario.</span>
        </div>
      )}

      {/* ── Hero ── */}
      <div className="ta-page-hero">
        <div>
          <h1 className="ta-page-title">Inventario</h1>
          <p className="ta-page-sub">Historial de movimientos y niveles de stock.</p>
        </div>
        <button className="ta-btn ta-btn-primary" onClick={openFreshModal}>
          <AddCircleOutlineIcon style={{ fontSize: '1.125rem' }} />
          Registrar ingreso
        </button>
      </div>

      {/* ── KPIs ── */}
      <div className="ta-kpi-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div className="ta-kpi-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
            <p className="ta-kpi-label">Productos activos</p>
            <Inventory2OutlinedIcon style={{ color: 'var(--primary-container)', fontSize: '1.25rem' }} />
          </div>
          <p className="ta-kpi-value">{totalProductos}</p>
          <div className="ta-kpi-meta ta-kpi-meta--flat">
            <span style={{ fontSize: '0.75rem' }}>En catálogo</span>
          </div>
        </div>

        <div className="ta-kpi-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
            <p className="ta-kpi-label">Valor total stock</p>
            <AttachMoneyOutlinedIcon style={{ color: 'var(--primary-container)', fontSize: '1.25rem' }} />
          </div>
          <p className="ta-kpi-value">{formatCOP(valorTotal)}</p>
        </div>

        <div className="ta-kpi-card" style={{ borderLeft: alertas > 0 ? '3px solid var(--error)' : 'none' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
            <p className="ta-kpi-label">Alertas de stock</p>
            <WarningAmberOutlinedIcon style={{ color: alertas > 0 ? 'var(--error)' : 'var(--outline)', fontSize: '1.25rem' }} />
          </div>
          <p className="ta-kpi-value" style={{ color: alertas > 0 ? 'var(--error)' : 'var(--primary)' }}>
            {alertas}
          </p>
          <div className="ta-kpi-meta" style={{ color: alertas > 0 ? 'var(--error)' : 'var(--on-surface-variant)' }}>
            <span style={{ fontSize: '0.75rem' }}>{alertas > 0 ? 'Bajo stock mínimo' : 'Niveles normales'}</span>
          </div>
        </div>
      </div>

      {/* ── Scanner hint ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '0.5rem',
        padding: '0.625rem 1rem',
        background: 'var(--surface-container-low)',
        borderRadius: '8px', fontSize: '0.8125rem',
        color: 'var(--on-surface-variant)',
      }}>
        <QrCodeScannerOutlinedIcon style={{ fontSize: '1rem', flexShrink: 0 }} />
        <span>Pasa el escáner sobre cualquier producto para registrar un movimiento rápidamente.</span>
      </div>

      {/* ── Movements table (always visible) ── */}
      <div className="ta-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--surface-container-low)' }}>
          <h3 className="ta-card-title" style={{ margin: 0 }}>Movimientos recientes</h3>
        </div>
        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}><Spinner /></div>
        ) : (
          <MovementsTable movements={movements ?? []} />
        )}
      </div>

      {/* ── Modal ── */}
      {showModal && (
        <MovementModal
          onClose={closeModal}
          initialProductId={barcodeProductId}
          stock={stock ?? []}
        />
      )}
    </div>
  )
}
