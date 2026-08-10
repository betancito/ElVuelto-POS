import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  useListUsersQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useToggleUserActiveMutation,
  useResetPasswordMutation,
} from './usersApi'
import type { User } from './usersApi'
import { toast } from 'react-toastify'
import { generateAdminPassword, generatePin } from '@/utils/generatePassword'
import { applyServerErrors, getServerErrorMessage } from '@/utils/applyServerErrors'
import { useAppSelector } from '@/app/hooks'
import Spinner from '@/components/ui/Spinner'
import UserCredentialsModal from '@/components/ui/UserCredentialsModal'
import type { UserCredentialsData } from '@/components/ui/UserCredentialsModal'
import PersonAddOutlinedIcon from '@mui/icons-material/PersonAddOutlined'
import CloseIcon from '@mui/icons-material/Close'
import LockResetOutlinedIcon from '@mui/icons-material/LockResetOutlined'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import LinkOutlinedIcon from '@mui/icons-material/LinkOutlined'
import ContentCopyOutlinedIcon from '@mui/icons-material/ContentCopyOutlined'
import CheckOutlinedIcon from '@mui/icons-material/CheckOutlined'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import PersonOutlinedIcon from '@mui/icons-material/PersonOutlined'
import AdminPanelSettingsOutlinedIcon from '@mui/icons-material/AdminPanelSettingsOutlined'
import BakeryDiningOutlinedIcon from '@mui/icons-material/BakeryDiningOutlined'

// Backend requires `cedula` for CAJERO and `correo` for ADMIN
// (apps/users/serializers.py:171-174). Mirror that rule here so the form blocks
// before sending instead of relying on a (previously swallowed) 400. Messages
// match the serializer's so client- and server-side read identically.
const roleRequiredFields = (
  data: { rol: 'ADMIN' | 'CAJERO'; correo?: string; cedula?: string },
  ctx: z.RefinementCtx,
) => {
  if (data.rol === 'CAJERO' && !data.cedula?.trim()) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['cedula'], message: 'La cédula es obligatoria para cajeros.' })
  }
  if (data.rol === 'ADMIN' && !data.correo?.trim()) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['correo'], message: 'El correo es obligatorio para administradores.' })
  }
}

const schema = z.object({
  nombre:       z.string().min(2),
  rol:          z.enum(['ADMIN', 'CAJERO']),
  correo:       z.string().email().optional().or(z.literal('')),
  cedula:       z.string().optional(),
  lead_cashier: z.boolean().optional(),
}).superRefine(roleRequiredFields)

const editSchema = z.object({
  nombre:       z.string().min(2),
  rol:          z.enum(['ADMIN', 'CAJERO']),
  correo:       z.string().email().optional().or(z.literal('')),
  cedula:       z.string().optional(),
  lead_cashier: z.boolean().optional(),
}).superRefine(roleRequiredFields)

type FormData = z.infer<typeof schema>
type EditFormData = z.infer<typeof editSchema>

