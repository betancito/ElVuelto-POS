import { useGetSummaryQuery, useGetVentasPorHoraQuery, useGetTopProductosQuery } from '@/features/reports/reportsApi'
import { useListSalesQuery } from '@/features/sales/salesApi'
import { formatCOP } from '@/utils/formatCOP'
import Spinner from '@/components/ui/Spinner'
import styles from './DashboardPage.module.css'

function KpiCard({ label, value, icon, sub }: { label: string; value: string; icon: string; sub?: string }) {
  return (
    <div className={styles.kpiCard}>
      <div className={styles.kpiIcon}>
        <span className="material-symbols-outlined">{icon}</span>
      </div>
      <div>
        <p className={styles.kpiLabel}>{label}</p>
        <p className={styles.kpiValue}>{value}</p>
        {sub && <p className={styles.kpiSub}>{sub}</p>}
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { data: summary, isLoading: loadingSummary } = useGetSummaryQuery({})
  const { data: ventasPorHora } = useGetVentasPorHoraQuery({})
  const { data: topProductos } = useGetTopProductosQuery({ limit: 5 })
  const { data: recentSales } = useListSalesQuery()

  if (loadingSummary) {
    return (
      <div className={styles.loading}>
        <Spinner size="lg" />
      </div>
    )
  }

  const maxHora = Math.max(...(ventasPorHora?.map((v) => v.total) ?? [1]))

  return (
    <div className={styles.root}>
      <div className={styles.headerRow}>
        <h1 className={styles.heading}>Inicio</h1>
        <p className={styles.date}>{new Date().toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>

      {/* KPIs */}
      <div className={styles.kpiGrid}>
        <KpiCard
          label="Ventas hoy"
          value={formatCOP(summary?.total_ventas ?? 0)}
          icon="paid"
        />
        <KpiCard
          label="Transacciones"
          value={String(summary?.num_transacciones ?? 0)}
          icon="receipt_long"
        />
        <KpiCard
          label="Unidades vendidas"
          value={String(summary?.unidades_vendidas ?? 0)}
          icon="inventory"
        />
        <KpiCard
          label="Método principal"
          value={
            (summary?.porcentaje_efectivo ?? 0) >= (summary?.porcentaje_nequi ?? 0)
              ? `Efectivo ${summary?.porcentaje_efectivo ?? 0}%`
              : `Nequi ${summary?.porcentaje_nequi ?? 0}%`
          }
          icon="payments"
        />
      </div>

      <div className={styles.chartsRow}>
        {/* Ventas por hora */}
        <div className={styles.chartCard}>
          <h2 className={styles.chartTitle}>Ventas por hora</h2>
          <div className={styles.barChart}>
            {(ventasPorHora ?? []).map((v) => (
              <div key={v.hora} className={styles.barCol}>
                <div
                  className={styles.bar}
                  style={{ height: `${Math.round((v.total / maxHora) * 100)}%` }}
                  title={formatCOP(v.total)}
                />
                <span className={styles.barLabel}>{v.hora}h</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top productos */}
        <div className={styles.chartCard}>
          <h2 className={styles.chartTitle}>Top productos</h2>
          <div className={styles.topList}>
            {(topProductos ?? []).map((p, i) => (
              <div key={p.product_id} className={styles.topItem}>
                <span className={styles.topRank}>{i + 1}</span>
                <div className={styles.topInfo}>
                  <span className={styles.topName}>{p.nombre}</span>
                  <span className={styles.topUnits}>{p.unidades} uds</span>
                </div>
                <span className={styles.topTotal}>{formatCOP(p.total)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent sales */}
      <div className={styles.recentCard}>
        <h2 className={styles.chartTitle}>Ventas recientes</h2>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Hora</th>
              <th>Cajero</th>
              <th>Método</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {(recentSales ?? []).slice(0, 10).map((s) => (
              <tr key={s.id}>
                <td>{new Date(s.created_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}</td>
                <td>{s.user_nombre}</td>
                <td>{s.metodo_pago === 'EFECTIVO' ? 'Efectivo' : 'Nequi'}</td>
                <td className={styles.tableAmount}>{formatCOP(parseFloat(s.total))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
