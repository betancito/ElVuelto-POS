import type { SvgIconComponent } from '@mui/icons-material'
import { NavLink } from 'react-router-dom'
import { useLayout } from '../../../LayoutContext'
import styles from './NavItem.module.css'

interface NavItemProps {
  to: string
  Icon: SvgIconComponent
  label: string
}

export default function NavItem({ to, Icon, label }: NavItemProps) {
  const { isCollapsed, closeMobile } = useLayout()
  return (
    <NavLink
      to={to}
      onClick={closeMobile}
      title={isCollapsed ? label : undefined}
      className={({ isActive }) =>
        [styles.item, isActive ? styles.active : '', isCollapsed ? styles.collapsed : '']
          .filter(Boolean)
          .join(' ')
      }
    >
      <Icon fontSize="small" className={styles.icon} />
      {!isCollapsed && <span className={styles.label}>{label}</span>}
    </NavLink>
  )
}
