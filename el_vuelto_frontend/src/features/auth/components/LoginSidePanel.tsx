import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'

interface Props {
  quote: string
  brandLabel?: string
  imageSrc?: string
  imageAlt?: string
}

export default function LoginSidePanel({
  quote,
  brandLabel = 'El Vuelto Ledger',
  imageSrc,
  imageAlt = 'Artisan bakery',
}: Props) {
  return (
    <Box
      component="aside"
      sx={{
        display: { xs: 'none', lg: 'flex' },
        position: 'fixed',
        right: 0,
        top: 0,
        height: '100%',
        width: '35%',
        backgroundColor: '#faf3e8',
        p: 6,
        flexDirection: 'column',
        justifyContent: 'center',
        borderLeft: '1px solid rgba(232,226,215,0.1)',
      }}
    >
      <Box sx={{ maxWidth: '24rem', mx: 'auto' }}>
        {imageSrc && (
          <Box
            sx={{
              mb: 4,
              borderRadius: '0.75rem',
              overflow: 'hidden',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
            }}
          >
            <img src={imageSrc} alt={imageAlt} style={{ width: '100%', objectFit: 'cover', display: 'block' }} />
          </Box>
        )}
        <Typography
          component="blockquote"
          sx={{
            fontFamily: 'var(--font-serif)',
            fontStyle: 'italic',
            fontSize: '1.5rem',
            color: '#55433b',
            lineHeight: 1.45,
            m: 0,
            mb: 3,
          }}
        >
          {quote}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{ flex: 1, height: '1px', backgroundColor: '#dcc1b7' }} />
          <Typography
            sx={{
              fontFamily: 'var(--font-sans)',
              fontSize: '0.6875rem',
              fontWeight: 700,
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              color: '#6a2600',
              whiteSpace: 'nowrap',
            }}
          >
            {brandLabel}
          </Typography>
        </Box>
      </Box>
    </Box>
  )
}
