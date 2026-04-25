import { createPortal } from 'react-dom'
import DownloadIcon from '@mui/icons-material/Download'
import Button from './Button'
import { downloadUserCredentialCard } from '@/utils/downloadCredentials'
import styles from './CredentialsModal.module.css'

const LOGO_SRC = '/icons/El%20Vuelto%20-%20El_Vuelto_favicon_NO_BG.png'

export interface UserCredentialsData {
  tenantNombre: string
  userName: string
  rol: 'ADMIN' | 'CAJERO'
  loginIdentifier: string
  password: string
  isReset?: boolean
}

interface Props {
  data: UserCredentialsData | null
  onClose: () => void
}

export default function UserCredentialsModal({ data, onClose }: Props) {
  if (!data) return null

  const isCajero = data.rol === 'CAJERO'
  const loginLabel = isCajero ? 'Cédula de acceso' : 'Correo de acceso'
  const passwordLabel = isCajero ? 'PIN de acceso' : 'Contraseña inicial'
  const headerTitle = data.isReset ? 'Contraseña restablecida' : 'Usuario creado exitosamente'
  const headerSub = `Credenciales del ${isCajero ? 'colaborador' : 'administrador'}`

  async function handleDownload() {
    await downloadUserCredentialCard({
      tenantNombre: data!.tenantNombre,
      userName: data!.userName,
      rol: data!.rol,
      loginIdentifier: data!.loginIdentifier,
      password: data!.password,
    })
  }

  return createPortal(
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={styles.dialog}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* ── Header ── */}
        <div className={styles.header}>
          <img src={LOGO_SRC} alt="" className={styles.headerIcon} />
          <div className={styles.headerText}>
            <p className={styles.headerTitle}>{headerTitle}</p>
            <p className={styles.headerSub}>{headerSub}</p>
          </div>
        </div>

        {/* ── Body ── */}
        <div className={styles.body}>
          <div>
            <p className={styles.tenantName}>{data.tenantNombre}</p>
            <p className={styles.adminName}>{data.userName}</p>
          </div>

          <hr className={styles.divider} />

          <div className={styles.fields}>
            <div className={styles.field}>
              <p className={styles.fieldLabel}>{loginLabel}</p>
              <p className={styles.fieldValue}>{data.loginIdentifier}</p>
            </div>
            <div className={[styles.field, styles.highlighted].join(' ')}>
              <p className={styles.fieldLabel}>{passwordLabel}</p>
              <p className={[styles.fieldValue, styles.mono].join(' ')}>{data.password}</p>
            </div>
          </div>

          <div className={styles.warning}>
            <span>⚠</span>
            <span>
              {isCajero ? 'Este PIN' : 'Esta contraseña'}{' '}
              <strong>se muestra una sola vez</strong>. Descarga el documento y
              entrégalo de forma segura antes de cerrar esta ventana.
            </span>
          </div>

          <div className={styles.actions}>
            <Button variant="secondary" onClick={onClose}>Cerrar</Button>
            <Button onClick={handleDownload}>
              <DownloadIcon fontSize="small" />
              Descargar credenciales
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
