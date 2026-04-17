import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings'
import AlternateEmailIcon from '@mui/icons-material/AlternateEmail'
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import MuiButton from '@mui/material/Button'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { useLoginSuperAdminMutation } from './authApi'
import AdminBadge from './components/AdminBadge'
import LoginCard from './components/LoginCard'
import LoginField from './components/LoginField'
import ColorBends from '@/components/ui/ColorBends'

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
      navigate('/super-admin/home')
    } catch {}
  }

  const apiError =
    error && 'data' in error
      ? (error.data as { detail?: string })?.detail ?? 'Credenciales incorrectas'
      : null

  // Destructure ref so it works with MUI's inputRef
  const { ref: correoRef, ...correoRest } = register('correo')
  const { ref: passwordRef, ...passwordRest } = register('password')

  return (
    <>
      {/* Full-viewport animated background */}
      <div style={{ position: 'fixed', inset: 0, width: '100vw', height: '100vh', backgroundColor: '#fff8f0', zIndex: 0 }}>
        <ColorBends
          colors={['#8B3A0F']}
          rotation={90}
          autoRotate={5}
          speed={0.4}
          scale={1}
          frequency={2}
          warpStrength={1}
          parallax={1.0}
          noise={0}
          iterations={4}
          intensity={1.5}
          bandWidth={6}
          transparent
        />
      </div>

      {/* Content layer */}
      <Box
        sx={{
          position: 'fixed',
          inset: 0,
          zIndex: 1,
          display: 'flex',
          alignItems: { xs: 'stretch', sm: 'center' },
          justifyContent: 'center',
          p: { xs: 0, sm: 3 },
          overflowY: 'auto',
        }}
      >
        <Box
          component="main"
          sx={{
            width: '100%',
            maxWidth: { xs: '100%', sm: '36rem' },
          }}
        >
          <LoginCard>
            {/* Logo centered inside card */}
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
              <Box
                component="img"
                src="/logos/El%20Vuelto%20-%20El_Vuelto_banner_NO_BG.png"
                alt="El Vuelto"
                sx={{ maxWidth: '220px', width: '100%' }}
              />
            </Box>

            {/* Badge */}
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 4 }}>
              <AdminBadge Icon={AdminPanelSettingsIcon} label="Super Admin" />
            </Box>

            {/* Form */}
            <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <LoginField
                ref={correoRef}
                {...correoRest}
                label="Correo electrónico"
                type="email"
                placeholder="nombre@ejemplo.com"
                Icon={AlternateEmailIcon}
                autoComplete="email"
                error={errors.correo?.message}
              />

              <LoginField
                ref={passwordRef}
                {...passwordRest}
                label="Contraseña"
                type="password"
                placeholder="••••••••••••"
                Icon={LockOutlinedIcon}
                autoComplete="current-password"
                error={errors.password?.message}
              />

              {apiError && (
                <Typography
                  sx={{ fontSize: '0.875rem', color: '#ba1a1a', backgroundColor: 'rgba(186,26,26,0.06)', border: '1px solid rgba(186,26,26,0.15)', borderRadius: '0.5rem', px: 1.5, py: 1.25 }}
                >
                  {apiError}
                </Typography>
              )}

              <MuiButton
                type="submit"
                fullWidth
                variant="contained"
                disabled={isLoading}
                endIcon={!isLoading ? <ArrowForwardIcon /> : undefined}
                sx={{
                  background: 'linear-gradient(135deg, #6a2600 0%, #8b3a0f 100%)',
                  py: 1.875,
                  borderRadius: '0.5rem',
                  fontFamily: 'var(--font-serif)',
                  fontStyle: 'italic',
                  fontSize: '1.125rem',
                  fontWeight: 700,
                  textTransform: 'none',
                  letterSpacing: 0,
                  boxShadow: '0 20px 40px -8px rgba(106,38,0,0.25)',
                  mt: 0.5,
                  '&:hover': {
                    background: 'linear-gradient(135deg, #6a2600 0%, #8b3a0f 100%)',
                    opacity: 0.9,
                    boxShadow: '0 20px 40px -8px rgba(106,38,0,0.25)',
                  },
                  '&:active': { transform: 'scale(0.98)' },
                  '&.Mui-disabled': { background: 'linear-gradient(135deg, #6a2600 0%, #8b3a0f 100%)', opacity: 0.6, color: '#fff' },
                  '& .MuiButton-endIcon': { transition: 'transform 0.2s', ml: 1.5 },
                  '&:hover .MuiButton-endIcon': { transform: 'translateX(4px)' },
                }}
              >
                {isLoading
                  ? <span className="inline-block w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : 'Ingresar'
                }
              </MuiButton>
            </Box>
          </LoginCard>
        </Box>
      </Box>
    </>
  )
}

