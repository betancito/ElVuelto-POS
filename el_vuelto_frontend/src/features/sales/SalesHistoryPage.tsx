import { useState, useMemo } from 'react'
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined'
import PrintOutlinedIcon from '@mui/icons-material/PrintOutlined'
import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined'
import { useListSalesQuery } from './salesApi'
import { useAppSelector } from '@/app/hooks'
import { formatCOP } from '@/utils/formatCOP'
import { printReceipt } from '@/utils/printReceipt'
import { ReceiptPreview } from './components/ReceiptPreview'
import type { Sale } from './salesApi'

const PAGE_SIZE = 20

function formatDate(isoString: string): string {
  const d = new Date(isoString)
  return (
    d.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
    ' ' +
    d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
  )
}

function metodoPagoLabel(metodo: string): string {
  return metodo === 'EFECTIVO' ? 'Efectivo' : 'Nequi/Transferencia'
}

// ── Receipt modal ──────────────────────────────────────────────────────────
function SaleReceiptModal({
  sale,
  tenantNombre,
  onClose,
}: {
  sale: Sale
  tenantNombre: string
  onClose: () => void
}) {
  return (
    <div
      className="ta-modal-backdrop"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="ta-modal" style={{ maxWidth: '30rem' }}>
        <div className="ta-modal-header">
          <span className="ta-modal-title" style={{ fontSize: '1.25rem' }}>
            Recibo #{sale.codigo}
          </span>
          <button
            onClick={onClose}
            className="ta-btn-icon"
            style={{ marginLeft: 'auto' }}
          >
            <CloseOutlinedIcon fontSize="small" />
          </button>
        </div>
        <div className="ta-modal-body" style={{ gap: '1.5rem' }}>
          <ReceiptPreview sale={sale} tenantNombre={tenantNombre} />
        </div>
        <div className="ta-modal-footer">
          <button
            className="ta-btn ta-btn-secondary"
            onClick={() => printReceipt(sale, tenantNombre)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <PrintOutlinedIcon fontSize="small" />
            Imprimir
          </button>
          <button className="ta-btn ta-btn-primary" onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function SalesHistoryPage() {
  const tenantNombre = useAppSelector((s) => s.auth.user?.tenantNombre ?? '')

  const [search, setSearch] = useState('')
  const [fechaInicio, setFechaInicio] = useState('')
  const [fechaFin, setFechaFin] = useState('')
  const [page, setPage] = useState(1)
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null)

  const { data: allSales = [], isLoading } = useListSalesQuery(
    {
      search: search || undefined,
      fecha_inicio: fechaInicio || undefined,
      fecha_fin: fechaFin || undefined,
    },
  )

  const totalPages = Math.max(1, Math.ceil(allSales.length / PAGE_SIZE))
  const pageSales = useMemo(
    () => allSales.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [allSales, page],
  )

  function handleSearchChange(v: string) {
    setSearch(v)
    setPage(1)
  }

  return (
    <div className="ta-page">
      {/* Header */}
      <div className="ta-page-hero">
        <div>
          <h1 className="ta-page-title">Historial de Ventas</h1>
          <p className="ta-page-sub">Consulta y descarga recibos de cada transacción</p>
        </div>
      </div>

      {/* Filters */}
      <div className="ta-card" style={{ padding: '1.25rem 1.5rem' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr auto auto',
            gap: '1rem',
            alignItems: 'end',
          }}
        >
          <div className="ta-field">
            <label className="ta-label">Buscar por código o cajero</label>
            <input
              className="ta-input"
              placeholder="Ej: A3F7K2P o Juan..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
          </div>
          <div className="ta-field">
            <label className="ta-label">Desde</label>
            <input
              className="ta-input"
              type="date"
              value={fechaInicio}
              onChange={(e) => { setFechaInicio(e.target.value); setPage(1) }}
            />
          </div>
          <div className="ta-field">
            <label className="ta-label">Hasta</label>
            <input
              className="ta-input"
              type="date"
              value={fechaFin}
              onChange={(e) => { setFechaFin(e.target.value); setPage(1) }}
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="ta-table-wrap">
        <table className="ta-table">
          <thead className="ta-thead">
            <tr>
              <th className="ta-th">Código</th>
              <th className="ta-th">Cajero</th>
              <th className="ta-th">Fecha</th>
              <th className="ta-th">Método</th>
              <th className="ta-th">Total</th>
              <th className="ta-th">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td className="ta-td" colSpan={6} style={{ textAlign: 'center', padding: '3rem' }}>
                  Cargando ventas…
                </td>
              </tr>
            ) : pageSales.length === 0 ? (
              <tr>
                <td className="ta-td" colSpan={6} style={{ textAlign: 'center', padding: '3rem' }}>
                  No se encontraron ventas
                </td>
              </tr>
            ) : (
              pageSales.map((sale) => (
                <tr key={sale.id} className="ta-tr">
                  <td className="ta-td">
                    <span
                      style={{
                        background: 'var(--primary-container)',
                        color: 'var(--on-primary-container)',
                        borderRadius: '0.375rem',
                        padding: '0.25rem 0.625rem',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.8125rem',
                        fontWeight: 700,
                        letterSpacing: '0.04em',
                      }}
                    >
                      {sale.codigo}
                    </span>
                  </td>
                  <td className="ta-td">{sale.user_nombre}</td>
                  <td className="ta-td ta-mono ta-mono--muted">{formatDate(sale.created_at)}</td>
                  <td className="ta-td">
                    <span
                      className={
                        sale.metodo_pago === 'EFECTIVO'
                          ? 'ta-badge ta-badge--neutral'
                          : 'ta-badge ta-badge--success'
                      }
                    >
                      {metodoPagoLabel(sale.metodo_pago)}
                    </span>
                  </td>
                  <td className="ta-td">
                    <span className="ta-mono ta-mono--primary">
                      {formatCOP(parseFloat(sale.total))}
                    </span>
                  </td>
                  <td className="ta-td">
                    <button
                      className="ta-btn-icon"
                      title="Ver recibo"
                      onClick={() => setSelectedSale(sale)}
                    >
                      <ReceiptLongOutlinedIcon fontSize="small" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '1rem',
          }}
        >
          <button
            className="ta-btn ta-btn-ghost"
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
          >
            ← Anterior
          </button>
          <span style={{ fontSize: '0.875rem', color: 'var(--on-surface-variant)' }}>
            Página {page} de {totalPages}
          </span>
          <button
            className="ta-btn ta-btn-ghost"
            disabled={page === totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Siguiente →
          </button>
        </div>
      )}

      {/* Receipt modal */}
      {selectedSale && (
        <SaleReceiptModal
          sale={selectedSale}
          tenantNombre={tenantNombre}
          onClose={() => setSelectedSale(null)}
        />
      )}
    </div>
  )
}