export default function UsersPage() {
  const { data: users, isLoading }                   = useListUsersQuery()
  const [createUser, { isLoading: creating }]        = useCreateUserMutation()
  const [updateUser, { isLoading: updating }]        = useUpdateUserMutation()
  const [toggleActive]                               = useToggleUserActiveMutation()
  const [resetPassword]                              = useResetPasswordMutation()

  const [editUser, setEditUser] = useState<User | null>(null)

  const tenantNombre   = useAppSelector((s) => s.auth.user?.tenantNombre)
  const tenantSlug     = useAppSelector((s) => s.auth.user?.tenantSlug)
  const tenantId       = useAppSelector((s) => s.auth.user?.tenantId)
  const tenantLogoUrl  = useAppSelector((s) => s.auth.user?.tenantLogoUrl)
  // The slug the backend persisted, not one re-derived from the name here: the
  // local version dropped accents while the server transliterated them, so this
  // link was wrong (404 "Sucursal no encontrada") for any name with a tilde.
  const staffLoginUrl = tenantSlug
    ? `${window.location.origin}/login/${tenantSlug}`
    : null

  const [copied, setCopied]       = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [userCreds, setUserCreds] = useState<UserCredentialsData | null>(null)

  const { register, handleSubmit, watch, reset, setError, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { rol: 'CAJERO', lead_cashier: false },
  })

  const {
    register: registerEdit,
    handleSubmit: handleSubmitEdit,
    watch: watchEdit,
    reset: resetEdit,
    setError: setEditError,
    formState: { errors: editErrors },
  } = useForm<EditFormData>({ resolver: zodResolver(editSchema) })

  const rol = watch('rol')
  const editRol = watchEdit('rol')

  function handleCopyUrl() {
    if (!staffLoginUrl) return
    navigator.clipboard.writeText(staffLoginUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  async function onSubmit(data: FormData) {
    const password = data.rol === 'CAJERO' ? generatePin() : generateAdminPassword()
    const payload = {
      ...data,
      // Only the credential of the SELECTED rol travels. The other input is not
      // mounted (see the rol branch below), but react-hook-form keeps its value
      // (`shouldUnregister` is false), so it used to be sent anyway — and a 400
      // on it (e.g. "Ya existe un cajero con esta cédula") landed on a field with
      // no span to paint it: the submit failed with zero feedback.
      cedula: data.rol === 'CAJERO' ? data.cedula?.trim() || undefined : undefined,
      correo: data.rol === 'ADMIN' ? data.correo?.trim() || undefined : undefined,
      lead_cashier: data.rol === 'CAJERO' ? (data.lead_cashier ?? false) : false,
      password,
    }
    try {
      await createUser(payload).unwrap()
      reset()
      setShowModal(false)
      setUserCreds({
        tenantNombre: tenantNombre ?? '',
        tenantLogoUrl,
        userName: payload.nombre,
        rol: payload.rol,
        loginIdentifier: payload.rol === 'CAJERO' ? (payload.cedula ?? '') : (payload.correo ?? ''),
        password,
      })
    } catch (err) {
      applyServerErrors(err, setError, 'No se pudo crear el usuario. Revisa los datos e intenta de nuevo.')
    }
  }

  function handleOpenEdit(u: User) {
    setEditUser(u)
    resetEdit({
      nombre: u.nombre,
      rol: u.rol,
      correo: u.correo ?? '',
      cedula: u.cedula ?? '',
      lead_cashier: u.lead_cashier,
    })
  }

  async function onEditSubmit(data: EditFormData) {
    if (!editUser) return
    try {
      const result = await updateUser({
        id: editUser.id,
        nombre: data.nombre,
        rol: data.rol,
        // Same rule as create: only the credential of the selected rol is sent,
        // so a 400 can never land on the input that is not mounted.
        correo: data.rol === 'ADMIN' ? data.correo?.trim() || undefined : undefined,
        cedula: data.rol === 'CAJERO' ? data.cedula?.trim() || undefined : undefined,
        lead_cashier: data.rol === 'CAJERO' ? (data.lead_cashier ?? false) : false,
      }).unwrap()
      setEditUser(null)
      // A promotion that raised the password floor (e.g. CAJERO → ADMIN) makes
      // the backend rotate the credential and hand it back here — show it now,
      // same as handleReset, or the admin never learns the account has a new
      // password. Use `result` (server-confirmed state), not `data`/`editUser`.
      if (result.new_password) {
        setUserCreds({
          tenantNombre: tenantNombre ?? '',
          tenantLogoUrl,
          userName: result.nombre,
          rol: result.rol,
          loginIdentifier: result.rol === 'CAJERO' ? (result.cedula ?? '') : (result.correo ?? ''),
          password: result.new_password,
          isReset: true,
        })
      }
    } catch (err) {
      applyServerErrors(err, setEditError, 'No se pudo actualizar el usuario. Revisa los datos e intenta de nuevo.')
    }
  }

  async function handleReset(id: string) {
    let r: { new_password: string }
    try {
      r = await resetPassword(id).unwrap()
    } catch (err) {
      // Was an unhandled promise rejection: a failed reset left the admin
      // waiting for a modal that never opened.
      toast.error(
        getServerErrorMessage(err, 'No se pudo restablecer la contraseña. Intenta de nuevo.'),
      )
      return
    }
    const u = (users ?? []).find((u) => u.id === id)
    if (u) {
      setUserCreds({
        tenantNombre: tenantNombre ?? '',
        tenantLogoUrl,
        userName: u.nombre,
        rol: u.rol,
        loginIdentifier: u.correo ?? u.cedula ?? '',
        password: r.new_password,
        isReset: true,
      })
    }
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
                      <button
                        className="ta-btn-icon"
                        onClick={() => handleOpenEdit(u)}
                        title="Editar usuario"
                      >
                        <EditOutlinedIcon style={{ fontSize: '1.125rem' }} />
                      </button>
                      <button
                        className="ta-btn-icon"
                        onClick={() => handleReset(u.id)}
                        title="Restablecer contraseña"
                      >
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
              <div>
                <h3 className="ta-modal-title">Nuevo usuario</h3>
              </div>
              <button className="ta-btn-icon" onClick={() => setShowModal(false)}>
                <CloseIcon style={{ fontSize: '1.25rem' }} />
              </button>
            </div>

            <form
              onSubmit={handleSubmit(onSubmit)}
              noValidate
              style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}
            >
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

                {/* Lead cashier checkbox — only for CAJERO */}
                {rol === 'CAJERO' && (
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', padding: '0.875rem 1rem', borderRadius: '0.75rem', background: 'var(--surface-container-low)', border: '1.5px solid var(--outline-variant)' }}>
                    <input
                      type="checkbox"
                      {...register('lead_cashier')}
                      style={{ width: '1.125rem', height: '1.125rem', accentColor: 'var(--primary)', cursor: 'pointer' }}
                    />
                    <div>
                      <p style={{ fontWeight: 700, fontSize: '0.9375rem' }}>Cajero líder</p>
                      <p style={{ fontSize: '0.8125rem', color: 'var(--on-surface-variant)', marginTop: '0.125rem' }}>
                        Puede registrar entradas de inventario desde el POS.
                      </p>
                    </div>
                  </label>
                )}

                {/* Info note */}
                <div className="ta-info-note">
                  <InfoOutlinedIcon style={{ color: 'var(--primary-container)', fontSize: '1.25rem', flexShrink: 0 }} />
                  <p className="ta-info-text">
                    {rol === 'CAJERO'
                      ? 'Se generará un PIN de 4 dígitos automáticamente. La tarjeta de credenciales se mostrará una sola vez al crear el usuario.'
                      : 'Se generará una contraseña segura automáticamente. La tarjeta de credenciales se mostrará una sola vez al crear el usuario.'}
                  </p>
                </div>
              </div>

              <div className="ta-modal-footer">
                <button type="button" className="ta-btn ta-btn-secondary" onClick={() => setShowModal(false)}>
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

      {/* ── Edit user modal ── */}
      {editUser && (
        <div className="ta-modal-backdrop" onClick={(e) => e.target === e.currentTarget && setEditUser(null)}>
          <div className="ta-modal">
            <div className="ta-modal-header">
              <div>
                <h3 className="ta-modal-title">Editar usuario</h3>
                <p className="ta-modal-sub">{editUser.nombre}</p>
              </div>
              <button className="ta-btn-icon" onClick={() => setEditUser(null)}>
                <CloseIcon style={{ fontSize: '1.25rem' }} />
              </button>
            </div>

            <form
              onSubmit={handleSubmitEdit(onEditSubmit)}
              noValidate
              style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}
            >
              <div className="ta-modal-body">
                <div className="ta-field">
                  <label className="ta-label">Nombre completo</label>
                  <input className="ta-input" placeholder="Ej: Juan Pérez" {...registerEdit('nombre')} />
                  {editErrors.nombre && <span className="ta-field-error">{editErrors.nombre.message}</span>}
                </div>

                <div className="ta-field">
                  <label className="ta-label">Rol de usuario</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.25rem' }}>
                    <label style={{ cursor: 'pointer' }}>
                      <input type="radio" value="CAJERO" style={{ display: 'none' }} {...registerEdit('rol')} />
                      <div className={`ta-role-card${editRol === 'CAJERO' ? ' ta-role-card--selected' : ''}`}>
                        <PersonOutlinedIcon style={{ color: editRol === 'CAJERO' ? 'var(--primary)' : 'var(--outline)', fontSize: '1.5rem' }} />
                        <div>
                          <p className="ta-role-card-title">Cajero</p>
                          <p className="ta-role-card-sub">Acceso a ventas y caja</p>
                        </div>
                      </div>
                    </label>
                    <label style={{ cursor: 'pointer' }}>
                      <input type="radio" value="ADMIN" style={{ display: 'none' }} {...registerEdit('rol')} />
                      <div className={`ta-role-card${editRol === 'ADMIN' ? ' ta-role-card--selected' : ''}`}>
                        <AdminPanelSettingsOutlinedIcon style={{ color: editRol === 'ADMIN' ? 'var(--primary)' : 'var(--outline)', fontSize: '1.5rem' }} />
                        <div>
                          <p className="ta-role-card-title">Admin</p>
                          <p className="ta-role-card-sub">Control total del sistema</p>
                        </div>
                      </div>
                    </label>
                  </div>
                </div>

                {editRol === 'ADMIN' ? (
                  <div className="ta-field">
                    <label className="ta-label">Correo electrónico (para login)</label>
                    <input className="ta-input" type="email" placeholder="usuario@correo.com" {...registerEdit('correo')} />
                    {editErrors.correo && <span className="ta-field-error">{editErrors.correo.message}</span>}
                  </div>
                ) : (
                  <div className="ta-field">
                    <label className="ta-label">Cédula (para login)</label>
                    <input className="ta-input ta-mono" placeholder="Número de cédula" {...registerEdit('cedula')} />
                    {editErrors.cedula && <span className="ta-field-error">{editErrors.cedula.message}</span>}
                  </div>
                )}

                {editRol === 'CAJERO' && (
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', padding: '0.875rem 1rem', borderRadius: '0.75rem', background: 'var(--surface-container-low)', border: '1.5px solid var(--outline-variant)' }}>
                    <input
                      type="checkbox"
                      {...registerEdit('lead_cashier')}
                      style={{ width: '1.125rem', height: '1.125rem', accentColor: 'var(--primary)', cursor: 'pointer' }}
                    />
                    <div>
                      <p style={{ fontWeight: 700, fontSize: '0.9375rem' }}>Cajero líder</p>
                      <p style={{ fontSize: '0.8125rem', color: 'var(--on-surface-variant)', marginTop: '0.125rem' }}>
                        Puede registrar entradas de inventario desde el POS.
                      </p>
                    </div>
                  </label>
                )}

                <div className="ta-info-note">
                  <InfoOutlinedIcon style={{ color: 'var(--primary-container)', fontSize: '1.25rem', flexShrink: 0 }} />
                  <p className="ta-info-text">
                    Para cambiar la contraseña usa el botón de restablecimiento en la tabla.
                  </p>
                </div>
              </div>

              <div className="ta-modal-footer">
                <button type="button" className="ta-btn ta-btn-secondary" onClick={() => setEditUser(null)}>
                  Cancelar
                </button>
                <button type="submit" className="ta-btn ta-btn-primary" disabled={updating}>
                  {updating ? 'Guardando...' : 'Guardar cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Credentials modal (shown once after create / reset) ── */}
      <UserCredentialsModal data={userCreds} onClose={() => setUserCreds(null)} />
    </div>
  )
}
