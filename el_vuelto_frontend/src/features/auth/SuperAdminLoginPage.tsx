import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import { useLoginSuperAdminMutation } from './authApi'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import styles from './SuperAdminLoginPage.module.css'

const schema = z.object({
  correo: z.string().email('Correo inválido'),
  password: z.string().min(1, 'Contraseña requerida'),
})

type FormData = z.infer<typeof schema>

export default function SuperAdminLoginPage() {
  const navigate = useNavigate()
  const [login, { isLoading, error }] = useLoginSuperAdminMutation()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  async function onSubmit(data: FormData) {
    try {
      await login(data).unwrap()
      navigate('/super-admin/tenants')
    } catch {}
  }

  const apiError =
    error && 'data' in error
      ? (error.data as { detail?: string })?.detail ?? 'Credenciales incorrectas'
      : null

  return (
    <div className={styles.root}>
      {/* Left panel – form */}
      <div className={styles.formPanel}>
        <div className={styles.inner}>
          <p className={styles.eyebrow}>Sistema de Gestión</p>
          <h1 className={styles.title}>The Artisan's Ledger</h1>
          <p className={styles.subtitle}>Acceso exclusivo para administradores de plataforma.</p>

          <form onSubmit={handleSubmit(onSubmit)} className={styles.form} noValidate>
            <Input
              label="Correo electrónico"
              type="email"
              placeholder="admin@elvuelto.com"
              leftIcon="mail"
              error={errors.correo?.message}
              autoComplete="email"
              {...register('correo')}
            />
            <Input
              label="Contraseña"
              type="password"
              placeholder="••••••••"
              leftIcon="lock"
              error={errors.password?.message}
              autoComplete="current-password"
              {...register('password')}
            />
            {apiError && <p className={styles.apiError}>{apiError}</p>}
            <Button type="submit" fullWidth loading={isLoading} size="lg">
              Ingresar al Ledger
            </Button>
          </form>
        </div>
      </div>

      {/* Right panel – decorative */}
      <div className={styles.imagePanel}>
        <div className={styles.imagePanelContent}>
          <blockquote className={styles.quote}>
            "El pan nuestro de cada día"
          </blockquote>
        </div>
      </div>
    </div>
  )
}
