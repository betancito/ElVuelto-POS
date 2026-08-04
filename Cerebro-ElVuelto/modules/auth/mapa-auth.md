---
tags: [modulo, mapa]
status: documentado
module: auth
updated: 2026-08-02
---

# Auth — Mapa de código

Todo anclado a `archivo:línea`. El modelo `User` completo y su CRUD viven en [[users]]; aquí solo lo que login/JWT toca.

## Backend — `apps/users/` (+ config)

| archivo:línea | qué hace | notas |
|---|---|---|
| `serializers.py:13-17` | `_tenant_logo_url(user)` | helper: primer `TenantDocument` LOGO del tenant → `cloudinary_url` o `None` |
| `serializers.py:20-83` | `CustomTokenObtainPairSerializer` (extends `TokenObtainPairSerializer`) | endpoint `/auth/login/` |
| `serializers.py:23-30` | `get_token(user)` | agrega al JWT: `tenant_id` (str o None), `rol`, `nombre`, `cedula` |
| `serializers.py:32-66` | `validate` — **rama cédula** | si `initial_data` trae `cedula`: filtra `User` por cédula; aplica `tenant_id` **solo si viene** (:38-39 → riesgo cross-tenant); valida password+`is_active`; arma dict `user` con `tenant_email`/`tenant_support_phone`/`lead_cashier` |
| `serializers.py:67-83` | `validate` — **rama correo** | `super().validate()` (correo=USERNAME_FIELD + password); adjunta mismo dict `user` |
| `serializers.py:86-126` | `CashierLoginSerializer` (Serializer plano) | `cedula` `min_length=1` (:87), `password` `min_length=4` (:88), `tenant_id` `UUIDField required=False allow_null` (:89) |
| `serializers.py:91-126` | `.validate` | filtra por cédula, `tenant_id` opcional (:97-98 → riesgo cross-tenant); reusa `CustomTokenObtainPairSerializer.get_token` (:108) |
| `serializers.py:215-228` | `generate_new_password(rol)` | CAJERO → 4 dígitos; otro → 10 chars mixtos. Lo usa `reset_password` de [[users]], **no** el login |
| `views.py:19-20` | `CustomTokenObtainPairView` | `serializer_class = CustomTokenObtainPairSerializer`; hereda `AllowAny` de `TokenObtainPairView` |
| `views.py:23-30` | `CashierLoginView(APIView)` | `permission_classes=[AllowAny]`, `authentication_classes=[]` (:24-25); devuelve `serializer.validated_data` |
| `views.py:33-35` | `MeView(APIView)` | GET → `UserSerializer(request.user)`; perm default `IsAuthenticated` |
| `views.py:38-77` | `UpdateMeView(APIView)` | PATCH; **dict crudo sin serializer**. `nombre` min2 (:47), `correo` unicidad global excluyéndose (:55), `new_password` exige `current_password` correcto (:64) + min6 (:70) |
| `urls.py:11` | `auth/login/` → `CustomTokenObtainPairView` | name `token_obtain_pair` |
| `urls.py:12` | `auth/login/cashier/` → `CashierLoginView` | name `cashier-login` |
| `urls.py:13` | `auth/refresh/` → `TokenRefreshView` (simplejwt) | name `token_refresh`; no custom |
| `urls.py:14` | `auth/me/` → `MeView` | name `auth_me` |
| `urls.py:15` | `auth/me/update/` → `UpdateMeView` | name `auth_me_update` |
| `permissions.py:6-12` | `IsSuperAdmin` | `rol == SUPERADMIN` |
| `permissions.py:15-23` | `IsAdmin` | `rol in (ADMIN, SUPERADMIN)` |
| `permissions.py:26-34` | `IsCajero` | `rol in (CAJERO, ADMIN, SUPERADMIN)` |
| `settings/base.py:104-111` | `SIMPLE_JWT` | access **8h**, refresh **7d**, `ROTATE_REFRESH_TOKENS=False`, `BLACKLIST_AFTER_ROTATION=False`, `AUTH_TOKEN_CLASSES=(AccessToken,)` |
| `settings/base.py:93-102` | `REST_FRAMEWORK` | default auth `JWTAuthentication`, default perm `IsAuthenticated`, paginación 50 |
| `apps/tenants/middleware.py:6-31` | `TenantMiddleware` / `_resolve_tenant` | lee `Bearer` → `AccessToken` → `tenant_id` → `Tenant.filter(id, activo=True).first()`; inyecta `request.tenant` lazy. **Dueño: [[tenancy]]**, pero consume el JWT que auth emite |

