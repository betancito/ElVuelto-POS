import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAppDispatch } from '@/app/hooks'
import { logout } from '@/features/auth/authSlice'
import styles from './SuperAdminLayout.module.css'

const NAV_ITEMS = [
  { to: '/super-admin/tenants', icon: 'store', label: 'Negocios' },
]

export default function SuperAdminLayout() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()

  function handleLogout() {
    dispatch(logout())
    navigate('/super-admin/login')
  }

  return (
    <div className={styles.root}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <span className={styles.brandName}>The Ledger</span>
          <span className={styles.brandSub}>Super Admin</span>
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
