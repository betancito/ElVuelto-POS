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
    <div className="grid grid-cols-3 gap-6">
      {products.map((product) => (
        <div
          key={product.id}
          onClick={() => onAddProduct(product)}
          className="bg-surface-container-lowest rounded-2xl overflow-hidden group hover:scale-[1.02] transition-all duration-300 cursor-pointer"
          style={{ boxShadow: 'var(--shadow-sm)' }}
        >
          {/* Image */}
          <div className="h-40 overflow-hidden" style={{ background: 'var(--surface-container)' }}>
            {product.imagen_url ? (
              <img
                src={product.imagen_url}
                alt={product.nombre}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <BakeryDiningOutlinedIcon style={{ fontSize: '2.5rem', color: 'var(--outline)' }} />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="p-5 flex flex-col justify-between">
            <div>
              <h3
                className="font-bold text-lg leading-snug"
                style={{ color: 'var(--on-surface)', fontFamily: 'var(--font-headline)' }}
              >
                {product.nombre}
              </h3>
              <p className="font-bold mt-1" style={{ color: 'var(--primary)', fontFamily: 'var(--font-mono)' }}>
                {formatCOP(parseFloat(product.precio_venta))}
              </p>
            </div>
            <button
              className="mt-4 w-full h-12 rounded-full flex items-center justify-center transition-colors touch-manipulation"
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
              <AddOutlinedIcon style={{ fontSize: '1.25rem' }} />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
})

export default ProductGrid
