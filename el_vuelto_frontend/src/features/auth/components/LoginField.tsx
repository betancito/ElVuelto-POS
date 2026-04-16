import { forwardRef } from 'react'
import type { SvgIconComponent } from '@mui/icons-material'
import Box from '@mui/material/Box'
import FilledInput from '@mui/material/FilledInput'
import InputAdornment from '@mui/material/InputAdornment'
import FormHelperText from '@mui/material/FormHelperText'

interface Props {
  label: string
  Icon: SvgIconComponent
  error?: string
  id?: string
  name?: string
  type?: string
  placeholder?: string
  autoComplete?: string
  onChange?: React.ChangeEventHandler<HTMLInputElement>
  onBlur?: React.FocusEventHandler<HTMLInputElement>
}

const LoginField = forwardRef<HTMLInputElement, Props>(function LoginField(
  { label, Icon, error, id, name, type, placeholder, autoComplete, onChange, onBlur },
  ref,
) {
  const inputId = id ?? `lf-${label.toLowerCase().replace(/\s+/g, '-')}`
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
      <label
        htmlFor={inputId}
        style={{
          fontFamily: 'var(--font-sans)',
          fontSize: '0.6875rem',
          fontWeight: 700,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: '#55433b',
          marginLeft: '2px',
        }}
      >
        {label}
      </label>
      <FilledInput
        id={inputId}
        inputRef={ref}
        fullWidth
        hiddenLabel
        error={!!error}
        name={name}
        type={type}
        placeholder={placeholder}
        autoComplete={autoComplete}
        onChange={onChange as React.ChangeEventHandler<HTMLInputElement | HTMLTextAreaElement>}
        onBlur={onBlur as React.FocusEventHandler<HTMLInputElement | HTMLTextAreaElement>}
        startAdornment={
          <InputAdornment position="start">
            <Icon fontSize="small" />
          </InputAdornment>
        }
        sx={{
          backgroundColor: '#e8e2d7',
          borderRadius: '4px 4px 0 0',
          fontFamily: 'var(--font-sans)',
          fontWeight: 500,
          color: '#1e1b15',
          '&:hover': { backgroundColor: '#ddd8cf' },
          '&.Mui-focused': { backgroundColor: '#e8e2d7' },
          '&::after': { borderBottomColor: '#6a2600' },
          '&::before': { borderBottomColor: 'transparent !important' },
          '& .MuiInputAdornment-root': { color: '#55433b', transition: 'color 0.2s' },
          '&.Mui-focused .MuiInputAdornment-root': { color: '#6a2600' },
          '& .MuiFilledInput-input': {
            fontFamily: 'var(--font-sans)',
            fontWeight: 500,
            paddingTop: '1rem',
            paddingBottom: '1rem',
          },
          '& .MuiFilledInput-input::placeholder': { color: '#89726a', opacity: 1 },
        }}
      />
      {error && (
        <FormHelperText
          error
          sx={{ mx: 0, mt: 0, fontFamily: 'var(--font-sans)', fontSize: '0.75rem' }}
        >
          {error}
        </FormHelperText>
      )}
    </Box>
  )
})

export default LoginField
