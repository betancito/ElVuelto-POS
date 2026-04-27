import { createBrowserRouter, Navigate } from 'react-router-dom'
import ProtectedRoute from '@/utils/ProtectedRoute'

// Layouts
import AdminLayout from '@/layouts/AdminLayout'
import SuperAdminLayout from '@/features/layout/super-admin'

// Auth pages
import SuperAdminLoginPage from '@/features/auth/SuperAdminLoginPage'
import ColorBendsTestPage from '@/features/test/ColorBendsTestPage'
import TenantLoginPage from '@/features/auth/TenantLoginPage'
import StaffLoginPage from '@/features/auth/StaffLoginPage'

// Super admin pages
import HomePage from '@/features/super-admin/home'
import TenantsPage from '@/features/super-admin/tenants'
import BillingPage from '@/features/super-admin/billing'
import SAUsersPage from '@/features/super-admin/users'
import HistoryPage from '@/features/super-admin/history'

// Admin/Cajero pages
import DashboardPage from '@/features/dashboard/DashboardPage'
import PosPage from '@/features/sales/PosPage'
import ProductsPage from '@/features/products/ProductsPage'
import InventoryPage from '@/features/inventory/InventoryPage'
import ReportsPage from '@/features/reports/ReportsPage'
import UsersPage from '@/features/users/UsersPage'
import SalesHistoryPage from '@/features/sales/SalesHistoryPage'

export const router = createBrowserRouter([
  // Super admin flow
  {
    path: '/super-admin',
    children: [
      {
        index: true,
        element: <Navigate to="/super-admin/home" replace />,
      },
      {
        path: 'login',
        element: <SuperAdminLoginPage />,
      },
      {
        element: (
          <ProtectedRoute allowedRoles={['SUPERADMIN']}>
            <SuperAdminLayout />
          </ProtectedRoute>
        ),
        children: [
          { path: 'home',    element: <HomePage />    },
          { path: 'tenants', element: <TenantsPage /> },
          { path: 'billing', element: <BillingPage /> },
          { path: 'users',   element: <SAUsersPage /> },
          { path: 'history', element: <HistoryPage /> },
          { index: true,     element: <Navigate to="home" replace /> },
        ],
      },
    ],
  },

  // Tenant admin login
  {
    path: '/login',
    element: <TenantLoginPage />,
  },

  // Staff login (via tenant-specific URL)
  {
    path: '/login/:tenantSlug',
    element: <StaffLoginPage />,
  },

  // Cajero routes — /staff redirects directly to POS
  { path: '/staff', element: <Navigate to="/pos" replace /> },
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
      { path: '/ventas', element: <SalesHistoryPage /> },
      { path: '/reports', element: <ReportsPage /> },
      { path: '/users', element: <UsersPage /> },
    ],
  },

  // Root redirect
  { path: '/', element: <Navigate to="/login" replace /> },
  { path: '/test/color-bends', element: <ColorBendsTestPage /> },
  { path: '*', element: <Navigate to="/login" replace /> },
])
