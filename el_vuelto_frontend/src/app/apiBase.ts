import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query'
import type { RootState } from './store'
import { setCredentials, logout } from '@/features/auth/authSlice'

const rawBase = fetchBaseQuery({
  // Relative on purpose. The SPA and the API are served from the SAME origin —
  // nginx routes "/" to the app and "/api/" to Django — so the browser issues
  // no CORS preflight and the bundle contains no host:port. That is what makes
  // the app reachable from a phone at http://192.168.x.x:5173 without any
  // per-machine rebuild. Only override VITE_API_URL to point at a backend on a
  // genuinely different origin.
  baseUrl: import.meta.env.VITE_API_URL ?? '/api',
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as RootState).auth.accessToken
    if (token) headers.set('Authorization', `Bearer ${token}`)
    return headers
  },
})

const baseQueryWithReauth: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extraOptions
) => {
  let result = await rawBase(args, api, extraOptions)

  if (result.error?.status === 401) {
    const refreshToken = (api.getState() as RootState).auth.refreshToken
    if (refreshToken) {
      const refreshResult = await rawBase(
        { url: '/auth/refresh/', method: 'POST', body: { refresh: refreshToken } },
        api,
        extraOptions
      )
      if (refreshResult.data) {
        const data = refreshResult.data as { access: string }
        api.dispatch(setCredentials({ accessToken: data.access, refreshToken }))
        result = await rawBase(args, api, extraOptions)
      } else {
        api.dispatch(logout())
      }
    } else {
      api.dispatch(logout())
    }
  }

  return result
}

export const apiBase = createApi({
  reducerPath: 'apiBase',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Tenant', 'User', 'Product', 'Category', 'InventoryMovement', 'Sale', 'Report'],
  endpoints: () => ({}),
})
