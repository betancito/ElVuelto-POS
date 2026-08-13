import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import CircularProgress from '@mui/material/CircularProgress'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import AssessmentOutlinedIcon from '@mui/icons-material/AssessmentOutlined'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import GroupOutlinedIcon from '@mui/icons-material/GroupOutlined'
import LockResetOutlinedIcon from '@mui/icons-material/LockResetOutlined'
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined'

import {
  useGetTenantMetricsQuery,
  useGetTenantQuery,
  useGetTenantUsersQuery,
  useResetTenantUserPasswordMutation,
  useUploadTenantLogoMutation,
} from '@/features/tenants/tenantsApi'
import type { TenantUser } from '@/features/tenants/tenantsApi'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import PageLoader from '@/components/ui/PageLoader'
import UserCredentialsModal from '@/components/ui/UserCredentialsModal'
import type { UserCredentialsData } from '@/components/ui/UserCredentialsModal'
import { formatCOP } from '@/utils/formatCOP'
import { getServerErrorMessage } from '@/utils/applyServerErrors'
import { validateImageFile } from '@/utils/imageUpload'

type Tab = 'resumen' | 'usuarios'

/** A cashier signs in with their cédula, an admin with their correo. Same rule
 *  the backend enforces per rol, so the credential card must show the one the
 *  person will actually type. */
function loginIdentifierFor(u: TenantUser): string {
  return u.rol === 'CAJERO' ? (u.cedula ?? '') : (u.correo ?? '')
}

