import { apiBase } from '@/app/apiBase'

export interface SaleItem {
  product: string
  cantidad: number
  precio_unitario: string
  subtotal: string
  product_nombre: string
}

export interface Sale {
  id: string
  user: string
  user_nombre: string
  total: string
  metodo_pago: 'EFECTIVO' | 'NEQUI_TRANSFERENCIA'
  monto_recibido: string
  cambio: string
  created_at: string
  items: SaleItem[]
}

export interface CreateSaleArgs {
  metodo_pago: 'EFECTIVO' | 'NEQUI_TRANSFERENCIA'
  monto_recibido: number
  items: { product: string; cantidad: number; precio_unitario: number }[]
}

export const salesApi = apiBase.injectEndpoints({
  endpoints: (builder) => ({
    listSales: builder.query<Sale[], void>({
      query: () => '/sales/',
      transformResponse: (response: Sale[] | { results: Sale[] }) =>
        Array.isArray(response) ? response : response.results,
      providesTags: ['Sale'],
    }),
    getSale: builder.query<Sale, string>({
      query: (id) => `/sales/${id}/`,
    }),
    createSale: builder.mutation<Sale, CreateSaleArgs>({
      query: (body) => ({ url: '/sales/', method: 'POST', body }),
      invalidatesTags: ['Sale', 'InventoryMovement', 'Product'],
    }),
  }),
})

export const { useListSalesQuery, useGetSaleQuery, useCreateSaleMutation } = salesApi
