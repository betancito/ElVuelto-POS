import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { logout, updateUser } from '@/features/auth/authSlice'
import { ADMIN_PASSWORD_LENGTH, PIN_LENGTH } from '@/utils/generatePassword'
import { useUpdateMeMutation } from './usersApi'
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined'
import LockResetOutlinedIcon from '@mui/icons-material/LockResetOutlined'

// ─── Schemas ──────────────────────────────────────────────────────────────────
// `correo` is USERNAME_FIELD: the backend rejects an ADMIN that empties it
// (apps/users/views.py, UpdateMeView). Mirror that per rol — same superRefine
// pattern as UsersPage — so the form blocks instead of paying a round-trip for
// a 400 we already know is coming. Message verbatim from the serializer.
function makeInfoSchema(rol: string | undefined) {
  return z
    .object({
      nombre: z.string().min(2, 'Mínimo 2 caracteres'),
      correo: z.string().email('Correo inválido').or(z.literal('')).optional(),
    })
    .superRefine((data, ctx) => {
      if (rol === 'ADMIN' && !data.correo?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['correo'],
          message: 'El correo es obligatorio para administradores.',
        })
      }
    })
}
type InfoData = z.infer<ReturnType<typeof makeInfoSchema>>

// The password minimum is per role, not flat (backend: apps/users/password_policy.py
// — CAJERO keeps its intentional 4-digit PIN, ADMIN/SUPERADMIN need 12). Built from
// the logged-in user's rol so the form blocks with the same message the backend
// would return instead of eating its 400.
function makePasswordSchema(rol: string | undefined) {
  const isCajero = rol === 'CAJERO'
  const min = isCajero ? PIN_LENGTH : ADMIN_PASSWORD_LENGTH
  const message = isCajero
    ? `El PIN debe tener ${PIN_LENGTH} dígitos.`
    : `Mínimo ${ADMIN_PASSWORD_LENGTH} caracteres.`
  return z
    .object({
      current_password: z.string().min(1, 'Requerido'),
      new_password: z.string().min(min, message),
      confirm_password: z.string(),
    })
    .refine((d) => d.new_password === d.confirm_password, {
      message: 'Las contraseñas no coinciden',
      path: ['confirm_password'],
    })
}
type PasswordData = z.infer<ReturnType<typeof makePasswordSchema>>

// Pull a field-level message out of an RTK Query error body ({ campo: "mensaje" }).
function fieldError(err: unknown, field: string): string | null {
  if (err && typeof err === 'object' && 'data' in err) {
    const data = (err as { data?: unknown }).data
    if (data && typeof data === 'object' && field in data) {
      const msg = (data as Record<string, unknown>)[field]
      if (typeof msg === 'string') return msg
      if (Array.isArray(msg) && typeof msg[0] === 'string') return msg[0]
    }
  }
  return null
}

