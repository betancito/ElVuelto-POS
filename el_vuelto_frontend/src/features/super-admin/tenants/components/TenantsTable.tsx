import ModeEditIcon from '@mui/icons-material/ModeEdit'
import type { Tenant } from '@/features/tenants/tenantsApi'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import styles from './TenantsTable.module.css'

interface Props {
  tenants: Tenant[]
  onEdit: (tenant: Tenant) => void
  onOpen: (tenant: Tenant) => void
}

export default function TenantsTable({ tenants, onEdit, onOpen }: Props) {
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
            <tr
              key={t.id}
              onClick={() => onOpen(t)}
              // Keyboard parity: a row that only responds to a mouse is
              // unreachable for anyone tabbing through the table.
              tabIndex={0}
              role="button"
              aria-label={`Ver detalle de ${t.nombre}`}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onOpen(t)
                }
              }}
              style={{ cursor: 'pointer' }}
            >
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
                <Button
                  variant="ghost"
                  size="sm"
                  // The button sits inside the clickable row, so the click would
                  // bubble up and navigate away the instant the edit modal opens.
                  onClick={(e) => {
                    e.stopPropagation()
                    onEdit(t)
                  }}
                  aria-label="Editar negocio"
                >
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
