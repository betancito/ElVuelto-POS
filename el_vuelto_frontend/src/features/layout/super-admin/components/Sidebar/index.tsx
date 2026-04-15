import HomeIcon from '@mui/icons-material/Home'
import StoreIcon from '@mui/icons-material/Store'
import PaymentsIcon from '@mui/icons-material/Payments'
import PersonIcon from '@mui/icons-material/Person'
import HistoryIcon from '@mui/icons-material/History'
import { useLayout } from '../../LayoutContext'
import SidebarBrand from './components/SidebarBrand'
import NavItem from './components/NavItem'
import SidebarFooter from './components/SidebarFooter'
import styles from './Sidebar.module.css'

const NAV_ITEMS = [
  { to: '/super-admin/home',     Icon: HomeIcon,     label: 'Inicio'      },
  { to: '/super-admin/tenants',  Icon: StoreIcon,    label: 'Negocios'    },
  { to: '/super-admin/billing',  Icon: PaymentsIcon, label: 'Facturación' },
  { to: '/super-admin/users',    Icon: PersonIcon,   label: 'Usuarios'    },
  { to: '/super-admin/history',  Icon: HistoryIcon,  label: 'Historial'   },
]

export default function Sidebar() {
  const { isCollapsed, mobileOpen } = useLayout()
  return (
    <aside
      className={styles.sidebar}
      data-collapsed={isCollapsed ? 'true' : 'false'}
      data-mobile-open={mobileOpen ? 'true' : 'false'}
    >
      <SidebarBrand />
      <nav className={styles.nav}>
        {NAV_ITEMS.map((item) => (
          <NavItem key={item.to} to={item.to} Icon={item.Icon} label={item.label} />
        ))}
      </nav>
      <SidebarFooter />
    </aside>
  )
}
