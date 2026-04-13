import { apiBase } from '@/app/apiBase'

export interface Category {
  id: string
  nombre: string
}

export interface Product {
  id: string
  nombre: string
  category: Category | null
  tipo: 'SIN_CODIGO' | 'CON_CODIGO'
  precio_venta: string
  precio_costo: string
  barcode: string | null
  stock_actual: number
  imagen: string | null
  activo: boolean
}

// Payload type for create/update — category is sent as an ID string
export interface ProductPayload {
  nombre?: string
  category?: string
  tipo?: 'SIN_CODIGO' | 'CON_CODIGO'
  precio_venta?: string
  precio_costo?: string
  barcode?: string
  activo?: boolean
}

export interface PosProduct {
  id: string
  nombre: string
  precio_venta: string
  imagen: string | null
  category: string | null
  tipo: 'SIN_CODIGO' | 'CON_CODIGO'
}

export const productsApi = apiBase.injectEndpoints({
  endpoints: (builder) => ({
    listProducts: builder.query<Product[], void>({
      query: () => '/products/',
      transformResponse: (response: Product[] | { results: Product[] }) =>
        Array.isArray(response) ? response : response.results,
      providesTags: ['Product'],
    }),
    getPosProducts: builder.query<PosProduct[], void>({
      query: () => '/products/pos/',
      transformResponse: (response: PosProduct[] | { results: PosProduct[] }) =>
        Array.isArray(response) ? response : response.results,
      providesTags: ['Product'],
    }),
    listCategories: builder.query<Category[], void>({
      query: () => '/products/categories/',
      transformResponse: (response: Category[] | { results: Category[] }) =>
        Array.isArray(response) ? response : response.results,
      providesTags: ['Category'],
    }),
    createProduct: builder.mutation<Product, ProductPayload>({
      query: (body) => ({ url: '/products/', method: 'POST', body }),
      invalidatesTags: ['Product'],
    }),
    updateProduct: builder.mutation<Product, { id: string } & ProductPayload>({
      query: ({ id, ...body }) => ({ url: `/products/${id}/`, method: 'PATCH', body }),
      invalidatesTags: ['Product'],
    }),
    deleteProduct: builder.mutation<void, string>({
      query: (id) => ({ url: `/products/${id}/`, method: 'DELETE' }),
      invalidatesTags: ['Product'],
    }),
    createCategory: builder.mutation<Category, { nombre: string }>({
      query: (body) => ({ url: '/products/categories/', method: 'POST', body }),
      invalidatesTags: ['Category'],
    }),
  }),
})

export const {
  useListProductsQuery,
  useGetPosProductsQuery,
  useListCategoriesQuery,
  useCreateProductMutation,
  useUpdateProductMutation,
  useDeleteProductMutation,
  useCreateCategoryMutation,
} = productsApi
