import { Navigate } from 'react-router-dom'
import { useAppSelector } from '@/app/hooks'
import { defaultDashboard } from './authRoutes'

interface Props {
  children: React.ReactNode
}

export default function GuestRoute({ children }: Props) {
  const { isAuthenticated, user } = useAppSelector((s) => s.auth)
  if (isAuthenticated && user) {
    return <Navigate to={defaultDashboard(user.rol)} replace />
  }
  return <>{children}</>
}
