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
  nota: string
  created_at: string
}

export interface StockItem {
  product_id: string
  nombre: string
  stock_actual: number
  precio_costo: string
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
      providesTags: ['InventoryMovement'],
    }),
  }),
})

export const { useListMovementsQuery, useCreateMovementMutation, useGetStockQuery } = inventoryApi
