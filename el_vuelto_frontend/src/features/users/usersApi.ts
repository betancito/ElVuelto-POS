import { apiBase } from '@/app/apiBase'

export interface User {
  id: string
  nombre: string
  correo: string | null
  cedula: string | null
  rol: 'ADMIN' | 'CAJERO'
  activo: boolean
  created_at: string
}

export interface CreateUserArgs {
  nombre: string
  correo?: string
  cedula?: string
  rol: 'ADMIN' | 'CAJERO'
  password: string
}

export const usersApi = apiBase.injectEndpoints({
  endpoints: (builder) => ({
    listUsers: builder.query<User[], void>({
      query: () => '/users/',
      transformResponse: (response: User[] | { results: User[] }) =>
        Array.isArray(response) ? response : response.results,
      providesTags: ['User'],
    }),
    createUser: builder.mutation<User, CreateUserArgs>({
      query: (body) => ({ url: '/users/', method: 'POST', body }),
      invalidatesTags: ['User'],
    }),
    updateUser: builder.mutation<User, { id: string } & Partial<User>>({
      query: ({ id, ...body }) => ({ url: `/users/${id}/`, method: 'PATCH', body }),
      invalidatesTags: ['User'],
    }),
    toggleUserActive: builder.mutation<User, string>({
      query: (id) => ({ url: `/users/${id}/toggle_active/`, method: 'POST' }),
      invalidatesTags: ['User'],
    }),
    resetPassword: builder.mutation<{ new_password: string }, string>({
      query: (id) => ({ url: `/users/${id}/reset_password/`, method: 'POST' }),
    }),
  }),
})

export const {
  useListUsersQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useToggleUserActiveMutation,
  useResetPasswordMutation,
} = usersApi
