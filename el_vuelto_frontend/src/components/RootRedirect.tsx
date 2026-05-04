import { Navigate } from 'react-router-dom'
import { useAppSelector } from '@/app/hooks'
import { defaultDashboard } from '@/utils/authRoutes'

export default function RootRedirect() {
  const { isAuthenticated, user } = useAppSelector((s) => s.auth)
  if (isAuthenticated && user) {
    return <Navigate to={defaultDashboard(user.rol)} replace />
  }
  return <Navigate to="/login" replace />
}
