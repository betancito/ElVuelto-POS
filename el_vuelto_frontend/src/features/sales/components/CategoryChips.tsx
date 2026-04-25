import React from 'react'
import type { Category } from '@/features/products/productsApi'

interface Props {
  categories: Category[]
  activeNombre: string | null
  onSelect: (nombre: string | null) => void
}

const CategoryChips = React.memo(function CategoryChips({ categories, activeNombre, onSelect }: Props) {
  return (
    <div
      className="flex gap-3 overflow-x-auto pb-1"
      style={{ scrollbarWidth: 'none' }}
    >
      <button
        onClick={() => onSelect(null)}
        className="shrink-0 px-8 py-3 rounded-full font-bold whitespace-nowrap transition-all active:scale-95 touch-manipulation"
        style={
          activeNombre === null
            ? { background: 'var(--gradient-baked)', color: 'white', boxShadow: '0 2px 8px rgba(106,38,0,0.25)' }
            : { background: 'var(--secondary-container)', color: 'var(--on-secondary-container)' }
        }
      >
        Todos
      </button>
      {categories.map((cat) => (
        <button
          key={cat.id}
          onClick={() => onSelect(cat.nombre)}
          className="shrink-0 px-8 py-3 rounded-full font-medium whitespace-nowrap transition-all active:scale-95 touch-manipulation"
          style={
            activeNombre === cat.nombre
              ? { background: 'var(--gradient-baked)', color: 'white', boxShadow: '0 2px 8px rgba(106,38,0,0.25)' }
              : { background: 'var(--secondary-container)', color: 'var(--on-secondary-container)' }
          }
        >
          {cat.nombre}
        </button>
      ))}
    </div>
  )
})

export default CategoryChips
