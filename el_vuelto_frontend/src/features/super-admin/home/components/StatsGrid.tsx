import { useListTenantsQuery } from '@/features/tenants/tenantsApi'
import styles from './StatsGrid.module.css'

export default function StatsGrid() {
  const { data: tenants = [] } = useListTenantsQuery()
  const active = tenants.filter((t) => t.activo).length

  const stats = [
    { label: 'Total Negocios',    value: tenants.length,  trend: '+2 este mes' },
    { label: 'Negocios Activos',  value: active,          trend: `${tenants.length - active} inactivos` },
    { label: 'Ingresos Globales', value: '—',             trend: 'Próximamente' },
    { label: 'Estado Sistema',    value: '99.9%',         trend: 'Operando con normalidad' },
  ]

  return (
    <div className={styles.grid}>
      {stats.map((s) => (
        <div key={s.label} className={styles.card}>
          <p className={styles.label}>{s.label}</p>
          <h3 className={styles.value}>{s.value}</h3>
          <p className={styles.trend}>{s.trend}</p>
        </div>
      ))}
    </div>
  )
}
