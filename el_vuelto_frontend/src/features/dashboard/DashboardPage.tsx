import { useGetSummaryQuery, useGetVentasPorHoraQuery, useGetTopProductosQuery } from '@/features/reports/reportsApi'
import { useListSalesQuery } from '@/features/sales/salesApi'
import { useAppSelector } from '@/app/hooks'
import { formatCOP } from '@/utils/formatCOP'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import TrendingDownIcon from '@mui/icons-material/TrendingDown'
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined'
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined'
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined'
import ShoppingBagOutlinedIcon from '@mui/icons-material/ShoppingBagOutlined'
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined'
import CalendarTodayOutlinedIcon from '@mui/icons-material/CalendarTodayOutlined'

function todayLabel() {
  return new Date().toLocaleDateString('es-CO', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export default function DashboardPage() {
  const user = useAppSelector((s) => s.auth.user)
  const { data: summary }       = useGetSummaryQuery({})
  const { data: ventasPorHora } = useGetVentasPorHoraQuery({})
  const { data: topProductos }  = useGetTopProductosQuery({ limit: 5 })
  const { data: recentSales }   = useListSalesQuery()

  const maxHora = Math.max(...(ventasPorHora?.map((v) => v.total) ?? [1]), 1)

  const metodoLabel =
    (summary?.porcentaje_efectivo ?? 0) >= (summary?.porcentaje_nequi ?? 0)
      ? `Efectivo ${summary?.porcentaje_efectivo ?? 0}%`
      : `Nequi ${summary?.porcentaje_nequi ?? 0}%`

  const greeting = (() => {
    const h = new Date().getHours()
    if (h < 12) return 'Buenos días'
    if (h < 18) return 'Buenas tardes'
    return 'Buenas noches'
  })()

  return (
    <div className="ta-page">
      {/* ── Hero ── */}
      <div className="ta-page-hero">
        <div>
          <h1 className="ta-page-title">{greeting}, {user?.nombre?.split(' ')[0] ?? 'Admin'}</h1>
          <p className="ta-page-sub" style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginTop: '0.5rem' }}>
            <CalendarTodayOutlinedIcon style={{ fontSize: '0.875rem' }} />
            {todayLabel()}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="ta-btn ta-btn-secondary">
            <DownloadOutlinedIcon style={{ fontSize: '1.125rem' }} />
            Exportar corte
          </button>
        </div>
      </div>

      {/* ── KPI grid ── */}
      <div className="ta-kpi-grid">
        {/* Ventas hoy */}
        <div className="ta-kpi-card ta-kpi-card--accent">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
            <p className="ta-kpi-label">Ventas hoy</p>
            <PaymentsOutlinedIcon style={{ color: 'var(--primary-container)', fontSize: '1.25rem' }} />
          </div>
          <p className="ta-kpi-value">{formatCOP(summary?.total_ventas ?? 0)}</p>
          <div className="ta-kpi-meta ta-kpi-meta--up">
            <TrendingUpIcon style={{ fontSize: '1rem' }} />
            <span>Actualizado hoy</span>
          </div>
        </div>

        {/* Transacciones */}
        <div className="ta-kpi-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
            <p className="ta-kpi-label">Transacciones</p>
            <ReceiptLongOutlinedIcon style={{ color: 'var(--on-secondary-container)', fontSize: '1.25rem' }} />
          </div>
          <p className="ta-kpi-value">{summary?.num_transacciones ?? 0}</p>
          <div className="ta-kpi-meta ta-kpi-meta--flat">
            <span className="ta-mono ta-mono--muted" style={{ fontSize: '0.75rem' }}>
              {summary?.num_transacciones
                ? formatCOP((summary.total_ventas ?? 0) / summary.num_transacciones) + ' promedio'
                : 'Sin ventas'}
            </span>
          </div>
        </div>

        {/* Unidades */}
        <div className="ta-kpi-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
            <p className="ta-kpi-label">Unidades vendidas</p>
            <ShoppingBagOutlinedIcon style={{ color: 'var(--on-secondary-container)', fontSize: '1.25rem' }} />
          </div>
          <p className="ta-kpi-value">{summary?.unidades_vendidas ?? 0}</p>
          <div className="ta-kpi-meta ta-kpi-meta--flat">
            <span style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)' }}>
              {topProductos?.[0] ? `${topProductos[0].nombre} lidera` : 'Sin datos'}
            </span>
          </div>
        </div>

        {/* Método principal */}
        <div className="ta-kpi-card ta-kpi-card--secondary">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
            <p className="ta-kpi-label" style={{ color: 'var(--on-secondary-container)' }}>Método más usado</p>
            <AccountBalanceWalletOutlinedIcon style={{ color: 'var(--on-secondary-container)', fontSize: '1.25rem' }} />
          </div>
          <p className="ta-kpi-value--serif" style={{ color: 'var(--on-secondary-fixed)' }}>
            {(summary?.porcentaje_efectivo ?? 0) >= (summary?.porcentaje_nequi ?? 0) ? 'Efectivo' : 'Nequi'}
          </p>
          <div style={{ marginTop: '0.75rem' }}>
            <div style={{ height: '0.25rem', background: 'rgba(45,22,0,0.1)', borderRadius: '9999px', overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: `${Math.max(summary?.porcentaje_efectivo ?? 0, summary?.porcentaje_nequi ?? 0)}%`,
                  background: 'var(--on-secondary-container)',
                  borderRadius: '9999px',
                }}
              />
            </div>
            <span style={{ fontSize: '0.6875rem', color: 'var(--on-secondary-fixed-variant)', marginTop: '0.25rem', display: 'block' }}>
              {metodoLabel}
            </span>
          </div>
        </div>
      </div>

      {/* ── Charts row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
        {/* Bar chart */}
        <div className="ta-card">
          <div className="ta-card-header">
            <div>
              <h2 className="ta-card-title">Ventas por hora — hoy</h2>
              <p style={{ fontSize: '0.8125rem', color: 'var(--on-surface-variant)', marginTop: '0.125rem' }}>Actividad en tiempo real (COP)</p>
            </div>
            {ventasPorHora && ventasPorHora.length > 0 && (
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: '0.625rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Pico de ventas
                </p>
                <p className="ta-mono" style={{ fontSize: '0.875rem' }}>
                  {ventasPorHora.reduce((p, c) => (c.total > p.total ? c : p), ventasPorHora[0]).hora}:00
                </p>
              </div>
            )}
          </div>
          <div className="ta-bar-chart">
            {(ventasPorHora ?? []).map((v) => {
              const heightPct = maxHora > 0 ? Math.max((v.total / maxHora) * 100, 2) : 2
              const isPeak = ventasPorHora && v.total === maxHora && v.total > 0
              return (
                <div key={v.hora} className="ta-bar-col">
                  <div
                    className={`ta-bar-fill${isPeak ? ' ta-bar-fill--peak' : ''}`}
                    style={{ height: `${heightPct}%` }}
                    title={formatCOP(v.total)}
                  />
                  <span className={`ta-bar-label${isPeak ? ' ta-bar-label--peak' : ''}`}>
                    {v.hora}h
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Top productos */}
        <div className="ta-card">
          <div className="ta-card-header">
            <h2 className="ta-card-title">Top productos hoy</h2>
          </div>
          <div className="ta-rank-list">
            {(topProductos ?? []).map((p, i) => (
              <div key={p.product_id} className="ta-rank-item">
                <span className="ta-rank-badge">{i + 1}</span>
                <span className="ta-rank-name">{p.nombre}</span>
                <span className="ta-rank-units">{p.unidades} u.</span>
              </div>
            ))}
            {(!topProductos || topProductos.length === 0) && (
              <p style={{ fontSize: '0.875rem', color: 'var(--on-surface-variant)' }}>Sin datos para hoy</p>
            )}
          </div>
          <div className="ta-divider" style={{ margin: '1.5rem 0 0.5rem' }} />
          <button className="ta-btn ta-btn-ghost" style={{ width: '100%', justifyContent: 'center', fontSize: '0.875rem', fontWeight: 700 }}>
            Ver inventario completo
          </button>
        </div>
      </div>

      {/* ── Recent sales table ── */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h2 className="ta-serif" style={{ fontSize: '1.375rem', fontWeight: 700 }}>Últimas ventas</h2>
          <button className="ta-btn ta-btn-ghost" style={{ fontSize: '0.875rem' }}>
            <DownloadOutlinedIcon style={{ fontSize: '1rem' }} />
            Exportar
          </button>
        </div>

        <div className="ta-table-wrap">
          <table className="ta-table">
            <thead className="ta-thead">
              <tr>
                <th className="ta-th">Recibo</th>
                <th className="ta-th">Hora</th>
                <th className="ta-th">Cajero</th>
                <th className="ta-th">Método</th>
                <th className="ta-th" style={{ textAlign: 'right' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {(recentSales ?? []).slice(0, 8).map((s) => (
                <tr key={s.id} className="ta-tr">
                  <td className="ta-td ta-mono ta-mono--muted" style={{ fontSize: '0.8125rem' }}>
                    #{s.id.slice(0, 6).toUpperCase()}
                  </td>
                  <td className="ta-td" style={{ fontSize: '0.875rem' }}>
                    {new Date(s.created_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="ta-td" style={{ fontSize: '0.875rem' }}>{s.user_nombre}</td>
                  <td className="ta-td">
                    <span className={`ta-pay-chip ta-pay-chip--${s.metodo_pago === 'EFECTIVO' ? 'efectivo' : 'nequi'}`}>
                      {s.metodo_pago === 'EFECTIVO' ? 'Efectivo' : 'Nequi'}
                    </span>
                  </td>
                  <td className="ta-td ta-mono ta-mono--primary" style={{ textAlign: 'right', fontWeight: 700 }}>
                    {formatCOP(parseFloat(s.total))}
                  </td>
                </tr>
              ))}
              {(!recentSales || recentSales.length === 0) && (
                <tr>
                  <td colSpan={5} className="ta-td" style={{ textAlign: 'center', color: 'var(--on-surface-variant)' }}>
                    Sin ventas registradas hoy
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
