import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { logout } from '@/features/auth/authSlice'
import { APP_VERSION } from '@/constants/version'
import { LayoutProvider, useLayout } from './LayoutContext'
import type { SvgIconComponent } from '@mui/icons-material'
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined'
import CategoryOutlinedIcon from '@mui/icons-material/CategoryOutlined'
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined'
import BarChartOutlinedIcon from '@mui/icons-material/BarChartOutlined'
import GroupOutlinedIcon from '@mui/icons-material/GroupOutlined'
import LogoutIcon from '@mui/icons-material/Logout'
import MenuIcon from '@mui/icons-material/Menu'
import NotificationsOutlinedIcon from '@mui/icons-material/NotificationsOutlined'
import styles from './AdminLayout.module.css'

// ─── Navigation items ─────────────────────────────────────────────
const NAV_ITEMS = [
  { to: '/dashboard', Icon: HomeOutlinedIcon,        label: 'Inicio'     },
  { to: '/products',  Icon: CategoryOutlinedIcon,    label: 'Productos y Categorías' },
  { to: '/inventory', Icon: Inventory2OutlinedIcon,  label: 'Inventario' },
  { to: '/reports',   Icon: BarChartOutlinedIcon,    label: 'Reportes'   },
  { to: '/users',     Icon: GroupOutlinedIcon,        label: 'Usuarios'   },
]

// ─── NavItem ──────────────────────────────────────────────────────
function NavItem({ to, Icon, label }: { to: string; Icon: SvgIconComponent; label: string }) {
  const { isCollapsed, closeMobile } = useLayout()
  return (
    <NavLink
      to={to}
      onClick={closeMobile}
      title={isCollapsed ? label : undefined}
      className={({ isActive }) =>
        [styles.navItem, isActive ? styles.navItemActive : '', isCollapsed ? styles.navItemCollapsed : '']
          .filter(Boolean)
          .join(' ')
      }
    >
      <Icon fontSize="small" className={styles.navIcon} />
      {!isCollapsed && <span className={styles.navLabel}>{label}</span>}
    </NavLink>
  )
}

// ─── Sidebar ──────────────────────────────────────────────────────
function Sidebar() {
  const { isCollapsed, mobileOpen, closeMobile } = useLayout()
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const user = useAppSelector((s) => s.auth.user)

  function handleLogout() {
    dispatch(logout())
    navigate('/login')
    closeMobile()
  }

  return (
    <aside
      className={styles.sidebar}
      data-collapsed={isCollapsed ? 'true' : 'false'}
      data-mobile-open={mobileOpen ? 'true' : 'false'}
    >
      {/* Brand */}
      <div className={`${styles.brand} ${isCollapsed ? styles.brandCollapsed : ''}`}>
        {isCollapsed ? (
          <img
            src="/icons/El%20Vuelto%20-%20El_Vuelto_favicon_NO_BG_v3.png"
            alt="El Vuelto"
            className={styles.favicon}
          />
        ) : (
          <>
            <img
              src="/logos/El%20Vuelto%20-%20El_Vuelto_banner_v1_NO_BG.png"
              alt="El Vuelto"
              className={styles.banner}
            />
            <span className={styles.brandTenant}>{user?.tenantNombre ?? 'Administración'}</span>
          </>
        )}
      </div>

      {/* Nav */}
      <nav className={`${styles.nav} ${isCollapsed ? styles.navCollapsed : ''}`}>
        {NAV_ITEMS.map((item) => (
          <NavItem key={item.to} to={item.to} Icon={item.Icon} label={item.label} />
        ))}
      </nav>

      {/* Footer */}
      <div className={styles.sidebarFooter}>
        <div className={styles.footerDivider} />
        <button
          type="button"
          onClick={handleLogout}
          title={isCollapsed ? 'Salir' : undefined}
          className={[styles.logoutBtn, isCollapsed ? styles.logoutBtnCollapsed : '']
            .filter(Boolean)
            .join(' ')}
        >
          <LogoutIcon fontSize="small" className={styles.logoutIcon} />
          {!isCollapsed && <span>Salir</span>}
        </button>
        {!isCollapsed && (
          <span className={styles.versionTag}>El Vuelto {APP_VERSION}</span>
        )}
      </div>
    </aside>
  )
}

// ─── Header ───────────────────────────────────────────────────────
const MOBILE_BP = 768

function Header() {
  const user = useAppSelector((s) => s.auth.user)
  const { toggleCollapsed, toggleMobile } = useLayout()
  const initial = (user?.nombre ?? 'A').charAt(0).toUpperCase()

  function handleToggle() {
    if (window.innerWidth <= MOBILE_BP) toggleMobile()
    else toggleCollapsed()
  }

  return (
    <header className={styles.header}>
      <div className={styles.headerLeft}>
        <button
          type="button"
          className={styles.iconBtn}
          aria-label="Alternar menú"
          onClick={handleToggle}
        >
          <MenuIcon fontSize="small" />
        </button>
      </div>

      <div className={styles.headerRight}>
        <button type="button" className={styles.iconBtn} aria-label="Notificaciones">
          <NotificationsOutlinedIcon fontSize="small" />
        </button>
        <div className={styles.avatar} title={user?.nombre ?? 'Admin'}>
          {initial}
        </div>
      </div>
    </header>
  )
}

// ─── Layout shell ─────────────────────────────────────────────────
function LayoutShell() {
  const { collapsed, mobileOpen, closeMobile } = useLayout()
  return (
    <div
      className={styles.root}
      data-collapsed={collapsed ? 'true' : 'false'}
      data-mobile-open={mobileOpen ? 'true' : 'false'}
    >
      {mobileOpen && (
        <div className={styles.backdrop} onClick={closeMobile} aria-hidden="true" />
      )}
      <Sidebar />
      <div className={styles.pageWrapper}>
        <Header />
        <main className={styles.main}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default function AdminLayout() {
  return (
    <LayoutProvider>
      <LayoutShell />
    </LayoutProvider>
  )
}
