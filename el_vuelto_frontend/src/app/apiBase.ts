import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query'
import type { RootState } from './store'
import { setCredentials, logout } from '@/features/auth/authSlice'

const rawBase = fetchBaseQuery({
  baseUrl: import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api',
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
