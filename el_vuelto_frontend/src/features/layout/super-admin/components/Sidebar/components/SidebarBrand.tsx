import { useLayout } from '../../../LayoutContext'
import styles from './SidebarBrand.module.css'

export default function SidebarBrand() {
  const { isCollapsed } = useLayout()
  return (
    <div className={`${styles.brand} ${isCollapsed ? styles.collapsed : ''}`}>
      <span className={styles.mark}>TL</span>
      {!isCollapsed && (
        <div className={styles.text}>
          <h1 className={styles.name}>The Ledger</h1>
          <p className={styles.sub}>SaaS Controller</p>
        </div>
      )}
    </div>
  )
}
