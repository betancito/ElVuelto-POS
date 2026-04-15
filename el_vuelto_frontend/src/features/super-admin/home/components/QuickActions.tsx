import { useNavigate } from 'react-router-dom'
import StoreIcon from '@mui/icons-material/Store'
import PersonIcon from '@mui/icons-material/Person'
import HistoryIcon from '@mui/icons-material/History'
import styles from './QuickActions.module.css'

const ACTIONS = [
  { label: 'Nuevo negocio',   icon: StoreIcon,   to: '/super-admin/tenants'  },
  { label: 'Gestionar usuarios', icon: PersonIcon, to: '/super-admin/users'  },
  { label: 'Ver historial',   icon: HistoryIcon,  to: '/super-admin/history' },
]

export default function QuickActions() {
  const navigate = useNavigate()
  return (
    <div className={styles.section}>
      <h2 className={styles.title}>Acciones rápidas</h2>
      <div className={styles.grid}>
        {ACTIONS.map((a) => (
          <button
            key={a.label}
            type="button"
            className={styles.card}
            onClick={() => navigate(a.to)}
          >
            <a.icon className={styles.icon} />
            <span>{a.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
