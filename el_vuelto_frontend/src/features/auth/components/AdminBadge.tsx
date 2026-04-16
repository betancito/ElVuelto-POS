import Chip from '@mui/material/Chip'
import type { SvgIconComponent } from '@mui/icons-material'

interface Props {
  Icon?: SvgIconComponent
  label: string
}

export default function AdminBadge({ Icon, label }: Props) {
  return (
    <Chip
      icon={Icon ? <Icon sx={{ fontSize: '1rem !important', color: '#795635 !important', ml: '12px !important' }} /> : undefined}
      label={label}
      size="small"
      sx={{
        backgroundColor: '#fecea5',
        color: '#795635',
        fontFamily: 'var(--font-sans)',
        fontSize: '0.6875rem',
        fontWeight: 700,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        height: 28,
        borderRadius: '9999px',
        '& .MuiChip-label': { px: 1.5 },
      }}
    />
  )
}
