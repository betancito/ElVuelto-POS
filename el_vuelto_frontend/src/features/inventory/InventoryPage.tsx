import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useListMovementsQuery, useCreateMovementMutation, useGetStockQuery, type InventoryMovement } from './inventoryApi'
import { formatCOP } from '@/utils/formatCOP'
import Spinner from '@/components/ui/Spinner'
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutlined'
import CloseIcon from '@mui/icons-material/Close'
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined'
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined'
import AttachMoneyOutlinedIcon from '@mui/icons-material/AttachMoneyOutlined'
import BarcodeScannerIcon from '@mui/icons-material/QrCodeScannerOutlined'
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined'

const schema = z.object({
  product:          z.string().min(1, 'Selecciona un producto'),
  tipo_movimiento:  z.enum(['ENTRADA', 'AJUSTE']),
  cantidad:         z.coerce.number().min(1),
  precio_costo:     z.string().min(1),
  nota:             z.string().optional(),
})

type FormData = z.infer<typeof schema>

const TIPO_LABEL: Record<string, string> = {
  ENTRADA:      'Entrada',
  SALIDA_VENTA: 'Venta',
  AJUSTE:       'Ajuste',
}

const TIPO_BADGE: Record<string, string> = {
  ENTRADA:      'ta-badge--success',
  SALIDA_VENTA: 'ta-badge--warning',
  AJUSTE:       'ta-badge--neutral',
}

export default function InventoryPage() {
  const { data: movements, isLoading } = useListMovementsQuery()
  const { data: stock }                = useGetStockQuery()
  const [createMovement, { isLoading: creating }] = useCreateMovementMutation()

  const [showPanel, setShowPanel] = useState(false)

  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { tipo_movimiento: 'ENTRADA' },
  })

  const selectedProductId = watch('product')
  const selectedStock = stock?.find((s) => s.product_id === selectedProductId)

  async function onSubmit(data: FormData) {
    await createMovement(data).unwrap()
    setShowPanel(false)
    reset()
  }

  /* KPI computations from stock */
  const totalProductos = stock?.length ?? 0
  const valorTotal     = stock?.reduce((acc, s) => acc + s.stock_actual * parseFloat(s.precio_costo), 0) ?? 0
  const alertas        = stock?.filter((s) => s.stock_actual <= 5).length ?? 0

  return (
    <div className="ta-page">
      {/* ── Hero ── */}
      <div className="ta-page-hero">
        <div>
          <h1 className="ta-page-title">Inventario</h1>
          <p className="ta-page-sub">Historial de movimientos y niveles de stock.</p>
        </div>
        <button className="ta-btn ta-btn-primary" onClick={() => setShowPanel(true)}>
          <AddCircleOutlineIcon style={{ fontSize: '1.125rem' }} />
          Registrar ingreso
        </button>
      </div>

      {/* ── KPI cards ── */}
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
            <span style={{ fontSize: '0.75rem' }}>{alertas > 0 ? 'Stock crítico ≤ 5 und.' : 'Niveles normales'}</span>
          </div>
        </div>
      </div>

      {/* ── Movements table ── */}
      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}><Spinner /></div>
      ) : showPanel ? (
        /* Two-pane layout when panel is open */
        <div className="ta-pane-layout" style={{ minHeight: '32rem' }}>
          <div className="ta-pane-main">
            <MovementsTable movements={movements ?? []} />
          </div>
          <aside className="ta-pane-side">
            <div className="ta-pane-side-header">
              <h3 className="ta-card-title" style={{ fontSize: '1.125rem' }}>Registrar ingreso</h3>
              <button className="ta-btn-icon" onClick={() => setShowPanel(false)}>
                <CloseIcon style={{ fontSize: '1.125rem' }} />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} noValidate style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
              <div className="ta-pane-side-body">
                {/* Product search */}
                <div className="ta-field">
                  <label className="ta-label">Buscar producto</label>
                  <div style={{ position: 'relative' }}>
                    <BarcodeScannerIcon style={{
                      position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)',
                      color: 'var(--outline)', fontSize: '1.125rem', pointerEvents: 'none',
                    }} />
                    <select className="ta-select" style={{ paddingLeft: '2.5rem' }} {...register('product')}>
                      <option value="">Seleccionar producto...</option>
                      {(stock ?? []).map((s) => (
                        <option key={s.product_id} value={s.product_id}>
                          {s.nombre} (stock: {s.stock_actual})
                        </option>
                      ))}
                    </select>
                  </div>
                  {errors.product && <span className="ta-field-error">{errors.product.message}</span>}
                </div>

                {/* Qty + cost */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="ta-field">
                    <label className="ta-label">Cantidad</label>
                    <input className="ta-input ta-mono" type="number" defaultValue={1} {...register('cantidad')} />
                    {errors.cantidad && <span className="ta-field-error">{errors.cantidad.message}</span>}
                  </div>
                  <div className="ta-field">
                    <label className="ta-label">Costo unit.</label>
                    <input
                      className="ta-input ta-mono"
                      placeholder="$ 0"
                      defaultValue={selectedStock?.precio_costo ?? ''}
                      {...register('precio_costo')}
                    />
                    {errors.precio_costo && <span className="ta-field-error">{errors.precio_costo.message}</span>}
                  </div>
                </div>

                {/* Type */}
                <div className="ta-field">
                  <label className="ta-label">Tipo de movimiento</label>
                  <select className="ta-select" {...register('tipo_movimiento')}>
                    <option value="ENTRADA">Entrada</option>
                    <option value="AJUSTE">Ajuste manual</option>
                  </select>
                </div>

                {/* Note */}
                <div className="ta-field">
                  <label className="ta-label">Nota (opcional)</label>
                  <input className="ta-input" placeholder="Ej: Compra a proveedor..." {...register('nota')} />
                </div>
              </div>

              <div className="ta-pane-side-footer">
                <button type="submit" className="ta-btn ta-btn-primary" style={{ width: '100%', padding: '0.875rem', justifyContent: 'center', fontSize: '1rem' }} disabled={creating}>
                  <SaveOutlinedIcon style={{ fontSize: '1.125rem' }} />
                  {creating ? 'Guardando...' : 'Confirmar ingreso'}
                </button>
              </div>
            </form>
          </aside>
        </div>
      ) : (
        <div className="ta-table-wrap">
          <MovementsTable movements={movements ?? []} />
        </div>
      )}
    </div>
  )
}

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
        {movements.map((m) => (
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
            <td className="ta-td ta-mono" style={{ color: m.tipo_movimiento === 'ENTRADA' ? 'var(--tertiary)' : 'var(--error)', fontWeight: 700 }}>
              {m.tipo_movimiento === 'ENTRADA' ? '+' : '-'}{m.cantidad}
            </td>
            <td className="ta-td ta-mono ta-mono--muted" style={{ fontSize: '0.875rem' }}>
              {formatCOP(parseFloat(m.precio_costo))}
            </td>
            <td className="ta-td" style={{ fontSize: '0.875rem' }}>{m.user_nombre}</td>
            <td className="ta-td" style={{ fontSize: '0.875rem', color: 'var(--on-surface-variant)', fontStyle: m.nota ? 'normal' : 'italic' }}>
              {m.nota || '—'}
            </td>
          </tr>
        ))}
        {movements.length === 0 && (
          <tr>
            <td colSpan={7} className="ta-empty">Sin movimientos registrados</td>
          </tr>
        )}
      </tbody>
    </table>
  )
}
