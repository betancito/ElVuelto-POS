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
  codigo: string
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

export interface ListSalesParams {
  search?: string
  fecha_inicio?: string
  fecha_fin?: string
  metodo_pago?: string
}

export const salesApi = apiBase.injectEndpoints({
  endpoints: (builder) => ({
    listSales: builder.query<Sale[], ListSalesParams | void>({
      query: (params) => ({
        url: '/sales/',
        params: params ?? undefined,
      }),
      transformResponse: (response: Sale[] | { results: Sale[] }) =>
        Array.isArray(response) ? response : response.results,
      providesTags: ['Sale'],
      keepUnusedDataFor: 60,
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
