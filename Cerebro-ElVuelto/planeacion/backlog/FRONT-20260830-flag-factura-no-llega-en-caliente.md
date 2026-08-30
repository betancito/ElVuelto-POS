---
tags: [tarea, frontend, auth, sales, recibo]
status: 🔴
prioridad: media
updated: 2026-08-30
---

# FRONT-20260830-flag-factura-no-llega-en-caliente — el toggle se prende y la caja no se entera

> [!danger] El síntoma es «la feature no funciona», y es lo primero que va a ver el owner
> El super admin prende el toggle, recibe el toast de éxito y ve el badge de la tabla pasar a «Sí».
> La caja **sigue imprimiendo igual todo el turno**. No hay ningún error en ningún lado.

## Por qué pasa
`tenant_factura_electronica` viaja por **un solo lugar**: `_user_payload()`
(`apps/users/serializers.py:52-58`), o sea la respuesta del **login**. Después queda congelado en
`state.auth.user`, persistido a `sessionStorage` por redux-persist. Las tres rutas que podrían
refrescarlo no lo hacen:

- `GET /auth/me/` sirve `UserSerializer` (`apps/users/serializers.py:195-210`) — **cero campos
  `tenant_*`**. Y `useMeQuery` está exportado pero **no lo consume nadie**.
- `baseQueryWithReauth` (`src/app/apiBase.ts:38`) despacha `setCredentials` **sin** `user`, y
  `authSlice.ts:51` es `if (action.payload.user)` — el refresh preserva el objeto viejo.
- `updateUser` (`authSlice.ts:56-64`) solo toca `nombre` y `correo`.

Mismo problema, de paso, para `tenant_email`, `tenant_support_phone`, `tenant_nombre` y
`tenant_logo_url`: **ninguno** se refresca sin volver a entrar. El flag nuevo solo lo hizo visible.

## Mitigación que YA está puesta
Texto en el modal de editar del super admin: *«El cambio se aplica cuando el cajero vuelva a iniciar
sesión: una caja que ya está abierta sigue imprimiendo como antes hasta ese momento.»* Es honesto,
pero es un cartel, no un arreglo.

## Arreglo propuesto
1. Que `MeView` (`apps/users/views.py:70`) devuelva `_user_payload(request.user)` en vez de
   `UserSerializer` — es exactamente la forma que el front ya sabe mapear.
2. Un reducer `updateTenantInfo` en `authSlice`.
3. Consumir `useMeQuery` al montar `PosPage`, y despacharlo.

> [!warning] Trampa armada justo para quien tome esta ficha
> `authApi.ts` tenía `me: builder.query<LoginResponse['user'], void>`, o sea tipado con la forma del
> **login**, que sí trae los `tenant_*`. Eso ya mentía antes. Al implementar la factura electrónica
> se agregó el campo a ese tipo y la mentira se volvió una trampa: `tsc` habría dado 0 y en runtime
> habría llegado `undefined`. **Ya se corrigió** con una interface `MeResponse` propia
> (`authApi.ts`), que refleja `UserSerializer` de verdad. Si se hace el punto 1, hay que actualizar
> ese tipo también.

## Anclas
- `el_vuelto_backend/apps/users/serializers.py:52-58` · `:195-210` · `apps/users/views.py:70`
- `el_vuelto_frontend/src/app/apiBase.ts:38` · `src/features/auth/authSlice.ts:51,56-64`
- `el_vuelto_frontend/src/features/auth/authApi.ts` (`MeResponse`, `useMeQuery` sin consumidores)

## Enlaces
[[TENANCY-20260830-factura-electronica-por-tenant]] · [[ADR-TENANCY-20260830-factura-electronica-por-tenant]] ·
[[patron-jwt-refresh]]
