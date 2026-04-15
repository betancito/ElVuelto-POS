import { Outlet } from 'react-router-dom'
import { LayoutProvider, useLayout } from './LayoutContext'
import Sidebar from './components/Sidebar'
import Header from './components/Header'
import styles from './SuperAdminLayout.module.css'

function LayoutShell() {
  const { collapsed, mobileOpen, closeMobile } = useLayout()
  return (
    <div
      className={styles.root}
      data-collapsed={collapsed ? 'true' : 'false'}
      data-mobile-open={mobileOpen ? 'true' : 'false'}
    >
      {/* Mobile backdrop */}
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

export default function SuperAdminLayout() {
  return (
    <LayoutProvider>
      <LayoutShell />
    </LayoutProvider>
  )
}
