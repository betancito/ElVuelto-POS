import styles from './HistoryPage.module.css'
import HistoryPlaceholder from './components/HistoryPlaceholder'

export default function HistoryPage() {
  return (
    <div className={styles.root}>
      <div className={styles.pageHeader}>
        <h1 className={styles.heading}>Historial</h1>
        <p className={styles.sub}>Registro de actividad global del sistema.</p>
      </div>
      <HistoryPlaceholder />
    </div>
  )
}
