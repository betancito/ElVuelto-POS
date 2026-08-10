---
tags: [modulo, estado]
status: vivo
module: auth
updated: 2026-08-09
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
_(nota desactualizada en general — actualizado 2026-08-09 solo en lo tocado hoy; varios ítems de abajo (R-2 cross-tenant, throttling) fueron cerrados en sesiones intermedias — ver [[00-planeacion]] antes de confiar en el resto)_

- 🟢 ~~**Sin revocación de sesiones**~~ — **cerrado 2026-08-09**: `SIMPLE_JWT["CHECK_REVOKE_TOKEN"] = True` + `ActiveUserTokenRefreshSerializer` extendido. Cambiar la contraseña (`reset_password`, promoción de rol, `UpdateMeView`) invalida todo token ya emitido — access en su próximo request, refresh de inmediato. Verificado con requests HTTP reales; costo medido = cero queries extra. **No es blacklist**: solo revoca ante cambio de password, no da un "logout" explícito. Ver [[ADR-G-20260809-revocacion-check-revoke-token]] · [[RUN-20260809-check-revoke-token]].
- 🟡 **Logout solo-cliente** (matizado por lo de arriba): `logoutUser` sigue sin llamar al server, pero ya no es el placebo que era — un `reset_password`/promoción sí corta la sesión robada. Lo que sigue faltando es un logout *voluntario* server-side (el usuario cierra sesión él mismo sin cambiar contraseña) — eso seguiría viva hasta expirar. Ver [[logout-solo-cliente-sin-blacklist]] (sin re-verificar hoy).
- 🟡 Resto de la lista (divergencia password mínima, nombre de `useLoginSuperAdminMutation`, código muerto `useMeQuery`, rol no validado en `SuperAdminLoginPage`) — **sin re-verificar hoy**, puede estar desactualizado.