export default function ProfilePage() {
  const user = useAppSelector((s) => s.auth.user)
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const [updateMe] = useUpdateMeMutation()

  // ── Personal info form ──
  const infoSchema = useMemo(() => makeInfoSchema(user?.rol), [user?.rol])
  const {
    register: registerInfo,
    handleSubmit: handleInfoSubmit,
    formState: { errors: infoErrors, isSubmitting: infoSaving },
  } = useForm<InfoData>({
    resolver: zodResolver(infoSchema),
    defaultValues: { nombre: user?.nombre ?? '', correo: user?.correo ?? '' },
  })
  const [infoSuccess, setInfoSuccess] = useState(false)
  const [infoServerError, setInfoServerError] = useState<string | null>(null)

  async function onInfoSubmit(data: InfoData) {
    setInfoServerError(null)
    setInfoSuccess(false)
    try {
      const updated = await updateMe({ nombre: data.nombre, correo: data.correo ?? '' }).unwrap()
      dispatch(updateUser({ nombre: updated.nombre, correo: updated.correo }))
      setInfoSuccess(true)
    } catch (err) {
      setInfoServerError(
        fieldError(err, 'correo') ??
          fieldError(err, 'nombre') ??
          'No se pudieron guardar los cambios. Intenta de nuevo.'
      )
    }
  }

  // ── Password form ──
  const passwordSchema = useMemo(() => makePasswordSchema(user?.rol), [user?.rol])
  const {
    register: registerPw,
    handleSubmit: handlePwSubmit,
    setError: setPwError,
    reset: resetPw,
    formState: { errors: pwErrors, isSubmitting: pwSaving },
  } = useForm<PasswordData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { current_password: '', new_password: '', confirm_password: '' },
  })
  const [pwSuccess, setPwSuccess] = useState(false)

  async function onPwSubmit(data: PasswordData) {
    try {
      await updateMe({
        current_password: data.current_password,
        new_password: data.new_password,
      }).unwrap()
      resetPw()
      setPwSuccess(true)
      setTimeout(() => {
        dispatch(logout())
        navigate('/login')
      }, 2000)
    } catch (err) {
      const currentErr = fieldError(err, 'current_password')
      const newErr = fieldError(err, 'new_password')
      if (currentErr) setPwError('current_password', { message: currentErr })
      else if (newErr) setPwError('new_password', { message: newErr })
      else setPwError('current_password', { message: 'No se pudo cambiar la contraseña.' })
    }
  }

  return (
    <div className="ta-page">
      <div className="ta-page-hero">
        <div>
          <h1 className="ta-page-title">Mi perfil</h1>
          <p className="ta-page-sub">Edita tu información personal y contraseña.</p>
        </div>
      </div>

      {/* ── Información personal ── */}
      <div className="ta-card" style={{ maxWidth: '34rem' }}>
        <div className="ta-card-header">
          <h2 className="ta-card-title">Información personal</h2>
        </div>
        <form
          onSubmit={handleInfoSubmit(onInfoSubmit)}
          noValidate
          style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
        >
          <div className="ta-field">
            <label className="ta-label">Nombre</label>
            <input className="ta-input" type="text" {...registerInfo('nombre')} />
            {infoErrors.nombre && <span className="ta-field-error">{infoErrors.nombre.message}</span>}
          </div>

          <div className="ta-field">
            <label className="ta-label">Correo</label>
            <input className="ta-input" type="email" placeholder="correo@ejemplo.com" {...registerInfo('correo')} />
            {infoErrors.correo && <span className="ta-field-error">{infoErrors.correo.message}</span>}
          </div>

          {infoServerError && <span className="ta-field-error">{infoServerError}</span>}
          {infoSuccess && (
            <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--tertiary)' }}>
              ✓ Cambios guardados
            </span>
          )}

          <div>
            <button type="submit" className="ta-btn ta-btn-primary" disabled={infoSaving}>
              <SaveOutlinedIcon style={{ fontSize: '1.125rem' }} />
              {infoSaving ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      </div>

      {/* ── Cambiar contraseña ── */}
      <div className="ta-card" style={{ maxWidth: '34rem' }}>
        <div className="ta-card-header">
          <h2 className="ta-card-title">Cambiar contraseña</h2>
        </div>
        <form
          onSubmit={handlePwSubmit(onPwSubmit)}
          noValidate
          style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
        >
          <div className="ta-field">
            <label className="ta-label">Contraseña actual</label>
            <input className="ta-input" type="password" autoComplete="current-password" {...registerPw('current_password')} />
            {pwErrors.current_password && (
              <span className="ta-field-error">{pwErrors.current_password.message}</span>
            )}
          </div>

          <div className="ta-field">
            <label className="ta-label">Nueva contraseña</label>
            <input className="ta-input" type="password" autoComplete="new-password" {...registerPw('new_password')} />
            {pwErrors.new_password && (
              <span className="ta-field-error">{pwErrors.new_password.message}</span>
            )}
          </div>

          <div className="ta-field">
            <label className="ta-label">Confirmar nueva contraseña</label>
            <input className="ta-input" type="password" autoComplete="new-password" {...registerPw('confirm_password')} />
            {pwErrors.confirm_password && (
              <span className="ta-field-error">{pwErrors.confirm_password.message}</span>
            )}
          </div>

          {pwSuccess && (
            <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--tertiary)' }}>
              ✓ Contraseña actualizada. Vuelve a iniciar sesión.
            </span>
          )}

          <div>
            <button type="submit" className="ta-btn ta-btn-primary" disabled={pwSaving || pwSuccess}>
              <LockResetOutlinedIcon style={{ fontSize: '1.125rem' }} />
              {pwSuccess ? 'Cerrando sesión...' : pwSaving ? 'Guardando...' : 'Cambiar contraseña'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
