import { apiBase } from '@/app/apiBase'

export interface TenantSlugCheck {
  exists: boolean
  nombre: string | null
  logo_url: string | null
}

export interface Tenant {
  id: string
  nombre: string
  nit: string
  ciudad: string
  correo: string
  logo_url?: string | null
  activo: boolean
  created_at: string
}

export interface CreateTenantArgs {
  nombre: string
  nit: string
  ciudad: string
  correo: string
  admin_nombre: string
  admin_correo: string
}

export interface CreateTenantResponse extends Tenant {
  initial_admin_password: string
}

export interface UpdateTenantArgs {
  id: string
  nombre?: string
  nit?: string
  ciudad?: string
  correo?: string
  activo?: boolean
}

export const tenantsApi = apiBase.injectEndpoints({
  endpoints: (builder) => ({
    checkTenantBySlug: builder.query<TenantSlugCheck, string>({
      query: (slug) => `/tenants/check-by-slug/${slug}/`,
    }),
    listTenants: builder.query<Tenant[], void>({
      query: () => '/tenants/',
      transformResponse: (response: Tenant[] | { results: Tenant[] }) =>
        Array.isArray(response) ? response : response.results,
      providesTags: ['Tenant'],
    }),
    getTenant: builder.query<Tenant, string>({
      query: (id) => `/tenants/${id}/`,
      providesTags: (_r, _e, id) => [{ type: 'Tenant', id }],
    }),
    createTenant: builder.mutation<CreateTenantResponse, CreateTenantArgs>({
      query: (body) => ({ url: '/tenants/', method: 'POST', body }),
      invalidatesTags: ['Tenant'],
    }),
    updateTenant: builder.mutation<Tenant, UpdateTenantArgs>({
      query: ({ id, ...body }) => ({ url: `/tenants/${id}/`, method: 'PATCH', body }),
      invalidatesTags: ['Tenant'],
    }),
    uploadTenantLogo: builder.mutation<{ logo_url: string }, { id: string; formData: FormData }>({
      query: ({ id, formData }) => ({
        url: `/tenants/${id}/upload_logo/`,
        method: 'POST',
        body: formData,
      }),
      invalidatesTags: ['Tenant'],
    }),
    toggleTenantActive: builder.mutation<Tenant, string>({
      query: (id) => ({ url: `/tenants/${id}/toggle_active/`, method: 'POST' }),
      invalidatesTags: ['Tenant'],
    }),
  }),
})

export const {
  useCheckTenantBySlugQuery,
  useListTenantsQuery,
  useGetTenantQuery,
  useCreateTenantMutation,
  useUpdateTenantMutation,
  useUploadTenantLogoMutation,
  useToggleTenantActiveMutation,
} = tenantsApi
