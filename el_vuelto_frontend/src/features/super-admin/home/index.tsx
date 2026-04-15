import styles from './HomePage.module.css'
import StatsGrid from './components/StatsGrid'
import QuickActions from './components/QuickActions'

export default function HomePage() {
  return (
    <div className={styles.root}>
      <div className={styles.pageHeader}>
        <h1 className={styles.heading}>Panel de control</h1>
        <p className={styles.sub}>Bienvenido de nuevo, Super Admin.</p>
      </div>
      <StatsGrid />
      <QuickActions />
    </div>
  )
}
