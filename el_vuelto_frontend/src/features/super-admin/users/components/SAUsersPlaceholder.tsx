import PersonIcon from '@mui/icons-material/Person'
import styles from './SAUsersPlaceholder.module.css'

export default function SAUsersPlaceholder() {
  return (
    <div className={styles.card}>
      <PersonIcon className={styles.icon} />
      <p className={styles.label}>Módulo de usuarios en construcción</p>
      <p className={styles.sub}>Aquí podrás ver y gestionar los administradores de cada negocio.</p>
    </div>
  )
}
