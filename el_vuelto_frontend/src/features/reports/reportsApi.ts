import { apiBase } from '@/app/apiBase'

export interface SummaryReport {
  total_ventas: number
  num_transacciones: number
  unidades_vendidas: number
  porcentaje_efectivo: number
  porcentaje_nequi: number
}

export interface VentasPorHoraItem {
  hora: number
  total: number
  transacciones: number
}

export interface TopProducto {
  product_id: string
  nombre: string
  unidades: number
  total: number
}

export const reportsApi = apiBase.injectEndpoints({
  endpoints: (builder) => ({
    getSummary: builder.query<SummaryReport, { fecha?: string }>({
      query: (params) => ({ url: '/reports/summary/', params }),
      providesTags: ['Report'],
    }),
    getVentasPorHora: builder.query<VentasPorHoraItem[], { fecha?: string }>({
      query: (params) => ({ url: '/reports/ventas-por-hora/', params }),
      providesTags: ['Report'],
    }),
    getTopProductos: builder.query<TopProducto[], { fecha?: string; limit?: number }>({
      query: (params) => ({ url: '/reports/top-productos/', params }),
      providesTags: ['Report'],
    }),
  }),
})

export const { useGetSummaryQuery, useGetVentasPorHoraQuery, useGetTopProductosQuery } = reportsApi
