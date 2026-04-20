import { createPortal } from 'react-dom'
import DownloadIcon from '@mui/icons-material/Download'
import Button from './Button'
import { downloadCredentialCard } from '@/utils/downloadCredentials'
import styles from './CredentialsModal.module.css'

const LOGO_SRC = '/icons/El%20Vuelto%20-%20El_Vuelto_favicon_NO_BG.png'

export interface CredentialsData {
  tenantNombre: string
  adminNombre: string
  adminCorreo: string
  password: string
}

interface Props {
  data: CredentialsData | null
  onClose: () => void
}

export default function CredentialsModal({ data, onClose }: Props) {
  if (!data) return null

  async function handleDownload() {
    await downloadCredentialCard(data!)
  }

  return createPortal(
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.dialog} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">

        {/* ── Header ── */}
        <div className={styles.header}>
          <img src={LOGO_SRC} alt="" className={styles.headerIcon} />
          <div className={styles.headerText}>
            <p className={styles.headerTitle}>Negocio creado exitosamente</p>
            <p className={styles.headerSub}>Credenciales del administrador inicial</p>
          </div>
        </div>

        {/* ── Body ── */}
        <div className={styles.body}>
          <div>
            <p className={styles.tenantName}>{data.tenantNombre}</p>
            <p className={styles.adminName}>{data.adminNombre}</p>
          </div>

          <hr className={styles.divider} />

          <div className={styles.fields}>
            <div className={styles.field}>
              <p className={styles.fieldLabel}>Correo de acceso</p>
              <p className={styles.fieldValue}>{data.adminCorreo}</p>
            </div>
            <div className={[styles.field, styles.highlighted].join(' ')}>
              <p className={styles.fieldLabel}>Contraseña inicial</p>
              <p className={[styles.fieldValue, styles.mono].join(' ')}>{data.password}</p>
            </div>
          </div>

          <div className={styles.warning}>
            <span>⚠</span>
            <span>
              Esta contraseña <strong>se muestra una sola vez</strong>. Descarga el documento y entrégalo al administrador de forma segura antes de cerrar esta ventana.
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
