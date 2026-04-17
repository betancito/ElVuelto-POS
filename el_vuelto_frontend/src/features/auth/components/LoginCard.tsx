import Paper from '@mui/material/Paper'

interface Props {
  children: React.ReactNode
}

export default function LoginCard({ children }: Props) {
  return (
    <Paper
      elevation={0}
      sx={{
        backgroundColor: 'rgba(255, 255, 255, 0.45)',
        backdropFilter: 'blur(24px) saturate(160%)',
        WebkitBackdropFilter: 'blur(24px) saturate(160%)',
        borderRadius: { xs: 0, sm: '1.25rem' },
        p: { xs: 3, sm: 4 },
        boxShadow: { xs: 'none', sm: '0 8px 40px rgba(139,58,15,0.15), inset 0 1px 0 rgba(255,255,255,0.6)' },
        border: { xs: 'none', sm: '1px solid rgba(255,255,255,0.55)' },
        position: 'relative',
        overflow: 'hidden',
        minHeight: { xs: '100vh', sm: 'auto' },
        display: 'flex',
        flexDirection: 'column',
        justifyContent: { xs: 'center', sm: 'flex-start' },
      }}
    >
      {children}
    </Paper>
  )
}