## Frontend — `features/auth/` (+ app/utils)

| archivo:línea | qué hace | notas |
|---|---|---|
| `authSlice.ts:3-16` | `AuthUser` interface | camelCase: `tenantId`, `tenantNombre`, `tenantLogoUrl`, `tenantEmail`, `tenantSupportPhone`, `leadCashier` |
| `authSlice.ts:32-67` | slice `auth` | acciones `setCredentials` (:36), `updateTokens` (:45), `updateUser` (:52, solo nombre/correo), `logout` (:61) |
| `authApi.ts:38-65` | `loginSuperAdmin` mutation | `POST /auth/login/` `{correo, password}`; `onQueryStarted` mapea snake→camel y despacha `setCredentials`. **La usan Super Admin Y Tenant login** |
| `authApi.ts:66-93` | `loginWorker` mutation | `POST /auth/login/cashier/` `{tenant_id?, cedula?, correo?, password}`; despacha `setCredentials` |
| `authApi.ts:94-96` | `me` query | `GET /auth/me/`; **exportada pero sin consumidores** (código muerto) |
| `authApi.ts:97-103` | `logoutUser` mutation | `queryFn` local (sin request); solo despacha `logout()`. **Sin consumidores** |
| `apiBase.ts:6-13` | `rawBase` | `prepareHeaders` pone `Authorization: Bearer <accessToken>` |
| `apiBase.ts:15-43` | `baseQueryWithReauth` | ante 401: si hay `refreshToken` → `POST /auth/refresh/ {refresh}` → `setCredentials({access, mismo refresh})` + retry; si falla → `logout()` |
| `apiBase.ts:45-50` | `createApi` `apiBase` | `tagTypes` incluye `User`; auth endpoints no declaran tags |
| `store.ts:9-13` | `authPersistConfig` | redux-persist `sessionStorage`, whitelist `accessToken/refreshToken/user/isAuthenticated` |
| `TenantLoginPage.tsx:9-138` | login admin por correo | **SIN Zod**, `useState` manual; usa `loginSuperAdmin`; ADMIN→`/dashboard`, CAJERO→`/pos`, otro→error (:23-29) |
| `StaffLoginPage.tsx:67-242` | login cajero por cédula+PIN | **SIN Zod**; `useCheckTenantBySlugQuery` resuelve tenant (:71); auto-submit al 4º dígito (:83-88); envía `tenant_id` solo si `tenantCheck.id` (:98) |
| `StaffLoginPage.tsx:18-64` | `PinInput` | 4 cajas `type=password`, `inputMode=numeric`, `maxLength=1` |
| `SuperAdminLoginPage.tsx:19-24` | schema Zod | `correo.email()`, `password.min(1)`; **único login con Zod** |
| `SuperAdminLoginPage.tsx:26-185` | login superadmin | `zodResolver` (:34); `login → navigate('/super-admin/home')` **sin chequear rol** (:38-39); fondo `ColorBends` (three.js) |
| `router.tsx:66-74` | rutas de login | `/login` (Guest+Tenant), `/login/:tenantSlug` (Guest+Staff), `/super-admin/login` (Guest+SuperAdmin) |
| `utils/ProtectedRoute.tsx:9-27` | guard por rol | redirige a `/super-admin/login` o `/login` según path; rol no permitido → dashboard por rol |
| `utils/GuestRoute.tsx:9-15` | guard inverso | autenticado → `defaultDashboard(rol)` |
| `utils/authRoutes.ts:1-5` | `defaultDashboard(rol)` | CAJERO→`/pos`, SUPERADMIN→`/super-admin/home`, else `/dashboard` |
