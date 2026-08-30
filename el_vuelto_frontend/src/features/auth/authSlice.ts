import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

export interface AuthUser {
  id: string
  nombre: string
  correo: string | null
  cedula: string | null
  rol: 'SUPERADMIN' | 'ADMIN' | 'CAJERO'
  activo: boolean
  tenantId: string | null
  tenantNombre: string | null
  // Persisted by the backend (`Tenant.slug`), never derived on the client.
  // Deriving it from `tenantNombre` is what sent cashiers of any business with
  // a tilde to a `/login/<slug>` the backend could not resolve.
  tenantSlug: string | null
  tenantLogoUrl: string | null
  tenantEmail: string | null
  tenantSupportPhone: string | null
  // Gobierna el bloque de factura electrónica del recibo. Llega SOLO en el
  // payload del login: `/auth/me/` no devuelve campos `tenant_*` y el refresh
  // no devuelve `user`. O sea que apagar el toggle desde el super admin no
  // afecta a un cajero ya logueado hasta que vuelva a entrar.
  tenantFacturaElectronica: boolean
  leadCashier: boolean
}

export interface AuthState {
  accessToken: string | null
  refreshToken: string | null
  user: AuthUser | null
  isAuthenticated: boolean
}

const initialState: AuthState = {
  accessToken: null,
  refreshToken: null,
  user: null,
  isAuthenticated: false,
}

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (
      state,
      action: PayloadAction<{ accessToken: string; refreshToken: string; user?: AuthUser }>
    ) => {
      state.accessToken = action.payload.accessToken
      state.refreshToken = action.payload.refreshToken
      if (action.payload.user) state.user = action.payload.user
      state.isAuthenticated = true
    },
    updateTokens: (
      state,
      action: PayloadAction<{ accessToken: string; refreshToken: string }>
    ) => {
      state.accessToken = action.payload.accessToken
      state.refreshToken = action.payload.refreshToken
    },
    updateUser: (
      state,
      action: PayloadAction<{ nombre?: string; correo?: string | null }>
    ) => {
      if (state.user) {
        if (action.payload.nombre !== undefined) state.user.nombre = action.payload.nombre
        if (action.payload.correo !== undefined) state.user.correo = action.payload.correo
      }
    },
    logout: (state) => {
      state.accessToken = null
      state.refreshToken = null
      state.user = null
      state.isAuthenticated = false
    },
  },
})

export const { setCredentials, updateTokens, updateUser, logout } = authSlice.actions
export default authSlice.reducer
