import ModeEditIcon from '@mui/icons-material/ModeEdit'
import type { Tenant } from '@/features/tenants/tenantsApi'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import styles from './TenantsTable.module.css'

interface Props {
  tenants: Tenant[]
  onEdit: (tenant: Tenant) => void
}

export default function TenantsTable({ tenants, onEdit }: Props) {
  if (tenants.length === 0) {
    return <p className={styles.empty}>No hay negocios registrados aún.</p>
  }

  return (
    <div className={styles.wrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th className={styles.logoCol}></th>
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
              <td className={styles.logoCell}>
                {t.logo_url ? (
                  <img src={t.logo_url} alt={`${t.nombre} logo`} className={styles.logoThumb} />
                ) : (
                  <div className={styles.logoEmpty} aria-hidden="true" />
                )}
              </td>
              <td className={styles.name}>{t.nombre}</td>
              <td>{t.nit}</td>
              <td>{t.ciudad}</td>
              <td>{t.correo}</td>
              <td>
                <Badge variant={t.activo ? 'success' : 'neutral'}>
                  {t.activo ? 'Activo' : 'Inactivo'}
                </Badge>
              </td>
              <td className={styles.actions}>
                <Button variant="ghost" size="sm" onClick={() => onEdit(t)} aria-label="Editar negocio">
                  <ModeEditIcon fontSize="small" />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
