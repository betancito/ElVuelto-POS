import Paper from '@mui/material/Paper'

interface Props {
  children: React.ReactNode
}

export default function LoginCard({ children }: Props) {
  return (
    <Paper
      elevation={0}
      sx={{
        backgroundColor: '#ffffff',
        borderRadius: { xs: 0, sm: '1rem' },
        p: { xs: 3, sm: 4 },
        boxShadow: { xs: 'none', sm: '0 32px 64px -12px rgba(30,27,21,0.08)' },
        border: { xs: 'none', sm: '1px solid rgba(220,193,183,0.2)' },
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
