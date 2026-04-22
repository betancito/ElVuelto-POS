import { useState } from 'react'
import { useGetSummaryQuery, useGetVentasPorHoraQuery, useGetTopProductosQuery } from './reportsApi'
import { formatCOP } from '@/utils/formatCOP'
import Spinner from '@/components/ui/Spinner'
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined'
import FilterListOutlinedIcon from '@mui/icons-material/FilterListOutlined'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import HorizontalRuleIcon from '@mui/icons-material/HorizontalRule'
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined'

export default function ReportsPage() {
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10))

  const { data: summary,        isFetching: s1 } = useGetSummaryQuery({ fecha })
  const { data: ventasPorHora,  isFetching: s2 } = useGetVentasPorHoraQuery({ fecha })
  const { data: topProductos,   isFetching: s3 } = useGetTopProductosQuery({ fecha, limit: 10 })

  const loading  = s1 || s2 || s3
  const maxHora  = Math.max(...(ventasPorHora?.map((v) => v.total) ?? [1]), 1)
  const maxUnits = Math.max(...(topProductos?.map((p) => p.unidades) ?? [1]), 1)

  const metodoLabel =
    (summary?.porcentaje_efectivo ?? 0) >= (summary?.porcentaje_nequi ?? 0)
      ? 'Efectivo'
      : 'Nequi'

  return (
    <div className="ta-page">
      {/* ── Hero ── */}
      <div className="ta-page-hero">
        <div>
          <h1 className="ta-page-title">Análisis de ventas</h1>
          <p className="ta-page-sub">Visualiza el rendimiento de tu negocio.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <input
            type="date"
            className="ta-input"
            style={{ borderRadius: 'var(--radius-lg)', paddingLeft: '1rem', width: '10rem' }}
            value={fecha}
            max={new Date().toISOString().slice(0, 10)}
            onChange={(e) => setFecha(e.target.value)}
          />
          <button className="ta-btn ta-btn-secondary">
            <DownloadOutlinedIcon style={{ fontSize: '1.125rem' }} />
            Exportar
          </button>
        </div>
      </div>

      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
          <Spinner />
        </div>
      )}

      {!loading && (
        <>
          {/* ── KPI cards ── */}
          <div className="ta-kpi-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
            <div className="ta-kpi-card ta-kpi-card--accent">
              <p className="ta-kpi-label" style={{ marginBottom: '1rem' }}>Venta total</p>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem' }}>
                <span className="ta-serif" style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--primary)' }}>$</span>
                <span className="ta-mono ta-mono--primary" style={{ fontSize: '2rem' }}>
                  {(summary?.total_ventas ?? 0).toLocaleString('es-CO')}
                </span>
              </div>
              <div className="ta-kpi-meta ta-kpi-meta--up">
                <TrendingUpIcon style={{ fontSize: '1rem' }} />
                <span>Actualizado</span>
              </div>
            </div>

            <div className="ta-kpi-card ta-kpi-card--accent">
              <p className="ta-kpi-label" style={{ marginBottom: '1rem' }}>Ticket promedio</p>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem' }}>
                <span className="ta-serif" style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--primary)' }}>$</span>
                <span className="ta-mono ta-mono--primary" style={{ fontSize: '2rem' }}>
                  {summary?.num_transacciones
                    ? Math.round((summary.total_ventas ?? 0) / summary.num_transacciones).toLocaleString('es-CO')
                    : '0'}
                </span>
              </div>
              <div className="ta-kpi-meta ta-kpi-meta--flat">
                <HorizontalRuleIcon style={{ fontSize: '1rem' }} />
                <span>{summary?.num_transacciones ?? 0} transacciones</span>
              </div>
            </div>

            <div className="ta-kpi-card ta-kpi-card--accent">
              <p className="ta-kpi-label" style={{ marginBottom: '1rem' }}>Método predominante</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                  width: '3rem', height: '3rem', borderRadius: '50%',
                  background: 'var(--secondary-container)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <AccountBalanceWalletOutlinedIcon style={{ color: 'var(--on-secondary-container)' }} />
                </div>
                <div>
                  <span className="ta-serif" style={{ fontSize: '1.375rem', fontWeight: 700, color: 'var(--primary)', display: 'block' }}>
                    {metodoLabel}
                  </span>
                  <span className="ta-mono ta-mono--muted" style={{ fontSize: '0.75rem' }}>
                    {Math.max(summary?.porcentaje_efectivo ?? 0, summary?.porcentaje_nequi ?? 0)}% de transacciones
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Charts grid ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
            {/* Bar chart */}
            <div className="ta-card-low">
              <div className="ta-card-header">
                <h3 className="ta-card-title">Ventas por hora</h3>
                <span style={{
                  fontSize: '0.6875rem', fontWeight: 700,
                  background: 'var(--surface-container-lowest)',
                  padding: '0.25rem 0.75rem', borderRadius: '9999px',
                  color: 'var(--on-surface-variant)',
                }}>En vivo</span>
              </div>
              <div className="ta-bar-chart">
                {(ventasPorHora ?? []).map((v) => {
                  const heightPct = v.total > 0 ? Math.max((v.total / maxHora) * 100, 4) : 2
                  const isPeak = v.total === maxHora && v.total > 0
                  return (
                    <div key={v.hora} className="ta-bar-col">
                      <div
                        className={`ta-bar-fill${isPeak ? ' ta-bar-fill--peak' : ''}`}
                        style={{ height: `${heightPct}%` }}
                        title={formatCOP(v.total)}
                      />
                      <span className={`ta-bar-label${isPeak ? ' ta-bar-label--peak' : ''}`}>
                        {v.hora}:00
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Payment method breakdown */}
            <div className="ta-card-low">
              <h3 className="ta-card-title" style={{ marginBottom: '1.5rem' }}>Ventas por método</h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
                    <span style={{ fontSize: '0.875rem', fontWeight: 700 }}>Efectivo</span>
                    <span className="ta-mono" style={{ fontSize: '0.8125rem' }}>{summary?.porcentaje_efectivo ?? 0}%</span>
                  </div>
                  <div className="ta-progress-wrap">
                    <div className="ta-progress-fill" style={{ width: `${summary?.porcentaje_efectivo ?? 0}%` }} />
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
                    <span style={{ fontSize: '0.875rem', fontWeight: 700 }}>Nequi</span>
                    <span className="ta-mono" style={{ fontSize: '0.8125rem' }}>{summary?.porcentaje_nequi ?? 0}%</span>
                  </div>
                  <div className="ta-progress-wrap">
                    <div className="ta-progress-fill" style={{ width: `${summary?.porcentaje_nequi ?? 0}%`, background: 'var(--tertiary-container)' }} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Bottom grid: top products + unidades ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.5rem' }}>
            {/* Top 5 products horizontal bars */}
            <div className="ta-card-low">
              <h3 className="ta-card-title" style={{ marginBottom: '1.5rem' }}>Top 5 productos</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {(topProductos ?? []).slice(0, 5).map((p) => (
                  <div key={p.product_id} style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.8125rem', fontWeight: 700 }}>{p.nombre}</span>
                      <span className="ta-mono ta-mono--muted" style={{ fontSize: '0.75rem' }}>{p.unidades} u.</span>
                    </div>
                    <div className="ta-progress-wrap">
                      <div className="ta-progress-fill" style={{ width: `${(p.unidades / maxUnits) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top productos full table */}
            <div className="ta-card">
              <div className="ta-card-header">
                <h3 className="ta-card-title">Detalle de productos</h3>
                <div style={{ display: 'flex', gap: '0.25rem' }}>
                  <button className="ta-btn-icon" title="Filtrar">
                    <FilterListOutlinedIcon style={{ fontSize: '1.125rem' }} />
                  </button>
                  <button className="ta-btn-icon" title="Exportar">
                    <DownloadOutlinedIcon style={{ fontSize: '1.125rem' }} />
                  </button>
                </div>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="ta-table">
                  <thead className="ta-thead">
                    <tr>
                      <th className="ta-th">#</th>
                      <th className="ta-th">Producto</th>
                      <th className="ta-th" style={{ textAlign: 'center' }}>Unidades</th>
                      <th className="ta-th" style={{ textAlign: 'right' }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(topProductos ?? []).map((p, i) => (
                      <tr key={p.product_id} className="ta-tr">
                        <td className="ta-td ta-mono ta-mono--muted" style={{ width: '2rem' }}>{i + 1}</td>
                        <td className="ta-td" style={{ fontWeight: 600 }}>{p.nombre}</td>
                        <td className="ta-td ta-mono" style={{ textAlign: 'center' }}>{p.unidades}</td>
                        <td className="ta-td ta-mono ta-mono--primary" style={{ textAlign: 'right', fontWeight: 700 }}>
                          {formatCOP(p.total)}
                        </td>
                      </tr>
                    ))}
                    {(!topProductos || topProductos.length === 0) && (
                      <tr>
                        <td colSpan={4} className="ta-empty">Sin datos para la fecha seleccionada</td>
                      </tr>
                    )}
                  </tbody>
                  {topProductos && topProductos.length > 0 && (
                    <tfoot>
                      <tr style={{ background: 'var(--primary)', color: 'white' }}>
                        <td className="ta-td" colSpan={3} style={{ fontWeight: 700, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.08em' }}>
                          Total
                        </td>
                        <td className="ta-td ta-mono" style={{ textAlign: 'right', fontWeight: 700, fontSize: '1.125rem' }}>
                          {formatCOP(summary?.total_ventas ?? 0)}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
