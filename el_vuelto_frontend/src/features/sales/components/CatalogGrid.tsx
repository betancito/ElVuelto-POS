import React from 'react'
import type { Category } from '@/features/products/productsApi'

interface Props {
  categories: Category[]
  productCountByCategory: Record<string, number>
  onCategorySelect: (category: Category) => void
  onShowAll: () => void
}

const GRADIENT_PLACEHOLDERS = [
  'linear-gradient(135deg,#6a2600 0%,#8b3a0f 100%)',
  'linear-gradient(135deg,#7a5736 0%,#9a7456 100%)',
  'linear-gradient(135deg,#00452d 0%,#1e5d43 100%)',
  'linear-gradient(135deg,#4a3728 0%,#6e5544 100%)',
  'linear-gradient(135deg,#8b4513 0%,#a0522d 100%)',
  'linear-gradient(135deg,#2d4a1e 0%,#4a7a32 100%)',
]

const CatalogGrid = React.memo(function CatalogGrid({
  categories,
  productCountByCategory,
  onCategorySelect,
  onShowAll,
}: Props) {
  return (
    <div className="pos-catalog-grid">
      <button className="pos-catalog-card" onClick={onShowAll}>
        <div className="pos-catalog-card__overlay" />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg,#1e1b15 0%,#3d2f25 100%)' }} />
        <div className="pos-catalog-card__footer">
          <span className="pos-catalog-card__name">Todos los productos</span>
        </div>
      </button>

      {categories.map((cat, idx) => (
        <button key={cat.id} className="pos-catalog-card" onClick={() => onCategorySelect(cat)}>
          {cat.imagen_url ? (
            <img className="pos-catalog-card__bg" src={cat.imagen_url} alt={cat.nombre} />
          ) : (
            <div style={{ position: 'absolute', inset: 0, background: GRADIENT_PLACEHOLDERS[idx % GRADIENT_PLACEHOLDERS.length] }} />
          )}
          <div className="pos-catalog-card__overlay" />
          <div className="pos-catalog-card__footer">
            <span className="pos-catalog-card__name">{cat.nombre}</span>
            {(productCountByCategory[cat.nombre] ?? 0) > 0 && (
              <span className="pos-catalog-card__count">
                {productCountByCategory[cat.nombre]} {productCountByCategory[cat.nombre] === 1 ? 'producto' : 'productos'}
              </span>
            )}
          </div>
        </button>
      ))}
    </div>
  )
})

export default CatalogGrid
