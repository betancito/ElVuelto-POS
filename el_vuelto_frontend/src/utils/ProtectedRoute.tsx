import { Navigate, useLocation } from 'react-router-dom'
import { useAppSelector } from '@/app/hooks'

interface Props {
  children: React.ReactNode
  allowedRoles?: ('SUPERADMIN' | 'ADMIN' | 'CAJERO')[]
}

export default function ProtectedRoute({ children, allowedRoles }: Props) {
  const { isAuthenticated, user } = useAppSelector((s) => s.auth)
  const location = useLocation()

  if (!isAuthenticated) {
    const loginPath = location.pathname.startsWith('/super-admin')
      ? '/super-admin/login'
      : '/login'
    return <Navigate to={loginPath} state={{ from: location }} replace />
  }

  if (allowedRoles && user && !allowedRoles.includes(user.rol)) {
    if (user.rol === 'CAJERO') return <Navigate to="/pos" replace />
    if (user.rol === 'SUPERADMIN') return <Navigate to="/super-admin/tenants" replace />
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}
