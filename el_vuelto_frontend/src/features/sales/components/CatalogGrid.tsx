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
    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-4">
      {/* "Todos los productos" card */}
      <button
        onClick={onShowAll}
        className="group relative overflow-hidden rounded-xl bg-surface-container-lowest transition-all hover:-translate-y-1 touch-manipulation text-left"
        style={{ boxShadow: '0 2px 8px rgba(106,38,0,0.10)' }}
      >
        <div className="aspect-[4/3] w-full relative overflow-hidden">
          <div
            className="w-full h-full"
            style={{ background: 'linear-gradient(135deg,#1e1b15 0%,#3d2f25 100%)' }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-80 group-hover:opacity-95 transition-opacity" />
          <div className="absolute inset-0 flex items-end p-3">
            <h3
              className="text-sm text-white leading-snug"
              style={{ fontFamily: 'var(--font-headline)', fontWeight: 700 }}
            >
              Todos los productos
            </h3>
          </div>
        </div>
      </button>

      {categories.map((cat, idx) => {
        const count = productCountByCategory[cat.nombre] ?? 0
        const placeholder = GRADIENT_PLACEHOLDERS[idx % GRADIENT_PLACEHOLDERS.length]

        return (
          <button
            key={cat.id}
            onClick={() => onCategorySelect(cat)}
            className="group relative overflow-hidden rounded-xl bg-surface-container-lowest transition-all hover:-translate-y-1 touch-manipulation text-left"
            style={{ boxShadow: '0 2px 8px rgba(106,38,0,0.10)' }}
          >
            <div className="aspect-[4/3] w-full relative overflow-hidden">
              {cat.imagen_url ? (
                <img
                  src={cat.imagen_url}
                  alt={cat.nombre}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              ) : (
                <div className="w-full h-full" style={{ background: placeholder }} />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-primary/80 via-transparent to-transparent opacity-60 group-hover:opacity-85 transition-opacity" />
              <div className="absolute inset-0 flex flex-col items-start justify-end p-3 gap-0.5">
                <h3
                  className="text-sm text-white leading-snug"
                  style={{ fontFamily: 'var(--font-headline)', fontWeight: 700 }}
                >
                  {cat.nombre}
                </h3>
                {count > 0 && (
                  <span className="text-white/70 text-xs font-medium">
                    {count} {count === 1 ? 'producto' : 'productos'}
                  </span>
                )}
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
})

export default CatalogGrid
