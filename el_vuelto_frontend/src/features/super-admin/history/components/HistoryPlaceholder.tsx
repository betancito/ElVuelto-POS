import HistoryIcon from '@mui/icons-material/History'
import styles from './HistoryPlaceholder.module.css'

export default function HistoryPlaceholder() {
  return (
    <div className={styles.card}>
      <HistoryIcon className={styles.icon} />
      <p className={styles.label}>Historial en construcción</p>
      <p className={styles.sub}>Próximamente verás logs de actividad y auditoría del sistema aquí.</p>
    </div>
  )
}
