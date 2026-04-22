import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import VisibilityIcon from '@mui/icons-material/Visibility'
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff'
import { useLoginSuperAdminMutation } from './authApi'
import { APP_VERSION } from '@/constants/version'
import styles from './TenantLoginPage.module.css'

export default function TenantLoginPage() {
  const navigate = useNavigate()
  const [login, { isLoading }] = useLoginSuperAdminMutation()

  const [correo, setCorreo] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setApiError(null)
    try {
      const result = await login({ correo, password }).unwrap()
      if (result.user.rol === 'ADMIN') {
        navigate('/dashboard')
      } else if (result.user.rol === 'CAJERO') {
        navigate('/pos')
      } else {
        setApiError('Acceso no autorizado para este portal')
      }
    } catch (err: unknown) {
      const e = err as { data?: { detail?: string } }
      setApiError(e?.data?.detail ?? 'Credenciales incorrectas')
    }
  }

  return (
    <div className={styles.page}>
      {/* Decorative blobs */}
      <div className={styles.blob1} />
      <div className={styles.blob2} />

      {/* Decorative side cards (large screens) */}
      <div className={styles.sideCardLeft}>
        <div className={styles.sideCardAvatar} />
        <div className={styles.sideCardLine} style={{ width: '75%' }} />
        <div className={styles.sideCardLine} style={{ width: '50%' }} />
      </div>
      <div className={styles.sideCardRight}>
        <div className={styles.sideCardAvatarAlt} />
        <div className={styles.sideCardLine} style={{ width: '100%' }} />
        <div className={styles.sideCardBlock} />
      </div>

      <main className={styles.container}>
        {/* Brand */}
        <div className={styles.brand}>
          <img
            src="/logos/El%20Vuelto%20-%20El_Vuelto_banner_NO_BG.png"
            alt="El Vuelto"
            className={styles.brandLogo}
          />
          <p className={styles.brandSub}>Acceso Administrativo de Sucursal</p>
        </div>

        {/* Card */}
        <div className={styles.card}>
          <form onSubmit={handleSubmit} noValidate className={styles.form}>
            {/* Email */}
            <div className={styles.fieldGroup}>
              <label htmlFor="adm-correo" className={styles.fieldLabel}>Correo electrónico</label>
              <div className={styles.fieldWrap}>
                <input
                  id="adm-correo"
                  type="email"
                  className={styles.input}
                  placeholder="nombre@elvuelto.com"
                  value={correo}
                  onChange={(e) => setCorreo(e.target.value)}
                  autoComplete="email"
                  required
                />
                <div className={styles.focusLine} />
              </div>
            </div>

            {/* Password */}
            <div className={styles.fieldGroup}>
              <label htmlFor="adm-password" className={styles.fieldLabel}>Contraseña</label>
              <div className={styles.fieldWrap}>
                <input
                  id="adm-password"
                  type={showPassword ? 'text' : 'password'}
                  className={styles.input}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className={styles.eyeBtn}
                  onClick={() => setShowPassword((v) => !v)}
                  tabIndex={-1}
                >
                  {showPassword
                    ? <VisibilityOffIcon sx={{ fontSize: '1.25rem' }} />
                    : <VisibilityIcon sx={{ fontSize: '1.25rem' }} />
                  }
                </button>
                <div className={styles.focusLine} />
              </div>
            </div>

            {apiError && <p className={styles.apiError}>{apiError}</p>}

            <button
              type="submit"
              className={styles.submitBtn}
              disabled={isLoading || !correo || !password}
            >
              {isLoading
                ? <span className={styles.spinner} />
                : 'Ingresar al Panel'
              }
            </button>
          </form>

        </div>

        <p className={styles.footer}>El Vuelto {APP_VERSION}</p>
      </main>

      {/* Bottom gradient bar */}
      <div className={styles.bottomBar} />
    </div>
  )
}
