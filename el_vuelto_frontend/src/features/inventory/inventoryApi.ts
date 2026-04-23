import { apiBase } from '@/app/apiBase'

export interface InventoryMovement {
  id: string
  product: string
  product_nombre: string
  user: string
  user_nombre: string
  tipo_movimiento: 'ENTRADA' | 'SALIDA_VENTA' | 'AJUSTE'
  cantidad: number
  precio_costo: string
  nota: string | null
  created_at: string
}

export interface StockItem {
  id: string
  nombre: string
  barcode: string | null
  stock_actual: number
  stock_minimo: number
  bajo_minimo: boolean
  precio_costo: string | null
  proveedor: string | null
  imagen_url: string | null
}

export const inventoryApi = apiBase.injectEndpoints({
  endpoints: (builder) => ({
    listMovements: builder.query<InventoryMovement[], void>({
      query: () => '/inventory/movements/',
      transformResponse: (response: InventoryMovement[] | { results: InventoryMovement[] }) =>
        Array.isArray(response) ? response : response.results,
      providesTags: ['InventoryMovement'],
    }),
    createMovement: builder.mutation<InventoryMovement, Partial<InventoryMovement>>({
      query: (body) => ({ url: '/inventory/movements/', method: 'POST', body }),
      invalidatesTags: ['InventoryMovement', 'Product'],
    }),
    getStock: builder.query<StockItem[], void>({
      query: () => '/inventory/stock/',
      transformResponse: (response: StockItem[] | { results: StockItem[] }) =>
        Array.isArray(response) ? response : response.results,
      providesTags: ['InventoryMovement', 'Product'],
    }),
  }),
})

export const { useListMovementsQuery, useCreateMovementMutation, useGetStockQuery } = inventoryApi
