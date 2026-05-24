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
  top_productos: { nombre: string; unidades: number }[]
}

export interface VentasPorDiaItem {
  fecha: string
  total: number
  transacciones: number
}

export interface TopProducto {
  product_id: string
  nombre: string
  unidades: number
  total: number
}

export interface SaleItemExport {
  producto: string
  precio_unitario: number
  cantidad: number
  subtotal: number
}

export interface SaleExport {
  id: string
  codigo: string
  cajero: string
  metodo_pago: string
  total: number
  monto_recibido: number | null
  cambio: number | null
  hora: string
  items: SaleItemExport[]
}

export interface SalesDetailReport {
  fecha: string
  label?: string
  tenant_nombre: string
  tenant_logo_url: string | null
  total_ventas: number
  num_transacciones: number
  sales: SaleExport[]
}

export const reportsApi = apiBase.injectEndpoints({
  endpoints: (builder) => ({
    getSummary: builder.query<SummaryReport, { fecha?: string; fecha_inicio?: string; fecha_fin?: string }>({
      query: (params) => ({ url: '/reports/summary/', params }),
      providesTags: ['Report'],
    }),
    getVentasPorHora: builder.query<VentasPorHoraItem[], { fecha?: string }>({
      query: (params) => ({ url: '/reports/ventas-por-hora/', params }),
      providesTags: ['Report'],
    }),
    getVentasPorDia: builder.query<VentasPorDiaItem[], { fecha_inicio: string; fecha_fin: string }>({
      query: (params) => ({ url: '/reports/ventas-por-dia/', params }),
      providesTags: ['Report'],
    }),
    getTopProductos: builder.query<TopProducto[], { fecha?: string; fecha_inicio?: string; fecha_fin?: string; limit?: number }>({
      query: (params) => ({ url: '/reports/top-productos/', params }),
      providesTags: ['Report'],
    }),
    getSalesDetail: builder.query<SalesDetailReport, { fecha?: string; fecha_inicio?: string; fecha_fin?: string }>({
      query: (params) => ({ url: '/reports/sales-detail/', params }),
      providesTags: ['Report'],
    }),
  }),
})

export const {
  useGetSummaryQuery,
  useGetVentasPorHoraQuery,
  useGetVentasPorDiaQuery,
  useGetTopProductosQuery,
  useGetSalesDetailQuery,
} = reportsApi
