import React from 'react'
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
    <div className="pos-product-grid">
      {products.map((product) => (
        <div
          key={product.id}
          className="pos-product-card"
          onClick={() => onAddProduct(product)}
        >
          <div className="pos-product-card__image-wrap">
            {product.imagen_url ? (
              <img src={product.imagen_url} alt={product.nombre} />
            ) : (
              <div className="pos-product-card__no-image">
                <BakeryDiningOutlinedIcon style={{ fontSize: '2.5rem' }} />
              </div>
            )}
          </div>
          <div className="pos-product-card__body">
            <p className="pos-product-card__name">{product.nombre}</p>
            <p className="pos-product-card__price">{formatCOP(parseFloat(product.precio_venta))}</p>
          </div>
        </div>
      ))}
    </div>
  )
})

export default ProductGrid
