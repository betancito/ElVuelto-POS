import React from 'react'
import AddOutlinedIcon from '@mui/icons-material/AddOutlined'
import BakeryDiningOutlinedIcon from '@mui/icons-material/BakeryDiningOutlined'
import Spinner from '@/components/ui/Spinner'
import { formatCOP } from '@/utils/formatCOP'
import type { PosProduct } from '@/features/products/productsApi'

interface Props {
  products: PosProduct[]
  isLoading: boolean
  onAddProduct: (product: PosProduct) => void
}

const ProductGrid = React.memo(function ProductGrid({ products, isLoading, onAddProduct }: Props) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full py-20">
        <Spinner size="lg" />
      </div>
    )
  }

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <BakeryDiningOutlinedIcon style={{ fontSize: '3.5rem', color: 'var(--outline)' }} />
        <p className="text-base font-medium" style={{ color: 'var(--on-surface-variant)' }}>
          No hay productos en esta categoría
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 xl:grid-cols-5 gap-4">
      {products.map((product) => (
        <div
          key={product.id}
          onClick={() => onAddProduct(product)}
          className="bg-surface-container-lowest rounded-xl overflow-hidden group hover:scale-[1.02] transition-all duration-300 cursor-pointer"
          style={{ boxShadow: '0 1px 4px rgba(106,38,0,0.07)' }}
        >
          {/* Image */}
          <div className="h-28 overflow-hidden" style={{ background: 'var(--surface-container)' }}>
            {product.imagen_url ? (
              <img
                src={product.imagen_url}
                alt={product.nombre}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <BakeryDiningOutlinedIcon style={{ fontSize: '2rem', color: 'var(--outline)' }} />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="p-3 flex flex-col gap-2.5">
            <div>
              <h3 className="font-bold text-sm leading-snug" style={{ color: 'var(--on-surface)' }}>
                {product.nombre}
              </h3>
              <p className="font-bold text-sm mt-0.5" style={{ color: 'var(--primary)', fontFamily: 'var(--font-mono)' }}>
                {formatCOP(parseFloat(product.precio_venta))}
              </p>
            </div>
            <button
              className="w-full h-9 rounded-full flex items-center justify-center transition-colors touch-manipulation"
              style={{
                background: 'var(--surface-container-high)',
                color: 'var(--primary)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--primary)'
                e.currentTarget.style.color = 'white'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--surface-container-high)'
                e.currentTarget.style.color = 'var(--primary)'
              }}
            >
              <AddOutlinedIcon style={{ fontSize: '1.125rem' }} />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
})

export default ProductGrid
