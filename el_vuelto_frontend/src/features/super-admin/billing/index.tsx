import styles from './BillingPage.module.css'
import BillingPlaceholder from './components/BillingPlaceholder'

export default function BillingPage() {
  return (
    <div className={styles.root}>
      <div className={styles.pageHeader}>
        <h1 className={styles.heading}>Facturación</h1>
        <p className={styles.sub}>Gestión de planes y pagos por negocio.</p>
      </div>
      <BillingPlaceholder />
    </div>
  )
}
