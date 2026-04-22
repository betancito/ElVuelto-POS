import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  useListUsersQuery,
  useCreateUserMutation,
  useToggleUserActiveMutation,
  useResetPasswordMutation,
} from './usersApi'
import { generateAdminPassword, generatePin } from '@/utils/generatePassword'
import { useAppSelector } from '@/app/hooks'
import Spinner from '@/components/ui/Spinner'
import PersonAddOutlinedIcon from '@mui/icons-material/PersonAddOutlined'
import CloseIcon from '@mui/icons-material/Close'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined'
import LockResetOutlinedIcon from '@mui/icons-material/LockResetOutlined'
import LinkOutlinedIcon from '@mui/icons-material/LinkOutlined'
import ContentCopyOutlinedIcon from '@mui/icons-material/ContentCopyOutlined'
import CheckOutlinedIcon from '@mui/icons-material/CheckOutlined'
import KeyOutlinedIcon from '@mui/icons-material/KeyOutlined'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import PersonOutlinedIcon from '@mui/icons-material/PersonOutlined'
import AdminPanelSettingsOutlinedIcon from '@mui/icons-material/AdminPanelSettingsOutlined'
import BakeryDiningOutlinedIcon from '@mui/icons-material/BakeryDiningOutlined'

function toSlug(s: string) {
  return s.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
}

const schema = z.object({
  nombre:  z.string().min(2),
  rol:     z.enum(['ADMIN', 'CAJERO']),
  correo:  z.string().email().optional().or(z.literal('')),
  cedula:  z.string().optional(),
})

type FormData = z.infer<typeof schema>

