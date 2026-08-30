import { apiBase } from '@/app/apiBase'
import { setCredentials, updateTokens, logout } from './authSlice'
import type { AppDispatch } from '@/app/store'

interface LoginSuperAdminArgs {
  correo: string
  password: string
}

interface LoginWorkerArgs {
  tenant_id?: string
  cedula?: string
  correo?: string
  password: string
}

interface LoginResponse {
  access: string
  refresh: string
  user: {
    id: string
    nombre: string
    correo: string | null
    cedula: string | null
    rol: 'SUPERADMIN' | 'ADMIN' | 'CAJERO'
    activo: boolean
    tenant_id: string | null
    tenant_nombre: string | null
    tenant_slug: string | null
    tenant_logo_url: string | null
    tenant_email: string | null
    tenant_support_phone: string | null
    tenant_factura_electronica: boolean | null
    lead_cashier: boolean
  }
}

/** Lo que devuelve `GET /auth/me/` de verdad: `UserSerializer`, sin campos `tenant_*`. */
export interface MeResponse {
  id: string
  tenant: string | null
  nombre: string
  correo: string | null
  cedula: string | null
  rol: 'SUPERADMIN' | 'ADMIN' | 'CAJERO'
  activo: boolean
  lead_cashier: boolean
  created_at: string
  updated_at: string
}

export const authApi = apiBase.injectEndpoints({
  endpoints: (builder) => ({
    loginSuperAdmin: builder.mutation<LoginResponse, LoginSuperAdminArgs>({
      query: (body) => ({ url: '/auth/login/', method: 'POST', body }),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled
          ;(dispatch as AppDispatch)(
            setCredentials({
              accessToken: data.access,
              refreshToken: data.refresh,
              user: {
                id: data.user.id,
                nombre: data.user.nombre,
                correo: data.user.correo,
                cedula: data.user.cedula,
                rol: data.user.rol,
                activo: data.user.activo,
                tenantId: data.user.tenant_id,
                tenantNombre: data.user.tenant_nombre,
                tenantSlug: data.user.tenant_slug,
                tenantLogoUrl: data.user.tenant_logo_url,
                tenantEmail: data.user.tenant_email,
                tenantSupportPhone: data.user.tenant_support_phone,
                // `?? false` y no `?? true`: el default del modelo es False
                // (opt-in). Los dos tienen que coincidir o un tenant sin el
                // campo imprimiría distinto de uno recién creado.
                tenantFacturaElectronica: data.user.tenant_factura_electronica ?? false,
                leadCashier: data.user.lead_cashier,
              },
            }),
          )
        } catch {}
      },
    }),
    loginWorker: builder.mutation<LoginResponse, LoginWorkerArgs>({
      query: (body) => ({ url: '/auth/login/cashier/', method: 'POST', body }),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled
          ;(dispatch as AppDispatch)(
            setCredentials({
              accessToken: data.access,
              refreshToken: data.refresh,
              user: {
                id: data.user.id,
                nombre: data.user.nombre,
                correo: data.user.correo,
                cedula: data.user.cedula,
                rol: data.user.rol,
                activo: data.user.activo,
                tenantId: data.user.tenant_id,
                tenantNombre: data.user.tenant_nombre,
                tenantSlug: data.user.tenant_slug,
                tenantLogoUrl: data.user.tenant_logo_url,
                tenantEmail: data.user.tenant_email,
                tenantSupportPhone: data.user.tenant_support_phone,
                // `?? false` y no `?? true`: el default del modelo es False
                // (opt-in). Los dos tienen que coincidir o un tenant sin el
                // campo imprimiría distinto de uno recién creado.
                tenantFacturaElectronica: data.user.tenant_factura_electronica ?? false,
                leadCashier: data.user.lead_cashier,
              },
            }),
          )
        } catch {}
      },
    }),
    /**
     * OJO: `/auth/me/` NO devuelve la misma forma que el login. Sirve
     * `UserSerializer`, que no tiene NINGÚN campo `tenant_*`. Antes esto estaba
     * tipado como `LoginResponse['user']` y ya mentía; al agregar
     * `tenant_factura_electronica` a ese tipo la mentira se volvió una trampa
     * armada justo para quien intente refrescar el flag desde acá: `tsc` daría
     * 0 y en runtime llegaría `undefined`. Tipo propio, entonces.
     */
    me: builder.query<MeResponse, void>({
      query: () => '/auth/me/',
    }),
    logoutUser: builder.mutation<void, void>({
      queryFn: () => ({ data: undefined }),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        await queryFulfilled
        ;(dispatch as AppDispatch)(logout())
      },
    }),
  }),
})

export const { useLoginSuperAdminMutation, useLoginWorkerMutation, useMeQuery, useLogoutUserMutation } = authApi
