---
tags: [modulo, mapa]
status: vivo
module: users
updated: 2026-08-02
---

# Users — Mapa de código

> Anclas verificadas leyendo el código el 2026-08-02. Rutas relativas a la raíz del repo.

## Backend — `apps/users/`

| archivo:línea | qué hace | notas |
|---|---|---|
| `models.py:7-10` | `UserRole` (`SUPERADMIN`/`ADMIN`/`CAJERO`) `TextChoices` | valor == label salvo capitalización |
| `models.py:13-29` | `UserManager.create_user` / `create_superuser` | superuser fuerza `rol=SUPERADMIN`, `is_staff`, `is_superuser`; `nombre = correo.split("@")[0]` |
| `models.py:32-73` | modelo `User` (`AbstractBaseUser`, `PermissionsMixin`) | PK UUID; ver [[datos-users]] |
| `models.py:51-52` | `USERNAME_FIELD="correo"`, `REQUIRED_FIELDS=["nombre"]` | login por correo; cajero entra por cédula vía serializer de auth |
| `models.py:56-66` | `Meta`: `db_table="users"`, constraint `unique_cedula_por_tenant` | constraint condicional `cedula__isnull=False` |
| `models.py:71-73` | `@property is_active` → `self.activo` | no hay columna `is_active`; `activo` es la real |
| `serializers.py:129-144` | `UserSerializer` (lectura) | fields incl. `tenant`, `lead_cashier`, `created/updated`; read_only `id,tenant,created_at,updated_at` |
| `serializers.py:147-155` | `UserCreateSerializer` decl. campos | `password` write_only `min_length=4`; `correo`/`cedula` `required=False allow_blank validators=[]` (anula validadores de unicidad DRF) |
| `serializers.py:157-162` | `validate_rol` | prohíbe asignar `SUPERADMIN` |
| `serializers.py:164-192` | `validate` | reglas rol↔campo + unicidad **manual** (`correo` global, `cedula` por `request.tenant`); normaliza `""`→`None` |
| `serializers.py:194-201` | `create` | fija `tenant=request.tenant`, `set_password` |
| `serializers.py:203-212` | `update` | saca `password`; strip `correo/cedula`→`None`; **no** toca `tenant` |
| `serializers.py:215-228` | `generate_new_password(rol)` | CAJERO → 4 dígitos; otro → 10 chars (4 obligatorios + 6, symbols `!@#$%`) |
| `views.py:33-35` | `MeView.get` | `GET /auth/me/`, devuelve `UserSerializer(request.user)`; permiso default `IsAuthenticated` |
| `views.py:38-77` | `UpdateMeView.patch` | `PATCH /auth/me/update/`; valida a mano `nombre` (≥2), `correo` (único), `new_password` (≥6) + `current_password` |
| `views.py:80-91` | `UserViewSet` | `permission_classes=[IsAdmin]`; `get_queryset` filtra `tenant=request.tenant` order `nombre`; serializer create/update→`UserCreateSerializer` |
| `views.py:93-98` | `@action toggle_active` | POST detail; invierte `activo`; devuelve `UserSerializer` |
| `views.py:100-106` | `@action reset_password` | POST detail; genera pass y la devuelve en **texto plano** `{new_password}` |
| `permissions.py:6-12` | `IsSuperAdmin` | rol == SUPERADMIN |
| `permissions.py:15-23` | `IsAdmin` | rol in (ADMIN, SUPERADMIN) |
| `permissions.py:26-34` | `IsCajero` | rol in (CAJERO, ADMIN, SUPERADMIN) — jerárquico |
| `urls.py:7-16` | router `users` + paths `auth/*` | `DefaultRouter` registra `UserViewSet` basename `user` |
| `admin.py:7-29` | `UserAdmin` (Django admin) | list/filter/search; fieldsets custom |
| `migrations/0001-0004` | historia del esquema | ver [[datos-users]] |
| `apps/tenants/middleware.py:23-31` | `TenantMiddleware` inyecta `request.tenant` (lazy) | fuente del filtro de tenant; ver [[users--tenants]] |

## Frontend — `features/users/` (+ dependencias)

| archivo:línea | qué hace | notas |
|---|---|---|
| `usersApi.ts:3-12` | interface `User` | `rol: 'ADMIN'|'CAJERO'` (sin SUPERADMIN); sin `tenant`/`updated_at` |
| `usersApi.ts:14-21` | `CreateUserArgs` | `correo?/cedula?/lead_cashier?` opcionales |
| `usersApi.ts:23-28` | `UpdateMeArgs` | `nombre?/correo?/current_password?/new_password?` |
| `usersApi.ts:32-56` | endpoints RTK Query | `listUsers`(tag `User`), `createUser`/`updateUser`/`toggleUserActive`(inval `User`), `resetPassword`(sin inval), `updateMe`(inval `User`) |
| `UsersPage.tsx:34-48` | Zod `schema` + `editSchema` (idénticos) | `nombre≥2`, `rol` enum, `correo` email|'', `cedula` string libre, `lead_cashier` bool — **no** obliga campo por rol |
| `UsersPage.tsx:65-67` | `staffLoginUrl` = `origin/login/{slug(tenantNombre)}` | slug de `tenantNombre`; ver [[users--tenants]] |
| `UsersPage.tsx:97-119` | `onSubmit` (crear) | pass = CAJERO `generatePin()` / else `generateAdminPassword()`; `catch {}` traga 400 |
| `UsersPage.tsx:121-130` | `handleOpenEdit` | `resetEdit` con datos del user |
| `UsersPage.tsx:132-145` | `onEditSubmit` | PATCH sin password; `catch {}` traga 400 |
| `UsersPage.tsx:147-161` | `handleReset` | llama `resetPassword`, muestra `UserCredentialsModal` (`isReset`) |
| `ProfilePage.tsx:13-29` | `infoSchema` + `passwordSchema` | `new_password` `min6`; refine confirm |
| `ProfilePage.tsx:32-42` | `fieldError` helper | extrae `{campo:"msg"}` o `[msg]` del error RTK |
| `ProfilePage.tsx:62-76` | `onInfoSubmit` | `updateMe`; despacha `updateUser` a Redux; **sí** mapea error de servidor |
| `ProfilePage.tsx:91-110` | `onPwSubmit` | `updateMe`; en éxito `logout()`+`/login` tras 2s; mapea errores por campo |
| `components/ui/UserCredentialsModal.tsx:9-102` | tarjeta de credenciales (se muestra 1 vez) | portal; descarga vía `downloadUserCredentialCard` |
| `utils/generatePassword.ts:11-22` | `generateAdminPassword()` | **12** chars (4 oblig + 8), symbols `!@#$%&*` |
| `utils/generatePassword.ts:24-26` | `generatePin()` | 4 dígitos |
| `features/auth/authSlice.ts:52-60` | reducer `updateUser` | solo actualiza `nombre` y `correo` en Redux |
| `app/router.tsx:100-101` | rutas `/users`, `/profile` | dentro de bloque `ProtectedRoute allowedRoles=['ADMIN']` (`:90`) |
| `app/apiBase.ts` | `tagTypes` incl. `User` | base RTK Query con reauth |
