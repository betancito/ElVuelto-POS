import { useLayout } from '../../../LayoutContext'
import styles from './SidebarBrand.module.css'

export default function SidebarBrand() {
  const { isCollapsed } = useLayout()
  return (
    <div className={`${styles.brand} ${isCollapsed ? styles.collapsed : ''}`}>
      {isCollapsed ? (
        <img
          src="/icons/El%20Vuelto%20-%20El_Vuelto_favicon_NO_BG_v3.png"
          alt="El Vuelto"
          className={styles.favicon}
        />
      ) : (
        <img
          src="/logos/El%20Vuelto%20-%20El_Vuelto_banner_v1_NO_BG.png"
          alt="El Vuelto"
          className={styles.banner}
        />
      )}
    </div>
  )
}
