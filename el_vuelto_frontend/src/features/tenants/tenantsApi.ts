import { apiBase } from '@/app/apiBase'

export interface Tenant {
  id: string
  nombre: string
  nit: string
  ciudad: string
  correo: string
  logo: string | null
  activo: boolean
  created_at: string
}

export interface CreateTenantArgs {
  nombre: string
  nit: string
  ciudad: string
  correo: string
  admin_nombre: string
  admin_cedula?: string
  admin_correo?: string
  admin_password: string
}

export const tenantsApi = apiBase.injectEndpoints({
  endpoints: (builder) => ({
    listTenants: builder.query<Tenant[], void>({
      query: () => '/tenants/',
      providesTags: ['Tenant'],
    }),
    getTenant: builder.query<Tenant, string>({
      query: (id) => `/tenants/${id}/`,
      providesTags: (_r, _e, id) => [{ type: 'Tenant', id }],
    }),
    createTenant: builder.mutation<Tenant & { admin_password: string }, CreateTenantArgs>({
      query: (body) => ({ url: '/tenants/', method: 'POST', body }),
      invalidatesTags: ['Tenant'],
    }),
    updateTenant: builder.mutation<Tenant, { id: string } & Partial<Tenant>>({
      query: ({ id, ...body }) => ({ url: `/tenants/${id}/`, method: 'PATCH', body }),
      invalidatesTags: (_r, _e, { id }) => [{ type: 'Tenant', id }],
    }),
    toggleTenantActive: builder.mutation<Tenant, string>({
      query: (id) => ({ url: `/tenants/${id}/toggle_active/`, method: 'POST' }),
      invalidatesTags: ['Tenant'],
    }),
  }),
})

export const {
  useListTenantsQuery,
  useGetTenantQuery,
  useCreateTenantMutation,
  useUpdateTenantMutation,
  useToggleTenantActiveMutation,
} = tenantsApi
