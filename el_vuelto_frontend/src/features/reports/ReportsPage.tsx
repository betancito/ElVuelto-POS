import { useState } from 'react'
import { useGetSummaryQuery, useGetVentasPorHoraQuery, useGetTopProductosQuery } from './reportsApi'
import { formatCOP } from '@/utils/formatCOP'
import Spinner from '@/components/ui/Spinner'
import styles from './ReportsPage.module.css'

export default function ReportsPage() {
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10))
  const { data: summary, isFetching: s1 } = useGetSummaryQuery({ fecha })
  const { data: ventasPorHora, isFetching: s2 } = useGetVentasPorHoraQuery({ fecha })
  const { data: topProductos, isFetching: s3 } = useGetTopProductosQuery({ fecha, limit: 10 })

  const loading = s1 || s2 || s3
  const maxHora = Math.max(...(ventasPorHora?.map((v) => v.total) ?? [1]))

  return (
    <div className={styles.root}>
      <div className={styles.headerRow}>
        <h1 className={styles.heading}>Reportes</h1>
        <input
          type="date"
          className={styles.datePicker}
          value={fecha}
          onChange={(e) => setFecha(e.target.value)}
          max={new Date().toISOString().slice(0, 10)}
        />
      </div>

      {loading && <div className={styles.loading}><Spinner /></div>}

      {!loading && (
        <>
          {/* Summary cards */}
          <div className={styles.kpiGrid}>
            <div className={styles.kpi}>
              <span className={styles.kpiLabel}>Total ventas</span>
              <span className={styles.kpiValue}>{formatCOP(summary?.total_ventas ?? 0)}</span>
            </div>
            <div className={styles.kpi}>
              <span className={styles.kpiLabel}>Transacciones</span>
              <span className={styles.kpiValue}>{summary?.num_transacciones ?? 0}</span>
            </div>
            <div className={styles.kpi}>
              <span className={styles.kpiLabel}>Unidades vendidas</span>
              <span className={styles.kpiValue}>{summary?.unidades_vendidas ?? 0}</span>
            </div>
            <div className={styles.kpi}>
              <span className={styles.kpiLabel}>Efectivo</span>
              <span className={styles.kpiValue}>{summary?.porcentaje_efectivo ?? 0}%</span>
            </div>
            <div className={styles.kpi}>
              <span className={styles.kpiLabel}>Nequi</span>
              <span className={styles.kpiValue}>{summary?.porcentaje_nequi ?? 0}%</span>
            </div>
          </div>

          {/* Hourly chart */}
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Ventas por hora</h2>
            <div className={styles.barChart}>
              {(ventasPorHora ?? []).map((v) => (
                <div key={v.hora} className={styles.barCol}>
                  <span className={styles.barValue}>
                    {v.total > 0 ? formatCOP(v.total) : ''}
                  </span>
                  <div
                    className={styles.bar}
                    style={{ height: `${v.total > 0 ? Math.round((v.total / maxHora) * 160) : 2}px` }}
                  />
                  <span className={styles.barLabel}>{v.hora}h</span>
                </div>
              ))}
            </div>
          </div>

          {/* Top productos */}
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Top productos</h2>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Producto</th>
                  <th>Unidades</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {(topProductos ?? []).map((p, i) => (
                  <tr key={p.product_id}>
                    <td className={styles.rank}>{i + 1}</td>
                    <td>{p.nombre}</td>
                    <td>{p.unidades}</td>
                    <td className={styles.amount}>{formatCOP(p.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
