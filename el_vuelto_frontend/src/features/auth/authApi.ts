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
  }
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
              },
            }),
          )
        } catch {}
      },
    }),
    me: builder.query<LoginResponse['user'], void>({
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
