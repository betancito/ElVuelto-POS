import LogoutIcon from '@mui/icons-material/Logout'
import { useNavigate } from 'react-router-dom'
import { useAppDispatch } from '@/app/hooks'
import { logout } from '@/features/auth/authSlice'
import { APP_VERSION } from '@/constants/version'
import { useLayout } from '../../../LayoutContext'
import styles from './SidebarFooter.module.css'

export default function SidebarFooter() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const { isCollapsed } = useLayout()

  function handleLogout() {
    dispatch(logout())
    navigate('/super-admin/login')
  }

  return (
    <div className={styles.footer}>
      <div className={styles.divider} />

      <button
        type="button"
        title={isCollapsed ? 'Salir' : undefined}
        className={[styles.footerLink, isCollapsed ? styles.collapsed : ''].filter(Boolean).join(' ')}
        onClick={handleLogout}
      >
        <LogoutIcon fontSize="small" className={styles.icon} />
        {!isCollapsed && <span>Salir</span>}
      </button>
      {!isCollapsed && (
        <span style={{ padding: '0.25rem 1rem', fontFamily: 'var(--font-mono)', fontSize: '0.625rem', color: 'var(--on-surface-variant)', opacity: 0.4, letterSpacing: '0.08em' }}>
          El Vuelto {APP_VERSION}
        </span>
      )}
    </div>
  )
}
