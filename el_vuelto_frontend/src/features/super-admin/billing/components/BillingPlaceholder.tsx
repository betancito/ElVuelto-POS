import PaymentsIcon from '@mui/icons-material/Payments'
import styles from './BillingPlaceholder.module.css'

export default function BillingPlaceholder() {
  return (
    <div className={styles.card}>
      <PaymentsIcon className={styles.icon} />
      <p className={styles.label}>Módulo de facturación en construcción</p>
      <p className={styles.sub}>Próximamente podrás gestionar suscripciones y pagos aquí.</p>
    </div>
  )
}
