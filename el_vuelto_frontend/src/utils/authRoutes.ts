export function defaultDashboard(rol: 'SUPERADMIN' | 'ADMIN' | 'CAJERO'): string {
  if (rol === 'CAJERO') return '/pos'
  if (rol === 'SUPERADMIN') return '/super-admin/home'
  return '/dashboard'
}
