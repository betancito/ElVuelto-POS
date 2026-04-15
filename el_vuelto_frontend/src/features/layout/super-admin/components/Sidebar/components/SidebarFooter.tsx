import LogoutIcon from '@mui/icons-material/Logout'
import { useNavigate } from 'react-router-dom'
import { useAppDispatch } from '@/app/hooks'
import { logout } from '@/features/auth/authSlice'
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
    </div>
  )
}
