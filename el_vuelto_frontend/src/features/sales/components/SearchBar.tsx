import { useRef } from 'react'
import SearchIcon from '@mui/icons-material/Search'

interface Props {
  value: string
  onChange: (v: string) => void
  onScanEnter: (value: string) => void
  placeholder?: string
}

export default function SearchBar({ value, onChange, onScanEnter, placeholder }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      // Pass the live DOM value — React state may be stale at this point
      onScanEnter(e.currentTarget.value)
    }
  }

  return (
    <div className="pos-search">
      <span className="pos-search__icon">
        <SearchIcon style={{ fontSize: '1.375rem' }} />
      </span>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder ?? 'Escanear código de barras o buscar producto...'}
        className="pos-search__input"
        autoComplete="off"
      />
      {value && (
        <button
          className="pos-search__clear"
          onClick={() => { onChange(''); inputRef.current?.focus() }}
        >
          ✕
        </button>
      )}
    </div>
  )
}
