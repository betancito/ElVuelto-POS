---
tags: [modulo, contratos]
status: vivo
module: users
updated: 2026-08-02
---

# Users — Contratos (endpoints)

> Base URL front: `VITE_API_URL` = `http://localhost:8000/api`. Todas las rutas de abajo cuelgan de `/api`.
> **Ninguna** ruta de este scope es `AllowAny` — todas exigen autenticación. (Los `AllowAny` viven en [[contratos-auth]]: `login`, `login/cashier`, `refresh`.)
> **Paginación:** DRF `PageNumberPagination`, `PAGE_SIZE=50` (según `el_vuelto_backend/CLAUDE.md`, ❓ por confirmar en `settings/base.py`). ⇒ `list` puede devolver `{count,next,previous,results}`. `listUsers` normaliza array vs `{results}` (`usersApi.ts:34-36`).

## CRUD de usuarios — `/users/` (router `UserViewSet`, `views.py:80-106`)

Filtro de tenant: **manual** en `get_queryset` → `User.objects.filter(tenant=request.tenant).order_by("nombre")` (`views.py:86`). `request.tenant` lo inyecta `TenantMiddleware` desde el JWT (`tenants/middleware.py:23-31`). Si `request.tenant` es `None` (superadmin), devuelve usuarios con `tenant=None`.

| método | ruta | vista (archivo:línea) | permiso | request | response | errores |
|---|---|---|---|---|---|---|
| GET | `/users/` | `UserViewSet.list` (`views.py:80`) | `IsAdmin` | — (query paginación) | `UserSerializer[]` o `{results:[...]}` | 401/403 |
| POST | `/users/` | `create` → `UserCreateSerializer` (`views.py:88-91`) | `IsAdmin` | `nombre*`, `rol`, `correo?`, `cedula?`, `password*`, `activo?`, `lead_cashier?` | `{id,nombre,correo,cedula,rol,activo,lead_cashier}` | 400 `rol` SUPERADMIN (`ser:158`); 400 `cedula` req. cajero (`ser:170`); 400 `correo` req. admin (`ser:172`); 400 `correo` dup (`ser:182`); 400 `cedula` dup en tenant (`ser:188`) |
| GET | `/users/{id}/` | `retrieve` | `IsAdmin` | — | `UserSerializer` | 404 si fuera del tenant, 401/403 |
| PATCH | `/users/{id}/` | `partial_update` → `UserCreateSerializer` (`ser:203-212`) | `IsAdmin` | subset de POST (parcial) | `UserCreateSerializer` | igual que POST + ⚠️ nulifica `correo`/`cedula` omitidos (`ser:190-191`) |
| PUT | `/users/{id}/` | `update` (completo) | `IsAdmin` | todos los de POST | idem | idem |
| DELETE | `/users/{id}/` | `destroy` | `IsAdmin` | — | 204 | ⚠️ **sin caller front**; FK `PROTECT` en `Sale`/`InventoryMovement` ⇒ `ProtectedError`/500 si el user tiene ventas (P-1) |
| POST | `/users/{id}/toggle_active/` | `toggle_active` (`views.py:93-98`) | `IsAdmin` | — (sin body) | `UserSerializer` (con `activo` invertido) | 401/403/404 |
| POST | `/users/{id}/reset_password/` | `reset_password` (`views.py:100-106`) | `IsAdmin` | — (sin body) | `{"new_password": "<texto plano>"}` | 401/403/404 |

`reset_password` genera con `generate_new_password(user.rol)` (`ser:215-228`): CAJERO → 4 dígitos, otro → 10 chars. La respuesta viaja en **texto plano** y se muestra en `UserCredentialsModal`. Front: `resetPassword` **no** invalida tags (`usersApi.ts:50-52`).

## Perfil propio — `/auth/me/*`

| método | ruta | vista (archivo:línea) | permiso | request | response | errores |
|---|---|---|---|---|---|---|
| GET | `/auth/me/` | `MeView` (`views.py:33-35`) | `IsAuthenticated` (default) | — | `UserSerializer(request.user)` | 401 |
| PATCH | `/auth/me/update/` | `UpdateMeView` (`views.py:38-77`) | `IsAuthenticated` (default) | `nombre?`, `correo?`, `current_password?` + `new_password?` | `UserSerializer(user)` | 400 `nombre`<2 (`:49`); 400 `correo` dup (`:57`); 400 `current_password` incorrecta (`:66`); 400 `new_password`<6 (`:72`) |

`UpdateMeView` valida **campo por campo a mano** (no usa serializer): sólo procesa las claves presentes en `request.data`. El cambio de contraseña exige `current_password` correcto. Cualquier autenticado (incl. CAJERO) puede llamarlo, pero la UI `ProfilePage` está tras guard ADMIN (`router.tsx:90`).

## Quién llama a qué (costura front→back)
- `useListUsersQuery` → `GET /users/` (`usersApi.ts:32-37`)
- `useCreateUserMutation` → `POST /users/` (`usersApi.ts:38-41`) — desde `UsersPage.onSubmit:107`
- `useUpdateUserMutation` → `PATCH /users/{id}/` (`usersApi.ts:42-45`) — desde `UsersPage.onEditSubmit:135`
- `useToggleUserActiveMutation` → `POST /users/{id}/toggle_active/` (`usersApi.ts:46-49`) — botón fila `UsersPage:252`
- `useResetPasswordMutation` → `POST /users/{id}/reset_password/` (`usersApi.ts:50-52`) — `UsersPage.handleReset:148`
- `useUpdateMeMutation` → `PATCH /auth/me/update/` (`usersApi.ts:53-56`) — `ProfilePage.onInfoSubmit:66` y `onPwSubmit:93`
