---
tags: [modulo, estado]
status: vivo
module: auth
updated: 2026-08-02
---

# Auth — Estado

**Semáforo:** 🟢 documentado (primera pasada completa)
**App back:** `apps/users/` (login/JWT vive aquí; ~340 LOC entre serializers+views) · **Feature front:** `features/auth/` (3 páginas de login + slice + api) · **Complejidad:** 🟡 media (3 flujos de login, reauth silencioso, riesgo cross-tenant)

## Punteros
- Código: [[mapa-auth]] · Endpoints: [[contratos-auth]] · Datos: [[datos-auth]] · Formularios: [[formularios-auth]]
- Preguntas abiertas: [[preguntas-auth]]
- Riesgos: [[login-cajero-sin-tenant-id]] · [[logout-solo-cliente-sin-blacklist]] · [[divergencia-min-password-cajero]]
- Conexiones: [[auth--users]] · [[auth--tenancy]]

## Qué es (3-5 líneas)
Autenticación JWT (`rest_framework_simplejwt`) con 3 flujos de login: **admin/superadmin por correo** (`POST /auth/login/`, `CustomTokenObtainPairView`), **cajero por cédula+PIN** (`POST /auth/login/cashier/`, `CashierLoginView` `AllowAny`), y **refresh** (`POST /auth/refresh/`). El token lleva `tenant_id/rol/nombre/cedula` en el payload (`serializers.py:26-29`); el `TenantMiddleware` de [[tenancy]] lo lee para inyectar `request.tenant`. En el front, `authSlice` guarda tokens+user en `sessionStorage` (redux-persist) y `baseQueryWithReauth` (`apiBase.ts:15-43`) refresca solo ante un 401.

## Pendientes / drift doc↔código
- 🔴 **R-2 cross-tenant:** ambos serializers de login por cédula aplican `tenant_id` solo si viene; sin él, `qs.first()` cruza tenants. Ver [[login-cajero-sin-tenant-id]]. (`serializers.py:37-40` y `:96-98`)
- 🟡 **Divergencia password mínima:** login cajero acepta `min_length=4` (`serializers.py:88`) pero el auto-cambio (`UpdateMeView`) exige `min 6` (`views.py:70`). Ver [[divergencia-min-password-cajero]].
- 🟡 **Logout solo-cliente:** `logoutUser` (`authApi.ts:97-103`) no llama al server ni hay blacklist (`ROTATE_REFRESH_TOKENS=False`, sin app de blacklist). Ver [[logout-solo-cliente-sin-blacklist]].
- 🟡 **Nombre mentiroso:** `useLoginSuperAdminMutation` la usan tanto `SuperAdminLoginPage` como `TenantLoginPage` (mismo endpoint `/auth/login/`); el nombre sugiere que es solo de superadmin. Ver P-1 en [[preguntas-auth]].
- 🟡 **Código muerto:** `useMeQuery` y `useLogoutUserMutation` (`authApi.ts:94-103`) están exportados pero **nadie los consume**. Ver P-2.
- ❓ `SuperAdminLoginPage` no valida rol tras login (cualquier rol → `/super-admin/home`); `TenantLoginPage` sí filtra. Ver P-3.
