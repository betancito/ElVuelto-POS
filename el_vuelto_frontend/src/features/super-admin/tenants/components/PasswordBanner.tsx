import KeyIcon from '@mui/icons-material/Key'
import CloseIcon from '@mui/icons-material/Close'
import styles from './PasswordBanner.module.css'

interface Props {
  password: string
  onClose: () => void
}

export default function PasswordBanner({ password, onClose }: Props) {
  return (
    <div className={styles.banner} role="alert">
      <KeyIcon fontSize="small" className={styles.keyIcon} />
      <div className={styles.body}>
        <strong>Negocio creado.</strong> Contraseña del administrador:{' '}
        <code className={styles.pw}>{password}</code>
        <span className={styles.warning}> — No se puede recuperar. Entréguala ahora.</span>
      </div>
      <button type="button" className={styles.close} onClick={onClose} aria-label="Cerrar">
        <CloseIcon fontSize="small" />
      </button>
    </div>
  )
}
