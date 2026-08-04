---
tags: [patron, global, auth, jwt]
status: vivo
updated: 2026-08-02
---

# Patrón — JWT, refresh y flujos de login

> [!warning] LÉEME SI VAS A TOCAR: login, tokens, o la capa de reauth del front.

## Tokens (`settings/base.py:104-111`)
- Access: **8 horas**. Refresh: **7 días**. `ROTATE_REFRESH_TOKENS = False`, `BLACKLIST_AFTER_ROTATION = False`. `AUTH_TOKEN_CLASSES = AccessToken`.
- **Payload extra en cada token** (`apps/users/serializers.py:23-30`): `tenant_id`, `rol`, `nombre`, `cedula`. El middleware de tenant lee `tenant_id` de aquí (`middleware.py:13`).

## Tres flujos de login
| Flujo | Endpoint | Vista | Auth |
|---|---|---|---|
| Email + password | `POST /api/auth/login/` | `CustomTokenObtainPairView` | AllowAny |
| Cédula + password | `POST /api/auth/login/cashier/` | `CashierLoginView` (`authentication_classes=[]`) | AllowAny |
| Refresh | `POST /api/auth/refresh/` | `TokenRefreshView` | AllowAny |
| Yo (perfil) | `GET /api/auth/me/` | `MeView` | IsAuthenticated |

La respuesta de login incluye `user` con `tenant_id/tenant_nombre/tenant_logo_url/tenant_email/tenant_support_phone/lead_cashier` (`serializers.py:48-65, 112-125`).

## Front — reauth automática (`app/apiBase.ts:15-43`)
`baseQueryWithReauth`: si una request da **401** y hay `refreshToken`, hace `POST /auth/refresh/ {refresh}`. Si vuelve `access` → `dispatch(setCredentials(...))` + reintenta la request original. Si falla o no hay refresh → `dispatch(logout())`. El auth se persiste a **sessionStorage** (`app/store.ts:3`, whitelist `accessToken/refreshToken/user/isAuthenticated`).

## Gotchas
- El refresh **no rota** (`ROTATE False`) ni hay blacklist: un refresh token robado sirve 7 días. Access de 8h es largo. (Riesgo a evaluar, no bug.)
- El login por cédula **no exige `tenant_id`** → riesgo cross-tenant. Ver [[login-cajero-sin-tenant-id]] (módulo auth) y [[AUTH-20260802-exigir-tenant-id-login-cajero]].
- `POST /api/auth/me/update/` (`UpdateMeView`, `users/views.py:38-77`) valida a mano (sin serializer) y usa `new_password` mín 6, divergente de otras reglas. Ver [[reglas-password-divergentes]].

## Enlaces
[[patron-tenancy]] · [[patron-permisos-roles]] · [[tenants--users--auth]]
