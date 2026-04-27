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
  tenantLogoUrl: string | null
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
    logout: (state) => {
      state.accessToken = null
      state.refreshToken = null
      state.user = null
      state.isAuthenticated = false
    },
  },
})

export const { setCredentials, updateTokens, logout } = authSlice.actions
export default authSlice.reducer
