import React from 'react'
import type { Category } from '@/features/products/productsApi'

interface Props {
  categories: Category[]
  activeNombre: string | null
  onSelect: (nombre: string | null) => void
}

const CategoryChips = React.memo(function CategoryChips({ categories, activeNombre, onSelect }: Props) {
  return (
    <div className="pos-chips">
      <button
        className={`pos-chip ${activeNombre === null ? 'pos-chip--active' : 'pos-chip--inactive'}`}
        onClick={() => onSelect(null)}
      >
        Todos
      </button>
      {categories.map((cat) => (
        <button
          key={cat.id}
          className={`pos-chip ${activeNombre === cat.nombre ? 'pos-chip--active' : 'pos-chip--inactive'}`}
          onClick={() => onSelect(cat.nombre)}
        >
          {cat.nombre}
        </button>
      ))}
    </div>
  )
})

export default CategoryChips
