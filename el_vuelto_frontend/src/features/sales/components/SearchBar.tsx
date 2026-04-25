import { useRef } from 'react'
import SearchIcon from '@mui/icons-material/Search'

interface Props {
  value: string
  onChange: (v: string) => void
  onScanEnter: () => void
  placeholder?: string
}

export default function SearchBar({ value, onChange, onScanEnter, placeholder }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      onScanEnter()
    }
  }

  return (
    <div className="relative">
      <span
        className="absolute inset-y-0 left-5 flex items-center pointer-events-none"
        style={{ color: 'var(--on-surface-variant)' }}
      >
        <SearchIcon style={{ fontSize: '1.5rem' }} />
      </span>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder ?? 'Escanear código de barras o buscar producto...'}
        className="w-full pl-16 pr-10 py-5 rounded-2xl text-lg outline-none transition-all"
        style={{
          background: 'var(--surface-container-highest)',
          color: 'var(--on-surface)',
          border: '1.5px solid var(--outline-variant)',
          boxShadow: '0 1px 4px rgba(106,38,0,0.05)',
          fontFamily: 'var(--font-sans)',
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = 'var(--primary)'
          e.currentTarget.style.boxShadow = '0 0 0 3px rgba(106,38,0,0.09), 0 1px 4px rgba(106,38,0,0.05)'
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = 'var(--outline-variant)'
          e.currentTarget.style.boxShadow = '0 1px 4px rgba(106,38,0,0.05)'
        }}
        autoComplete="off"
      />
      {value && (
        <button
          className="absolute inset-y-0 right-4 flex items-center text-sm font-bold transition-colors"
          style={{ color: 'var(--on-surface-variant)' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--primary)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--on-surface-variant)')}
          onClick={() => { onChange(''); inputRef.current?.focus() }}
        >
          ✕
        </button>
      )}
    </div>
  )
}
