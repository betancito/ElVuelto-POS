import { createBrowserRouter, Navigate } from 'react-router-dom'
import ProtectedRoute from '@/utils/ProtectedRoute'

// Layouts
import AuthLayout from '@/layouts/AuthLayout'
import AdminLayout from '@/layouts/AdminLayout'
import SuperAdminLayout from '@/layouts/SuperAdminLayout'

// Auth pages
import SuperAdminLoginPage from '@/features/auth/SuperAdminLoginPage'
import TenantLoginPage from '@/features/auth/TenantLoginPage'

// Super admin pages
import TenantsPage from '@/features/tenants/TenantsPage'

// Admin/Cajero pages
import DashboardPage from '@/features/dashboard/DashboardPage'
import PosPage from '@/features/sales/PosPage'
import ProductsPage from '@/features/products/ProductsPage'
import InventoryPage from '@/features/inventory/InventoryPage'
import ReportsPage from '@/features/reports/ReportsPage'
import UsersPage from '@/features/users/UsersPage'

export const router = createBrowserRouter([
  // Super admin flow
  {
    path: '/super-admin',
    children: [
      {
        index: true,
        element: <Navigate to="/super-admin/login" replace />,
      },
      {
        path: 'login',
        element: (
          <AuthLayout>
            <SuperAdminLoginPage />
          </AuthLayout>
        ),
      },
      {
        element: (
          <ProtectedRoute allowedRoles={['SUPERADMIN']}>
            <SuperAdminLayout />
          </ProtectedRoute>
        ),
        children: [
          { path: 'tenants', element: <TenantsPage /> },
          { index: true, element: <Navigate to="tenants" replace /> },
        ],
      },
    ],
  },

  // Tenant login
  {
    path: '/login',
    element: (
      <AuthLayout>
        <TenantLoginPage />
      </AuthLayout>
    ),
  },

  // Cashier POS (no layout chrome needed)
  {
    path: '/pos',
    element: (
      <ProtectedRoute allowedRoles={['CAJERO']}>
        <PosPage />
      </ProtectedRoute>
    ),
  },

  // Admin layout
  {
    element: (
      <ProtectedRoute allowedRoles={['ADMIN']}>
        <AdminLayout />
      </ProtectedRoute>
    ),
    children: [
      { path: '/dashboard', element: <DashboardPage /> },
      { path: '/products', element: <ProductsPage /> },
      { path: '/inventory', element: <InventoryPage /> },
      { path: '/reports', element: <ReportsPage /> },
      { path: '/users', element: <UsersPage /> },
    ],
  },

  // Root redirect
  { path: '/', element: <Navigate to="/login" replace /> },
  { path: '*', element: <Navigate to="/login" replace /> },
])