export default function UsersPage() {
  const { data: users, isLoading }                   = useListUsersQuery()
  const [createUser, { isLoading: creating }]        = useCreateUserMutation()
  const [toggleActive]                               = useToggleUserActiveMutation()
  const [resetPassword]                              = useResetPasswordMutation()

  const tenantNombre = useAppSelector((s) => s.auth.user?.tenantNombre)
  const tenantNIT    = useAppSelector((s) => s.auth.user?.tenantId)
  const staffLoginUrl = tenantNombre
    ? `${window.location.origin}/login/${toSlug(tenantNombre)}`
    : null

  const [copied, setCopied]   = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [createdPassword, setCreatedPassword]       = useState<string | null>(null)
  const [resetResult, setResetResult]               = useState<{ userId: string; pw: string } | null>(null)

  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { rol: 'CAJERO' },
  })

  const rol = watch('rol')

  function handleCopyUrl() {
    if (!staffLoginUrl) return
    navigator.clipboard.writeText(staffLoginUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  async function onSubmit(data: FormData) {
    const password = data.rol === 'CAJERO' ? generatePin() : generateAdminPassword()
    try {
      await createUser({ ...data, password }).unwrap()
      setCreatedPassword(password)
      reset()
      setShowModal(false)
    } catch {}
  }

  async function handleReset(id: string) {
    const r = await resetPassword(id).unwrap()
    setResetResult({ userId: id, pw: r.new_password })
  }

  return (
    <div className="ta-page">
      {/* ── Hero ── */}
      <div className="ta-page-hero">
        <div>
          <h1 className="ta-page-title">Gestión de usuarios</h1>
          <p className="ta-page-sub">Control de accesos y roles del equipo de trabajo.</p>
        </div>
        <button className="ta-btn ta-btn-primary" onClick={() => setShowModal(true)}>
          <PersonAddOutlinedIcon style={{ fontSize: '1.125rem' }} />
          Nuevo usuario
        </button>
      </div>

      {/* ── Tenant banner ── */}
      {tenantNombre && (
        <div className="ta-card-low" style={{ position: 'relative', overflow: 'hidden' }}>
          <div style={{
            position: 'absolute', top: 0, right: 0, width: '8rem', height: '100%',
            display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.05,
          }}>
            <BakeryDiningOutlinedIcon style={{ fontSize: '6rem' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 1 }}>
            <div>
              <h2 className="ta-serif" style={{ fontSize: '1.75rem', color: 'var(--primary)', fontWeight: 700 }}>
                {tenantNombre}
              </h2>
              <p className="ta-mono ta-mono--muted" style={{ fontSize: '0.8125rem', marginTop: '0.25rem' }}>
                {tenantNIT ? `ID: ${tenantNIT}` : 'Administración del negocio'}
              </p>
            </div>
            <div style={{
              background: 'var(--surface-container-highest)',
              borderRadius: 'var(--radius-lg)',
              padding: '1rem 1.25rem',
              textAlign: 'right',
              borderLeft: '3px solid var(--primary)',
            }}>
              <p style={{ fontSize: '0.625rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--on-surface-variant)', fontWeight: 700 }}>
                Módulo activo
              </p>
              <p style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--primary-container)' }}>Usuarios</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Staff URL card ── */}
      {staffLoginUrl && (
        <div className="ta-url-card">
          <LinkOutlinedIcon style={{ color: 'var(--primary-container)', fontSize: '1.25rem', flexShrink: 0 }} />
          <div className="ta-url-card-body">
            <p className="ta-url-card-title">URL de acceso del personal</p>
            <code className="ta-url-code">{staffLoginUrl}</code>
          </div>
          <button className="ta-btn ta-btn-secondary" onClick={handleCopyUrl}>
            {copied
              ? <><CheckOutlinedIcon style={{ fontSize: '1rem' }} /> Copiado</>
              : <><ContentCopyOutlinedIcon style={{ fontSize: '1rem' }} /> Copiar</>}
          </button>
        </div>
      )}

      {/* ── Password banners ── */}
      {createdPassword && (
        <div className="ta-banner">
          <KeyOutlinedIcon style={{ fontSize: '1.25rem', flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            Usuario creado — Contraseña/PIN: <code className="ta-banner-pw">{createdPassword}</code>
            <span className="ta-banner-warn"> Entregar ahora, no se puede recuperar.</span>
          </div>
          <button className="ta-btn-icon" onClick={() => setCreatedPassword(null)} style={{ color: 'var(--on-tertiary-fixed-variant)' }}>
            <CloseIcon style={{ fontSize: '1.125rem' }} />
          </button>
        </div>
      )}

      {resetResult && (
        <div className="ta-banner">
          <LockResetOutlinedIcon style={{ fontSize: '1.25rem', flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            Nueva contraseña: <code className="ta-banner-pw">{resetResult.pw}</code>
            <span className="ta-banner-warn"> Entregar ahora.</span>
          </div>
          <button className="ta-btn-icon" onClick={() => setResetResult(null)} style={{ color: 'var(--on-tertiary-fixed-variant)' }}>
            <CloseIcon style={{ fontSize: '1.125rem' }} />
          </button>
        </div>
      )}

      {/* ── Users table ── */}
      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}><Spinner /></div>
      ) : (
        <div className="ta-table-wrap">
          <table className="ta-table">
            <thead className="ta-thead">
              <tr>
                <th className="ta-th">Usuario</th>
                <th className="ta-th">Rol</th>
                <th className="ta-th">Estado</th>
                <th className="ta-th">Correo / Cédula</th>
                <th className="ta-th" style={{ textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {(users ?? []).map((u) => (
                <tr key={u.id} className="ta-tr">
                  <td className="ta-td">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                      <div style={{
                        width: '2.5rem', height: '2.5rem', borderRadius: '50%',
                        background: u.rol === 'ADMIN' ? 'var(--tertiary-fixed)' : 'var(--secondary-container)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 700, fontSize: '0.875rem',
                        color: u.rol === 'ADMIN' ? 'var(--on-tertiary-fixed-variant)' : 'var(--on-secondary-container)',
                        border: '2px solid',
                        borderColor: u.rol === 'ADMIN' ? 'rgba(14,81,56,0.2)' : 'rgba(121,86,53,0.2)',
                      }}>
                        {u.nombre[0]?.toUpperCase()}
                      </div>
                      <div>
                        <p style={{ fontWeight: 700 }}>{u.nombre}</p>
                        <p style={{ fontSize: '0.8125rem', color: 'var(--on-surface-variant)' }}>
                          {u.correo ?? u.cedula ?? '—'}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="ta-td">
                    <span className={`ta-badge ta-badge--${u.rol === 'ADMIN' ? 'admin' : 'cashier'}`}>
                      {u.rol === 'ADMIN' ? 'Admin' : 'Cajero'}
                    </span>
                  </td>
                  <td className="ta-td">
                    <div className={`ta-status ta-status--${u.activo ? 'active' : 'inactive'}`}>
                      <span className="ta-status-dot" />
                      {u.activo ? 'Activo' : 'Inactivo'}
                    </div>
                  </td>
                  <td className="ta-td" style={{ fontSize: '0.875rem', color: 'var(--on-surface-variant)' }}>
                    {u.correo ?? u.cedula ?? '—'}
                  </td>
                  <td className="ta-td">
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.375rem' }}>
                      <button
                        className="ta-btn ta-btn-ghost"
                        style={{ fontSize: '0.75rem', padding: '0.375rem 0.75rem' }}
                        onClick={() => toggleActive(u.id)}
                      >
                        {u.activo ? 'Desactivar' : 'Activar'}
                      </button>
                      <button className="ta-btn-icon" onClick={() => handleReset(u.id)} title="Reset contraseña">
                        <LockResetOutlinedIcon style={{ fontSize: '1.125rem' }} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {(!users || users.length === 0) && (
                <tr>
                  <td colSpan={5} className="ta-empty">Sin usuarios registrados</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Create user modal ── */}
      {showModal && (
        <div className="ta-modal-backdrop" onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div className="ta-modal">
            <div className="ta-modal-header">
              <h3 className="ta-modal-title">Nuevo usuario</h3>
              <button className="ta-btn-icon" onClick={() => setShowModal(false)}>
                <CloseIcon style={{ fontSize: '1.25rem' }} />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} noValidate>
              <div className="ta-modal-body">
                {/* Name */}
                <div className="ta-field">
                  <label className="ta-label">Nombre completo</label>
                  <input className="ta-input" placeholder="Ej: Juan Pérez" {...register('nombre')} />
                  {errors.nombre && <span className="ta-field-error">{errors.nombre.message}</span>}
                </div>

                {/* Role selector */}
                <div className="ta-field">
                  <label className="ta-label">Rol de usuario</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.25rem' }}>
                    <label style={{ cursor: 'pointer' }}>
                      <input type="radio" value="CAJERO" style={{ display: 'none' }} {...register('rol')} />
                      <div className={`ta-role-card${rol === 'CAJERO' ? ' ta-role-card--selected' : ''}`}>
                        <PersonOutlinedIcon style={{ color: rol === 'CAJERO' ? 'var(--primary)' : 'var(--outline)', fontSize: '1.5rem' }} />
                        <div>
                          <p className="ta-role-card-title">Cajero</p>
                          <p className="ta-role-card-sub">Acceso a ventas y caja</p>
                        </div>
                      </div>
                    </label>
                    <label style={{ cursor: 'pointer' }}>
                      <input type="radio" value="ADMIN" style={{ display: 'none' }} {...register('rol')} />
                      <div className={`ta-role-card${rol === 'ADMIN' ? ' ta-role-card--selected' : ''}`}>
                        <AdminPanelSettingsOutlinedIcon style={{ color: rol === 'ADMIN' ? 'var(--primary)' : 'var(--outline)', fontSize: '1.5rem' }} />
                        <div>
                          <p className="ta-role-card-title">Admin</p>
                          <p className="ta-role-card-sub">Control total del sistema</p>
                        </div>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Login credential field */}
                {rol === 'ADMIN' ? (
                  <div className="ta-field">
                    <label className="ta-label">Correo electrónico (para login)</label>
                    <input className="ta-input" type="email" placeholder="usuario@correo.com" {...register('correo')} />
                    {errors.correo && <span className="ta-field-error">{errors.correo.message}</span>}
                  </div>
                ) : (
                  <div className="ta-field">
                    <label className="ta-label">Cédula (para login)</label>
                    <input className="ta-input ta-mono" placeholder="Número de cédula" {...register('cedula')} />
                    {errors.cedula && <span className="ta-field-error">{errors.cedula.message}</span>}
                  </div>
                )}

                {/* Info note */}
                <div className="ta-info-note">
                  <InfoOutlinedIcon style={{ color: 'var(--primary-container)', fontSize: '1.25rem', flexShrink: 0 }} />
                  <p className="ta-info-text">
                    {rol === 'CAJERO'
                      ? 'Se generará un PIN de 4 dígitos automáticamente. Anótalo antes de cerrar esta ventana.'
                      : 'Se generará una contraseña segura automáticamente. Compártela de forma segura con el administrador.'}
                  </p>
                </div>
              </div>

              <div className="ta-modal-footer">
                <button type="button" className="ta-btn ta-btn-ghost" onClick={() => setShowModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="ta-btn ta-btn-primary" disabled={creating}>
                  {creating ? 'Creando...' : 'Crear usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
