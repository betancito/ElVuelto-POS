import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { logout } from '@/features/auth/authSlice'
import { APP_VERSION } from '@/constants/version'
import { LayoutProvider, useLayout } from './LayoutContext'
import type { SvgIconComponent } from '@mui/icons-material'
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined'
import CategoryOutlinedIcon from '@mui/icons-material/CategoryOutlined'
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined'
import PointOfSaleOutlinedIcon from '@mui/icons-material/PointOfSaleOutlined'
import BarChartOutlinedIcon from '@mui/icons-material/BarChartOutlined'
import GroupOutlinedIcon from '@mui/icons-material/GroupOutlined'
import LogoutIcon from '@mui/icons-material/Logout'
import MenuIcon from '@mui/icons-material/Menu'
import MoreHorizIcon from '@mui/icons-material/MoreHoriz'
import NotificationsOutlinedIcon from '@mui/icons-material/NotificationsOutlined'
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined'
import styles from './AdminLayout.module.css'

// ─── Navigation items ─────────────────────────────────────────────
const NAV_ITEMS = [
  { to: '/dashboard', Icon: HomeOutlinedIcon,           label: 'Inicio'     },
  { to: '/products',  Icon: CategoryOutlinedIcon,       label: 'Productos y Categorías' },
  { to: '/inventory', Icon: Inventory2OutlinedIcon,     label: 'Inventario' },
  { to: '/ventas',    Icon: PointOfSaleOutlinedIcon,    label: 'Ventas'     },
  { to: '/reports',   Icon: BarChartOutlinedIcon,       label: 'Reportes'   },
  { to: '/users',     Icon: GroupOutlinedIcon,           label: 'Usuarios'   },
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
  const navigate = useNavigate()
  const initial = (user?.nombre ?? 'A').charAt(0).toUpperCase()
  const [profileOpen, setProfileOpen] = useState(false)
  const profileRef = useRef<HTMLDivElement>(null)

  function handleToggle() {
    if (window.innerWidth <= MOBILE_BP) toggleMobile()
    else toggleCollapsed()
  }

  useEffect(() => {
    if (!profileOpen) return
    function onDown(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false)
      }
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [profileOpen])

  return (
    <header className={styles.header}>
      <div className={styles.headerLeft}>
        <button
          type="button"
          className={`${styles.iconBtn} ${styles.hamburgerHiddenOnMobile}`}
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
        <div ref={profileRef} style={{ position: 'relative' }}>
          <button
            type="button"
            className={styles.avatar}
            onClick={() => setProfileOpen((o) => !o)}
            title={user?.nombre ?? 'Mi perfil'}
            style={{ cursor: 'pointer', border: 'none', padding: 0 }}
          >
            {initial}
          </button>
          {profileOpen && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 0.5rem)',
                right: 0,
                background: 'var(--surface)',
                border: '1px solid var(--outline-variant)',
                borderRadius: '12px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                minWidth: '200px',
                zIndex: 50,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  padding: '0.875rem 1.25rem',
                  borderBottom: '1px solid var(--outline-variant)',
                  background: 'var(--surface-container-low)',
                }}
              >
                <p style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--on-surface)' }}>
                  {user?.nombre}
                </p>
                <p style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)', marginTop: '0.125rem' }}>
                  {user?.correo ?? user?.cedula ?? ''}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setProfileOpen(false)
                  navigate('/profile')
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  width: '100%',
                  padding: '0.875rem 1.25rem',
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  color: 'var(--on-surface)',
                  textAlign: 'left',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-container)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <SettingsOutlinedIcon fontSize="small" />
                Mi perfil
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

// ─── MobileBottomNav ──────────────────────────────────────────────
type BottomItem = { to: string; Icon: SvgIconComponent; label: string; center?: boolean }

const BOTTOM_PRIMARY: BottomItem[] = [
  { to: '/inventory', Icon: Inventory2OutlinedIcon, label: 'Inventario' },
  { to: '/products',  Icon: CategoryOutlinedIcon,   label: 'Productos'  },
  { to: '/dashboard', Icon: HomeOutlinedIcon,       label: 'Inicio', center: true },
  { to: '/reports',   Icon: BarChartOutlinedIcon,   label: 'Reportes'   },
]

const BOTTOM_OVERFLOW: BottomItem[] = [
  { to: '/ventas',  Icon: PointOfSaleOutlinedIcon, label: 'Ventas'    },
  { to: '/users',   Icon: GroupOutlinedIcon,        label: 'Usuarios'  },
  { to: '/profile', Icon: SettingsOutlinedIcon,     label: 'Mi perfil' },
]

function MobileBottomNav() {
  const navigate = useNavigate()
  const location = useLocation()
  const dispatch = useAppDispatch()
  const { closeMobile } = useLayout()
  const [overflowOpen, setOverflowOpen] = useState(false)
  const overflowRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!overflowOpen) return
    function onDown(e: MouseEvent) {
      if (overflowRef.current && !overflowRef.current.contains(e.target as Node)) {
        setOverflowOpen(false)
      }
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [overflowOpen])

  function go(to: string) {
    setOverflowOpen(false)
    closeMobile()
    navigate(to)
  }

  function handleLogout() {
    setOverflowOpen(false)
    dispatch(logout())
    navigate('/login')
  }

  const overflowActive = BOTTOM_OVERFLOW.some((i) => location.pathname.startsWith(i.to))

  return (
    <nav className={styles.bottomNav} aria-label="Navegación inferior">
      {BOTTOM_PRIMARY.map((item) => {
        const isActive = location.pathname.startsWith(item.to)
        const classes = [
          item.center ? styles.bottomNavCenter : styles.bottomNavItem,
          isActive ? styles.bottomNavItemActive : '',
        ].filter(Boolean).join(' ')
        return (
          <button
            key={item.to}
            type="button"
            onClick={() => go(item.to)}
            className={classes}
            aria-label={item.label}
          >
            <item.Icon fontSize={item.center ? 'medium' : 'small'} />
          </button>
        )
      })}
      <div ref={overflowRef} className={styles.bottomNavOverflowWrap}>
        <button
          type="button"
          onClick={() => setOverflowOpen((o) => !o)}
          className={`${styles.bottomNavItem} ${overflowActive ? styles.bottomNavItemActive : ''}`}
          aria-label="Más opciones"
        >
          <MoreHorizIcon fontSize="small" />
          <span>Más</span>
        </button>
        {overflowOpen && (
          <div className={styles.bottomNavPopover}>
            {BOTTOM_OVERFLOW.map((item) => (
              <button
                key={item.to}
                type="button"
                onClick={() => go(item.to)}
                className={styles.bottomNavPopoverItem}
              >
                <item.Icon fontSize="small" />
                {item.label}
              </button>
            ))}
            <button
              type="button"
              onClick={handleLogout}
              className={`${styles.bottomNavPopoverItem} ${styles.danger}`}
            >
              <LogoutIcon fontSize="small" />
              Salir
            </button>
          </div>
        )}
      </div>
    </nav>
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
      <MobileBottomNav />
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
