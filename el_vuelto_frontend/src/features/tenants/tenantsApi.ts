import { apiBase } from '@/app/apiBase'

export interface TenantSlugCheck {
  exists: boolean
  id: string | null
  nombre: string | null
  logo_url: string | null
}

export interface Tenant {
  id: string
  nombre: string
  nit: string
  ciudad: string
  correo: string
  support_number?: string | null
  logo_url?: string | null
  /** Toggle del recibo: gobierna el bloque "¿Requiere factura electrónica?".
   *  Requerido — el backend lo devuelve siempre (`default=False` en el modelo). */
  factura_electronica: boolean
  activo: boolean
  created_at: string
}

export interface CreateTenantArgs {
  nombre: string
  nit: string
  ciudad: string
  correo: string
  support_number?: string
  factura_electronica?: boolean
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
  support_number?: string
  factura_electronica?: boolean
  activo?: boolean
}

/** One row of `GET /tenants/{id}/users/` — the backend serves `UserSerializer`,
 *  the same shape `/api/users/` returns for a tenant's own admin. */
export interface TenantUser {
  id: string
  tenant: string
  nombre: string
  correo: string | null
  cedula: string | null
  rol: 'ADMIN' | 'CAJERO'
  activo: boolean
  lead_cashier: boolean
  created_at: string
  updated_at: string
}

/** `GET /tenants/{id}/metrics/`. Money arrives as a number and is already
 *  coerced to 0 server-side when the business has no sales — never null. */
export interface TenantMetrics {
  ventas_mes: number
  ventas_hoy: number
  num_admins: number
  num_cajeros: number
  fecha_alta: string
  activo: boolean
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
    /** Removes the logo entirely (asset + row). The backend answers 204 even
     *  when there was no logo, so a double click is not an error. */
    deleteTenantLogo: builder.mutation<void, { id: string }>({
      query: ({ id }) => ({
        url: `/tenants/${id}/logo/`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Tenant'],
    }),

    // ── SUPERADMIN-only, scoped to one tenant by URL ──────────────────────
    // These read another business's data, which no other frontend surface may
    // do; the backend enforces `IsSuperAdmin` on all three.
    getTenantUsers: builder.query<TenantUser[], string>({
      query: (tenantId) => `/tenants/${tenantId}/users/`,
      // Same defensive unwrap `listTenants` uses: the endpoint is unpaginated
      // today, but a global DRF pagination setting would silently turn the
      // array into `{results: [...]}` and break `.map` at runtime.
      transformResponse: (response: TenantUser[] | { results: TenantUser[] }) =>
        Array.isArray(response) ? response : response.results,
      // Tagged per tenant so a reset in one business does not refetch another.
      providesTags: (_r, _e, tenantId) => [{ type: 'User', id: `tenant-${tenantId}` }],
    }),
    getTenantMetrics: builder.query<TenantMetrics, string>({
      query: (tenantId) => `/tenants/${tenantId}/metrics/`,
      providesTags: (_r, _e, tenantId) => [{ type: 'Tenant', id: `metrics-${tenantId}` }],
    }),
    resetTenantUserPassword: builder.mutation<
      { new_password: string },
      { tenantId: string; userId: string }
    >({
      query: ({ tenantId, userId }) => ({
        url: `/tenants/${tenantId}/users/${userId}/reset_password/`,
        method: 'POST',
      }),
      // A reset changes no field this list displays (name, rol, estado), so
      // nothing is invalidated: refetching would only throw away the list the
      // admin is looking at while the credentials modal is open.
    }),
    // Deliberately no `toggleTenantActive`: `POST /tenants/{id}/toggle_active/`
    // does not exist on the backend (TenantViewSet's only extra actions are
    // `upload_logo` and `delete_logo`).
    // Activating/deactivating a tenant goes through `updateTenant` with
    // `activo`, which is what the UI already uses.
  }),
})

export const {
  useCheckTenantBySlugQuery,
  useListTenantsQuery,
  useGetTenantQuery,
  useCreateTenantMutation,
  useUpdateTenantMutation,
  useUploadTenantLogoMutation,
  useDeleteTenantLogoMutation,
  useGetTenantUsersQuery,
  useGetTenantMetricsQuery,
  useResetTenantUserPasswordMutation,
} = tenantsApi
