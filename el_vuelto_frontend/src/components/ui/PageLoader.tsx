import { createPortal } from 'react-dom'
import styles from './PageLoader.module.css'

interface Props {
  show: boolean
}

const LOGO_SRC = '/icons/El%20Vuelto%20-%20El_Vuelto_favicon_NO_BG.png'

export default function PageLoader({ show }: Props) {
  if (!show) return null

  return createPortal(
    <div className={styles.overlay} role="status" aria-label="Cargando">
      <div className={styles.ringWrap}>
        <div className={styles.ring} />
        <img src={LOGO_SRC} alt="" className={styles.logo} />
      </div>
      <p className={styles.text}>Cargando...</p>
    </div>,
    document.body,
  )
}
