---
tags: [riesgo, auth, seguridad]
status: abierto
module: auth
severity: medio
updated: 2026-08-02
---

# Logout solo-cliente: el JWT sigue vivo tras "cerrar sesión"

**Severidad:** 🟡 medio · **Estado:** abierto, probablemente riesgo aceptado (ver [[preguntas-auth]] P-4)

## Qué pasa
El "logout" no invalida nada en el servidor:
- `logoutUser` (`authApi.ts:97-103`) usa `queryFn` local (no hace request); solo despacha `logout()`.
- El logout real que sí se usa (`ProfilePage.tsx:100`) despacha `dispatch(logout())` directo, que en el slice (`authSlice.ts:61-66`) solo limpia `accessToken/refreshToken/user` y el `sessionStorage` persistido.
- No hay revocación server-side: `settings/base.py:107-108` tiene `ROTATE_REFRESH_TOKENS=False` y `BLACKLIST_AFTER_ROTATION=False`, y no hay app `rest_framework_simplejwt.token_blacklist` instalada.

## Consecuencia
Un `access` token robado/copiado antes del logout sigue siendo válido hasta expirar (**8h**, `settings/base.py:105`), y el `refresh` hasta **7 días** (`:106`). "Cerrar sesión" solo borra las credenciales del navegador actual; no corta sesiones en otros dispositivos ni tokens ya exfiltrados.

## Contexto que reduce el impacto
- Tokens persistidos en `sessionStorage` (`store.ts:11`), no `localStorage`: mueren al cerrar la pestaña.
- Es un POS interno, no una app pública masiva.

## Sugerencia (backlog, NO implementada)
Si se requiere revocación real: instalar `token_blacklist`, activar rotación + blacklist, y que `logoutUser` sí pegue a un endpoint de blacklist del refresh. Alternativamente, acortar `ACCESS_TOKEN_LIFETIME`.

## Anclas
- `el_vuelto_frontend/src/features/auth/authApi.ts:97-103`
- `el_vuelto_frontend/src/features/auth/authSlice.ts:61-66`
- `el_vuelto_backend/elvuelto/settings/base.py:104-111`
