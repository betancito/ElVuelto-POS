import MenuIcon from '@mui/icons-material/Menu'
import NotificationsOutlinedIcon from '@mui/icons-material/NotificationsOutlined'
import TuneIcon from '@mui/icons-material/Tune'
import { useAppSelector } from '@/app/hooks'
import { useLayout } from '../../LayoutContext'
import styles from './Header.module.css'

const MOBILE_BREAKPOINT = 768

export default function Header() {
  const user = useAppSelector((state) => state.auth.user)
  const initial = (user?.nombre ?? 'S').charAt(0).toUpperCase()
  const { toggleCollapsed, toggleMobile } = useLayout()

  function handleToggle() {
    if (window.innerWidth <= MOBILE_BREAKPOINT) {
      toggleMobile()
    } else {
      toggleCollapsed()
    }
  }

  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <button
          type="button"
          className={styles.iconBtn}
          aria-label="Alternar menú"
          onClick={handleToggle}
        >
          <MenuIcon fontSize="small" />
        </button>

        <h2 className={styles.title}>Admin Ledger</h2>
      </div>

      <div className={styles.right}>
        <button type="button" className={styles.iconBtn} aria-label="Notificaciones">
          <NotificationsOutlinedIcon fontSize="small" />
          <span className={styles.notifDot} aria-hidden="true" />
        </button>

        <button type="button" className={styles.iconBtn} aria-label="Ajustes">
          <TuneIcon fontSize="small" />
        </button>

        <div className={styles.avatar} title={user?.nombre ?? 'Super Admin'}>
          {initial}
        </div>
      </div>
    </header>
  )
}
