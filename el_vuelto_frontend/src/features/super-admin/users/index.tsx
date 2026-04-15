import styles from './SAUsersPage.module.css'
import SAUsersPlaceholder from './components/SAUsersPlaceholder'

export default function SAUsersPage() {
  return (
    <div className={styles.root}>
      <div className={styles.pageHeader}>
        <h1 className={styles.heading}>Usuarios</h1>
        <p className={styles.sub}>Gestión de administradores por negocio.</p>
      </div>
      <SAUsersPlaceholder />
    </div>
  )
}
