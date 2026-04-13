import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { logout } from '@/features/auth/authSlice'
import styles from './AdminLayout.module.css'

const NAV_ITEMS = [
  { to: '/dashboard', icon: 'home', label: 'Inicio' },
  { to: '/products', icon: 'storefront', label: 'Inventario' },
  { to: '/inventory', icon: 'inventory_2', label: 'Movimientos' },
  { to: '/reports', icon: 'bar_chart', label: 'Reportes' },
  { to: '/users', icon: 'group', label: 'Personal' },
]

export default function AdminLayout() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const user = useAppSelector((s) => s.auth.user)

  function handleLogout() {
    dispatch(logout())
    navigate('/login')
  }

  return (
    <div className={styles.root}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <span className={styles.brandName}>El Vuelto</span>
          <span className={styles.brandSub}>{user?.tenantNombre}</span>
        </div>
        <nav className={styles.nav}>
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                [styles.navItem, isActive ? styles.active : ''].filter(Boolean).join(' ')
              }
            >
              <span className="material-symbols-outlined">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <button className={styles.logoutBtn} onClick={handleLogout}>
          <span className="material-symbols-outlined">logout</span>
          Salir
        </button>
      </aside>
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  )
}