export default function TenantDetailPage() {
  const { id = '' } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { data: tenant, isLoading: loadingTenant } = useGetTenantQuery(id, { skip: !id })
  const { data: metrics, isLoading: loadingMetrics } = useGetTenantMetricsQuery(id, { skip: !id })
  const { data: users = [], isLoading: loadingUsers } = useGetTenantUsersQuery(id, { skip: !id })
  const [resetPassword, { isLoading: resetting }] = useResetTenantUserPasswordMutation()
  const [uploadLogo, { isLoading: uploadingLogo }] = useUploadTenantLogoMutation()

  const [activeTab, setActiveTab] = useState<Tab>('resumen')
  const [selectedUser, setSelectedUser] = useState<TenantUser | null>(null)
  const [credentials, setCredentials] = useState<UserCredentialsData | null>(null)

  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // allow reselecting the same file
    if (!file || !id) return
    const invalid = validateImageFile(file)
    if (invalid) {
      toast.error(invalid)
      return
    }
    const formData = new FormData()
    formData.append('logo', file)
    try {
      await uploadLogo({ id, formData }).unwrap()
      toast.success('Logo actualizado.')
    } catch (err) {
      // Same rule as handleReset below: never leave a bare `.unwrap()`.
      toast.error(getServerErrorMessage(err, 'No se pudo subir el logo. Intenta de nuevo.'))
    }
  }

  async function handleReset() {
    if (!selectedUser || !tenant) return
    const target = selectedUser
    let result: { new_password: string }
    try {
      result = await resetPassword({ tenantId: id, userId: target.id }).unwrap()
    } catch (err) {
      // Never leave the `.unwrap()` bare: a failed reset used to reject silently
      // and the admin waited for a modal that never opened (same bug fixed in
      // features/users/UsersPage.tsx handleReset).
      toast.error(
        getServerErrorMessage(err, 'No se pudo restablecer la contraseña. Intenta de nuevo.'),
      )
      return
    }
    setSelectedUser(null)
    setCredentials({
      tenantNombre: tenant.nombre,
      tenantLogoUrl: tenant.logo_url,
      userName: target.nombre,
      rol: target.rol,
      loginIdentifier: loginIdentifierFor(target),
      password: result.new_password,
      isReset: true,
    })
  }

  const busy = loadingTenant || loadingMetrics || loadingUsers || resetting

  if (!loadingTenant && !tenant) {
    return (
      <div className="ta-page">
        <p className="ta-empty">Este negocio no existe o fue eliminado.</p>
        <div>
          <Button variant="secondary" onClick={() => navigate('/super-admin/tenants')}>
            Volver a Negocios
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="ta-page">
      <PageLoader show={busy} />

      {/* ── Header ── */}
      <div>
        <button
          type="button"
          className="ta-btn ta-btn-ghost"
          onClick={() => navigate('/super-admin/tenants')}
          style={{ marginBottom: '1rem' }}
        >
          <ArrowBackIcon style={{ fontSize: '1rem' }} />
          Negocios
        </button>

        <div className="ta-page-hero">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div className="ta-avatar-upload" data-uploading={uploadingLogo}>
              {tenant?.logo_url ? (
                <img
                  src={tenant.logo_url}
                  alt={`Logo de ${tenant.nombre}`}
                  style={{
                    width: '4rem',
                    height: '4rem',
                    objectFit: 'cover',
                    border: '1px solid var(--outline-variant)',
                  }}
                />
              ) : (
                <div
                  aria-hidden="true"
                  style={{
                    width: '4rem',
                    height: '4rem',
                    background: 'var(--surface-container-highest)',
                    display: 'grid',
                    placeItems: 'center',
                    color: 'var(--on-surface-variant)',
                  }}
                >
                  <StorefrontOutlinedIcon />
                </div>
              )}
              {/* Covers the whole avatar, invisible but focusable/clickable — the
                  overlay below is purely decorative (aria-hidden) so the input
                  itself carries the accessible name and native keyboard activation. */}
              <input
                type="file"
                accept="image/*"
                className="ta-avatar-upload__input"
                aria-label={`Cambiar logo de ${tenant?.nombre ?? 'este negocio'}`}
                disabled={uploadingLogo}
                onChange={handleLogoChange}
              />
              <span className="ta-avatar-upload__overlay" aria-hidden="true">
                {uploadingLogo ? (
                  <CircularProgress size={18} sx={{ color: '#fff' }} />
                ) : (
                  <EditOutlinedIcon fontSize="small" />
                )}
              </span>
            </div>
            <div>
              <h1 className="ta-page-title">{tenant?.nombre ?? '—'}</h1>
              <p className="ta-page-sub">
                NIT {tenant?.nit ?? '—'} · {tenant?.ciudad ?? '—'} · {tenant?.correo ?? '—'}
              </p>
            </div>
          </div>
          <span className={`ta-status ${tenant?.activo ? 'ta-status--active' : 'ta-status--inactive'}`}>
            <span className="ta-status-dot" />
            {tenant?.activo ? 'Activo' : 'Inactivo'}
          </span>
        </div>
      </div>

      {/* ── Tab bar (same pattern as ProductsPage) ── */}
      <div style={{ display: 'flex', borderBottom: '2px solid var(--outline-variant)' }}>
        {(
          [
            { key: 'resumen' as Tab, label: 'Resumen', Icon: AssessmentOutlinedIcon },
            { key: 'usuarios' as Tab, label: 'Usuarios', Icon: GroupOutlinedIcon },
          ]
        ).map(({ key, label, Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            style={{
              padding: '0.75rem 1.5rem',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              fontSize: '0.9375rem',
              fontWeight: activeTab === key ? 700 : 500,
              color: activeTab === key ? 'var(--primary)' : 'var(--on-surface-variant)',
              borderBottom: activeTab === key ? '2px solid var(--primary)' : '2px solid transparent',
              marginBottom: '-2px',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              transition: 'color 0.15s',
            }}
          >
            <Icon fontSize="small" />
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'resumen' ? (
        <div className="ta-kpi-grid">
          <div className="ta-kpi-card ta-kpi-card--accent">
            <p className="ta-kpi-label">Ventas del mes</p>
            <p className="ta-kpi-value">{formatCOP(metrics?.ventas_mes ?? 0)}</p>
          </div>
          <div className="ta-kpi-card ta-kpi-card--accent">
            <p className="ta-kpi-label">Ventas de hoy</p>
            <p className="ta-kpi-value">{formatCOP(metrics?.ventas_hoy ?? 0)}</p>
          </div>
          <div className="ta-kpi-card">
            <p className="ta-kpi-label">Administradores</p>
            <p className="ta-kpi-value">{metrics?.num_admins ?? 0}</p>
          </div>
          <div className="ta-kpi-card">
            <p className="ta-kpi-label">Cajeros</p>
            <p className="ta-kpi-value">{metrics?.num_cajeros ?? 0}</p>
          </div>
          <div className="ta-kpi-card">
            <p className="ta-kpi-label">Fecha de alta</p>
            <p className="ta-kpi-value ta-kpi-value--serif">
              {metrics?.fecha_alta
                ? new Date(metrics.fecha_alta).toLocaleDateString('es-CO', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })
                : '—'}
            </p>
          </div>
        </div>
      ) : (
        <div className="ta-table-wrap">
          {users.length === 0 ? (
            <p className="ta-empty">Este negocio no tiene usuarios registrados.</p>
          ) : (
            <table className="ta-table">
              <thead className="ta-thead">
                <tr>
                  <th className="ta-th">Usuario</th>
                  <th className="ta-th">Rol</th>
                  <th className="ta-th">Identificador</th>
                  <th className="ta-th">Estado</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr
                    key={u.id}
                    className="ta-tr"
                    onClick={() => setSelectedUser(u)}
                    tabIndex={0}
                    role="button"
                    aria-label={`Acciones para ${u.nombre}`}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        setSelectedUser(u)
                      }
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    <td className="ta-td">{u.nombre}</td>
                    <td className="ta-td">
                      <span className={`ta-badge ${u.rol === 'ADMIN' ? 'ta-badge--admin' : 'ta-badge--cashier'}`}>
                        {u.rol === 'ADMIN' ? 'Administrador' : 'Cajero'}
                      </span>
                    </td>
                    <td className="ta-td ta-mono ta-mono--muted">{loginIdentifierFor(u) || '—'}</td>
                    <td className="ta-td">
                      <span className={`ta-status ${u.activo ? 'ta-status--active' : 'ta-status--inactive'}`}>
                        <span className="ta-status-dot" />
                        {u.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── Per-user actions ── */}
      <Modal
        isOpen={!!selectedUser}
        onClose={() => setSelectedUser(null)}
        title={selectedUser?.nombre ?? ''}
        size="sm"
      >
        <p className="ta-info-text" style={{ marginBottom: '1.5rem' }}>
          {selectedUser?.rol === 'ADMIN' ? 'Administrador' : 'Cajero'} de {tenant?.nombre}
          {' · '}
          <span className="ta-mono">{selectedUser ? loginIdentifierFor(selectedUser) : ''}</span>
        </p>
        <div className="ta-info-note" style={{ marginBottom: '1.5rem' }}>
          <p className="ta-info-text">
            Al restablecer la contraseña, la anterior deja de funcionar de inmediato y se cierra
            cualquier sesión abierta de esta persona.
          </p>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
          <Button variant="secondary" onClick={() => setSelectedUser(null)}>
            Cancelar
          </Button>
          <Button onClick={handleReset} loading={resetting}>
            <LockResetOutlinedIcon fontSize="small" />
            Restablecer contraseña
          </Button>
        </div>
      </Modal>

      {/* Reused as-is from the tenant-admin flow — it is generic. */}
      <UserCredentialsModal data={credentials} onClose={() => setCredentials(null)} />
    </div>
  )
}
