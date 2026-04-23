import { apiBase } from '@/app/apiBase'

export interface Category {
  id: string
  nombre: string
  imagen_url: string | null
}

export interface Product {
  id: string
  nombre: string
  category: string | null        // UUID returned by the API
  category_nombre: string | null // human-readable name returned alongside
  tipo: 'SIN_CODIGO' | 'CON_CODIGO'
  precio_venta: string
  precio_costo: string | null
  barcode: string | null
  proveedor: string | null
  stock_actual: number
  imagen_url: string | null
  activo: boolean
}

export interface ProductPayload {
  nombre?: string
  category?: string | null
  tipo?: 'SIN_CODIGO' | 'CON_CODIGO'
  precio_venta?: string
  precio_costo?: string | null
  barcode?: string | null
  proveedor?: string | null
  activo?: boolean
}

export interface CategoryPayload {
  nombre: string
}

export interface PosProduct {
  id: string
  nombre: string
  precio_venta: string
  imagen_url: string | null
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
    uploadProductImage: builder.mutation<{ imagen_url: string }, { id: string; formData: FormData }>({
      query: ({ id, formData }) => ({
        url: `/products/${id}/upload_image/`,
        method: 'POST',
        body: formData,
      }),
      invalidatesTags: ['Product'],
    }),
    createCategory: builder.mutation<Category, CategoryPayload>({
      query: (body) => ({ url: '/products/categories/', method: 'POST', body }),
      invalidatesTags: ['Category'],
    }),
    updateCategory: builder.mutation<Category, { id: string } & CategoryPayload>({
      query: ({ id, ...body }) => ({ url: `/products/categories/${id}/`, method: 'PATCH', body }),
      invalidatesTags: ['Category'],
    }),
    deleteCategory: builder.mutation<void, string>({
      query: (id) => ({ url: `/products/categories/${id}/`, method: 'DELETE' }),
      invalidatesTags: ['Category'],
    }),
    uploadCategoryImage: builder.mutation<{ imagen_url: string }, { id: string; formData: FormData }>({
      query: ({ id, formData }) => ({
        url: `/products/categories/${id}/upload_image/`,
        method: 'POST',
        body: formData,
      }),
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
  useUploadProductImageMutation,
  useCreateCategoryMutation,
  useUpdateCategoryMutation,
  useDeleteCategoryMutation,
  useUploadCategoryImageMutation,
} = productsApi
