import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'

interface Props {
  title: string
  subtitle: string
}

export default function BrandHeader({ title, subtitle }: Props) {
  return (
    <Box sx={{ textAlign: 'center', mb: 5 }}>
      <Typography
        component="h1"
        sx={{
          fontFamily: 'var(--font-serif)',
          fontStyle: 'italic',
          fontSize: { xs: '2rem', sm: '2.5rem' },
          fontWeight: 700,
          letterSpacing: '-0.02em',
          color: '#6a2600',
          lineHeight: 1.15,
          mb: 1,
        }}
      >
        {title}
      </Typography>
      <Typography
        sx={{
          fontFamily: 'var(--font-sans)',
          fontSize: '0.6875rem',
          fontWeight: 500,
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          color: '#55433b',
        }}
      >
        {subtitle}
      </Typography>
    </Box>
  )
}
