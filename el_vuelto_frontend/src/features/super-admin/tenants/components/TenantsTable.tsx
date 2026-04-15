import type { Tenant } from '@/features/tenants/tenantsApi'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import styles from './TenantsTable.module.css'

interface Props {
  tenants: Tenant[]
  onToggleActive: (id: string) => void
}

export default function TenantsTable({ tenants, onToggleActive }: Props) {
  if (tenants.length === 0) {
    return <p className={styles.empty}>No hay negocios registrados aún.</p>
  }

  return (
    <div className={styles.wrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Negocio</th>
            <th>NIT</th>
            <th>Ciudad</th>
            <th>Correo</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {tenants.map((t) => (
            <tr key={t.id}>
              <td className={styles.name}>{t.nombre}</td>
              <td>{t.nit}</td>
              <td>{t.ciudad}</td>
              <td>{t.correo}</td>
              <td>
                <Badge variant={t.activo ? 'success' : 'neutral'}>
                  {t.activo ? 'Activo' : 'Inactivo'}
                </Badge>
              </td>
              <td>
                <Button variant="ghost" size="sm" onClick={() => onToggleActive(t.id)}>
                  {t.activo ? 'Desactivar' : 'Activar'}
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
