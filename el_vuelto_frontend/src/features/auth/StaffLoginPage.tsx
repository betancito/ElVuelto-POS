import { useState, useRef, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import BadgeIcon from '@mui/icons-material/Badge'
import LoginIcon from '@mui/icons-material/Login'
import TipsAndUpdatesIcon from '@mui/icons-material/TipsAndUpdates'
import { useCheckTenantBySlugQuery } from '@/features/tenants/tenantsApi'
import { useLoginWorkerMutation } from './authApi'
import { APP_VERSION } from '@/constants/version'
import Spinner from '@/components/ui/Spinner'
import styles from './StaffLoginPage.module.css'

// ── PIN input (4 boxes) ──────────────────────────────────────────────────────
interface PinInputProps {
  value: string
  onChange: (v: string) => void
}

function PinInput({ value, onChange }: PinInputProps) {
  const refs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ]

  function handleChange(idx: number, char: string) {
    if (!/^\d?$/.test(char)) return
    const arr = value.padEnd(4, ' ').split('')
    arr[idx] = char || ' '
    const next = arr.join('').replace(/ /g, '').padEnd(4, ' ')
    onChange(next.trimEnd())
    if (char && idx < 3) refs[idx + 1].current?.focus()
  }

  function handleKeyDown(idx: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace') {
      if (!value[idx] && idx > 0) {
        const arr = value.padEnd(4, ' ').split('')
        arr[idx - 1] = ' '
        onChange(arr.join('').trimEnd())
        refs[idx - 1].current?.focus()
      }
    }
  }

  return (
    <div className={styles.pinRow}>
      {[0, 1, 2, 3].map((i) => (
        <input
          key={i}
          ref={refs[i]}
          className={styles.pinBox}
          type="password"
          inputMode="numeric"
          maxLength={1}
          value={value[i] ?? ''}
          onChange={(e) => handleChange(i, e.target.value.slice(-1))}
          onKeyDown={(e) => handleKeyDown(i, e)}
          autoComplete="off"
        />
      ))}
    </div>
  )
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function StaffLoginPage() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>()
  const navigate = useNavigate()

  const { data: tenantCheck, isLoading: loadingTenant } = useCheckTenantBySlugQuery(
    tenantSlug ?? '',
    { skip: !tenantSlug }
  )

  const [loginWorker, { isLoading }] = useLoginWorkerMutation()

  const [cedula, setCedula] = useState('')
  const [pin, setPin] = useState('')
  const [apiError, setApiError] = useState<string | null>(null)

  // auto-submit when 4 PIN digits entered
  useEffect(() => {
    if (pin.length === 4 && cedula.trim() && tenantCheck?.exists) {
      handleSubmit()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin])

  async function handleSubmit() {
    if (!tenantCheck?.exists) return
    setApiError(null)
    const cedulaTrimmed = cedula.trim()
    try {
      const result = await loginWorker({
        cedula: cedulaTrimmed,
        password: pin,
        ...(tenantCheck.id ? { tenant_id: tenantCheck.id } : {}),
      }).unwrap()
      if (result.user.rol === 'CAJERO') {
        navigate('/staff')
      } else {
        navigate('/dashboard')
      }
    } catch (err: unknown) {
      const e = err as { status?: number; data?: { detail?: string; message?: string } }
      const message =
        e?.data?.detail ??
        e?.data?.message ??
        (e?.status === 401 ? 'Credenciales incorrectas' : 'Error al iniciar sesión. Intenta de nuevo.')
      setApiError(message)
      setPin('')
    }
  }

  if (loadingTenant) {
    return (
      <div className={styles.centered}>
        <Spinner size="lg" />
      </div>
    )
  }

  // Tenant not found or inactive
  if (!tenantCheck || !tenantCheck.exists) {
    return (
      <div className={styles.page}>
        <div className={styles.bakeryPattern} />
        <main className={styles.container}>
          <div className={styles.card}>
            <p className={styles.notFound}>
              Sucursal "<strong>{tenantSlug}</strong>" no encontrada o inactiva.
            </p>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <div className={styles.bakeryPattern} />

      <main className={styles.container}>
        {/* Tenant brand */}
        <div className={styles.brand}>
          {tenantCheck.logo_url ? (
            <img
              src={tenantCheck.logo_url}
              alt={tenantCheck.nombre ?? ''}
              className={styles.brandLogo}
            />
          ) : (
            <span className={styles.brandItalic}>{tenantCheck.nombre}</span>
          )}
        </div>

        {/* Login card */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>Login de Colaborador</h2>
            <p className={styles.cardSub}>
              Identifícate para acceder al punto de venta.
            </p>
          </div>

          <div className={styles.form}>
            {/* Cédula */}
            <div className={styles.fieldGroup}>
              <label htmlFor="st-cedula" className={styles.fieldLabel}>
                Número de identificación
              </label>
              <div className={styles.fieldWrap}>
                <BadgeIcon className={styles.fieldIcon} />
                <input
                  id="st-cedula"
                  type="text"
                  className={styles.input}
                  placeholder="Ej: 1020304050"
                  value={cedula}
                  onChange={(e) => { setCedula(e.target.value); setPin('') }}
                  autoComplete="off"
                  inputMode="numeric"
                />
              </div>
            </div>

            {/* PIN */}
            {cedula.trim() && (
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>PIN de acceso</label>
                <PinInput value={pin} onChange={setPin} />
              </div>
            )}

            {apiError && <p className={styles.apiError}>{apiError}</p>}

            {cedula.trim() && (
              <div className={styles.submitWrap}>
                <button
                  type="button"
                  className={styles.submitBtn}
                  disabled={isLoading || pin.length < 4}
                  onClick={handleSubmit}
                >
                  {isLoading ? (
                    <span className={styles.spinner} />
                  ) : (
                    <>
                      Iniciar Sesión
                      <LoginIcon sx={{ fontSize: '1.25rem' }} />
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Consejo del día */}
          <div className={styles.tipSection}>
            <div className={styles.tipCard}>
              <div className={styles.tipIcon}>
                <TipsAndUpdatesIcon sx={{ fontSize: '2rem', color: 'var(--primary)' }} />
              </div>
              <div>
                <p className={styles.tipLabel}>Consejo del día</p>
                <p className={styles.tipQuote}>
                  "La paciencia es el ingrediente secreto de un buen pan y de una excelente venta."
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className={styles.footer}>
        <p className={styles.footerText}>© 2024 El Vuelto. Todos los derechos reservados.</p>
        <p className={styles.footerVersion}>{APP_VERSION}</p>
      </footer>
    </div>
  )
}
