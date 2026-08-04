---
tags: [modulo, contratos, api]
status: documentado
module: auth
updated: 2026-08-02
---

# Auth — Contratos de API

Base URL front: `VITE_API_URL` (default `http://localhost:8000/api`). Rutas montadas en `apps/users/urls.py`. Todo el prefijo real es `/api/auth/...`.

## `POST /auth/login/` — login por correo (y cédula encubierto)
- **Vista:** `CustomTokenObtainPairView` (`views.py:19-20`) · **Serializer:** `CustomTokenObtainPairSerializer` (`serializers.py:20-83`)
- **Permiso:** `AllowAny` (heredado de `TokenObtainPairView`)
- **Request (rama correo):** `{ "correo": str, "password": str }`
- **Request (rama cédula, encubierta):** si el body trae `cedula`, entra por `serializers.py:32-46` → `{ "cedula": str, "password": str, "tenant_id"?: uuid }`. ⚠️ El endpoint "de correo" **también** hace login por cédula.
- **Response 200:** `{ access, refresh, user: {...} }` (ver forma `user` abajo)
- **Errores:** `401 {detail}` credenciales incorrectas / cuenta desactivada (`AuthenticationFailed`, `serializers.py:42-46`); `400` si faltan campos requeridos por la rama correo.
- **Filtro tenant:** rama correo → identidad por `correo` (unique global). Rama cédula → `tenant_id` **opcional** (`serializers.py:38-39`) → ver [[login-cajero-sin-tenant-id]].
- **Llamado por:** `authApi.ts:38-65` (`loginSuperAdmin`), desde `TenantLoginPage.tsx:22` y `SuperAdminLoginPage.tsx:38`.

## `POST /auth/login/cashier/` — login cajero por cédula
- **Vista:** `CashierLoginView` (`views.py:23-30`) · **Serializer:** `CashierLoginSerializer` (`serializers.py:86-126`)
- **Permiso:** `AllowAny` + `authentication_classes=[]` (no exige token; `views.py:24-25`)
- **Request:** `{ "cedula": str(min1), "password": str(min4), "tenant_id"?: uuid|null }`
- **Response 200:** `{ access, refresh, user: {...} }`
- **Errores:** `401 {detail}` credenciales / desactivada (`serializers.py:102-106`); `400` validación de campos (cédula vacía, password <4).
- **Filtro tenant:** `tenant_id` opcional (`serializers.py:97-98`). El front (`StaffLoginPage.tsx:98`) **sí** lo manda cuando el slug resuelve, pero la API acepta sin él → ver [[login-cajero-sin-tenant-id]].
- **Llamado por:** `authApi.ts:66-93` (`loginWorker`), desde `StaffLoginPage.tsx:95`.

## `POST /auth/refresh/` — refrescar access token
- **Vista:** `TokenRefreshView` (simplejwt, sin custom; `urls.py:13`)
- **Permiso:** `AllowAny`
- **Request:** `{ "refresh": str }`
- **Response 200:** `{ "access": str }` (NO devuelve refresh nuevo; `ROTATE_REFRESH_TOKENS=False`, `settings/base.py:107`)
- **Errores:** `401 {detail, code}` token inválido/expirado.
- **Llamado por:** `apiBase.ts:25-29` dentro de `baseQueryWithReauth` (automático ante 401). El front reusa el mismo `refreshToken` (`apiBase.ts:32`).

## `GET /auth/me/` — usuario actual
- **Vista:** `MeView` (`views.py:33-35`)
- **Permiso:** `IsAuthenticated` (default DRF)
- **Response 200:** `UserSerializer(request.user)` → `{ id, tenant, nombre, correo, cedula, rol, activo, lead_cashier, created_at, updated_at }` (forma distinta al `user` del login — no trae `tenant_nombre`/`tenant_logo_url`).
- **Llamado por:** `authApi.ts:94-96` (`me` query). ⚠️ **Sin consumidores** en el front (código muerto).

## `PATCH /auth/me/update/` — auto-edición
- **Vista:** `UpdateMeView` (`views.py:38-77`) — **sin serializer**, valida a mano.
- **Permiso:** `IsAuthenticated` (default)
- **Request (campos opcionales, se procesan si están presentes):**
  - `nombre` → min 2 (`views.py:47`)
  - `correo` → unicidad global excluyéndose (`views.py:55`); `""`/null → `None`
  - `new_password` + `current_password` → verifica actual (`views.py:64`), nuevo min 6 (`views.py:70`)
- **Response 200:** `UserSerializer(user)`
- **Errores:** `400 {campo: mensaje}` por campo (ej. `{"correo": "Ya existe..."}`, `{"current_password": "..."}`, `{"new_password": "Mínimo 6 caracteres."}`).
- **Llamado por:** `usersApi.ts:53-56` (`updateMe`), desde `ProfilePage.tsx:66,93` (feature `users`). ⚠️ Backend en scope auth; front en [[users]]. Ver [[divergencia-min-password-cajero]].

## Forma del objeto `user` (respuesta de ambos logins)
`serializers.py:51-64` y `:69-82` (idénticas):
```
{ id, nombre, correo, cedula, rol, activo,
  tenant_id, tenant_nombre, tenant_logo_url,
  tenant_email, tenant_support_phone, lead_cashier }
```
El front mapea snake→camel en `authApi.ts:47-60` / `:75-88`. `tenant_email` = `tenant.correo`; `tenant_support_phone` = `tenant.support_number` (campos de [[tenancy]]).

## Payload del JWT (get_token, `serializers.py:23-30`)
Sobre los claims estándar de simplejwt agrega: `tenant_id` (str|null), `rol`, `nombre`, `cedula`. El `TenantMiddleware` (`apps/tenants/middleware.py:13`) solo lee `tenant_id`.
