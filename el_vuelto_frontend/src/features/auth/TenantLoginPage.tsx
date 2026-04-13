import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useListTenantsQuery } from '@/features/tenants/tenantsApi'
import { useLoginWorkerMutation } from './authApi'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Spinner from '@/components/ui/Spinner'
import styles from './TenantLoginPage.module.css'

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

  // auto-submit handled by parent watching `value`
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
export default function TenantLoginPage() {
  const navigate = useNavigate()
  const { data: tenants, isLoading: loadingTenants } = useListTenantsQuery()
  const [loginWorker, { isLoading }] = useLoginWorkerMutation()

  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null)
  const [identifier, setIdentifier] = useState('') // email or cédula
  const [password, setPassword] = useState('')     // for email mode
  const [pin, setPin] = useState('')               // for cédula mode
  const [apiError, setApiError] = useState<string | null>(null)

  const isEmailMode = identifier.includes('@')

  // auto-submit when 4 PIN digits entered in cédula mode
  useEffect(() => {
    if (!isEmailMode && pin.length === 4 && identifier.trim()) {
      handleSubmit()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin])

  async function handleSubmit() {
    if (!selectedTenantId) return
    setApiError(null)
    try {
      const payload = isEmailMode
        ? { tenant_id: selectedTenantId, correo: identifier, password }
        : { tenant_id: selectedTenantId, cedula: identifier, password: pin }
      const result = await loginWorker(payload).unwrap()
      if (result.user.rol === 'CAJERO') {
        navigate('/pos')
      } else {
        navigate('/dashboard')
      }
    } catch (err: unknown) {
      const e = err as { data?: { detail?: string } }
      setApiError(e?.data?.detail ?? 'Credenciales incorrectas')
      setPin('')
    }
  }

  if (loadingTenants) {
    return (
      <div className={styles.centered}>
        <Spinner size="lg" />
      </div>
    )
  }

  // Step 1 – branch selector
  if (!selectedTenantId) {
    return (
      <div className={styles.root}>
        <h1 className={styles.heading}>Seleccionar Sucursal</h1>
        <p className={styles.sub}>Elige tu panadería para continuar</p>
        <div className={styles.tenantGrid}>
          {(tenants ?? [])
            .filter((t) => t.activo)
            .map((t) => (
              <Card key={t.id} onClick={() => setSelectedTenantId(t.id)} className={styles.tenantCard}>
                <span className="material-symbols-outlined" style={{ fontSize: '2rem', color: 'var(--color-amber-500)' }}>
                  storefront
                </span>
                <div>
                  <p className={styles.tenantName}>{t.nombre}</p>
                  <p className={styles.tenantCity}>{t.ciudad}</p>
                </div>
              </Card>
            ))}
        </div>
      </div>
    )
  }

  const tenant = tenants?.find((t) => t.id === selectedTenantId)

  // Step 2 – worker login
  return (
    <div className={styles.root}>
      <button className={styles.backBtn} onClick={() => { setSelectedTenantId(null); setApiError(null); setPin('') }}>
        <span className="material-symbols-outlined">arrow_back</span>
        {tenant?.nombre}
      </button>

      <h1 className={styles.heading}>Ingresar</h1>
      <p className={styles.sub}>
        {isEmailMode || !identifier ? 'Correo o cédula' : 'Ingrese su PIN de 4 dígitos'}
      </p>

      <div className={styles.loginCard}>
        <Input
          label="Correo o cédula"
          value={identifier}
          onChange={(e) => { setIdentifier(e.target.value); setPin('') }}
          placeholder="ej. maria@... o 12345678"
          leftIcon={isEmailMode ? 'mail' : 'badge'}
          autoComplete="username"
        />

        {isEmailMode ? (
          <Input
            label="Contraseña"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            leftIcon="lock"
            autoComplete="current-password"
          />
        ) : (
          identifier.trim() && (
            <div>
              <p className={styles.pinLabel}>PIN</p>
              <PinInput value={pin} onChange={setPin} />
            </div>
          )
        )}

        {apiError && <p className={styles.apiError}>{apiError}</p>}

        {isEmailMode && (
          <Button
            fullWidth
            loading={isLoading}
            onClick={handleSubmit}
            disabled={!identifier || !password}
          >
            Ingresar
          </Button>
        )}
      </div>
    </div>
  )
}
