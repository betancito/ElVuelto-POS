---
tags: [prompt, auth, tenancy, front, fix]
status: 🔴
module: _transversal
updated: 2026-08-05
---

# Prompt DEV — Que "desactivar" funcione de punta a punta

**Tareas backlog:** [[TENANCY-20260802-toggle-active-fantasma]] + el residual de `/auth/refresh/` de [[auditoria-adversarial-20260805]]
**Alcance:** una invariante, 1 archivo del backend + 2 del front. No git.

## La invariante

> **Desactivar a alguien lo saca.** Y lo que la UI ofrece para desactivar tiene que existir de verdad.

Hoy `toggle_active` es la **única** remediación que funciona (`reset_password` no revoca nada — ver [[BACKEND-20260805-sin-revocacion-de-sesiones]], aparcado). Pero está a medio cablear en tres puntos.

---

## 1. `/api/auth/refresh/` no mira si el usuario sigue activo

Verificado por el Planner:
```
1. cajero se loguea → access + refresh
2. el admin lo desactiva (activo=False)
3. GET /api/products/pos/ con el access viejo   → 401 ✅ (el guard de is_active corta)
4. POST /api/auth/refresh/ con el refresh viejo → 200 ❌ (emite un access nuevo)
5. GET /api/products/pos/ con ese access nuevo  → 401 ✅
```

> **Ojo con la severidad:** el token que emite es **inútil** — el paso 5 lo rechaza igual. Esto **no** es un agujero de acceso. `TokenRefreshSerializer.validate` nunca carga el `User`, así que el endpoint dice "tomá" y entrega algo que no sirve.

## 2. …y por eso el auto-logout del front es código muerto

`baseQueryWithReauth` (`src/app/apiBase.ts:20-40`) hace `dispatch(logout())` **solo** en la rama en que el refresh **falla**. Como el refresh nunca falla, esa rama no se alcanza: un cajero desactivado en pleno turno se queda con la UI **aparentemente logueada**, fallando en silencio en cada request, en vez de volver a la pantalla de login.

Esto es lo que hay que arreglar: **el usuario tiene que enterarse.** (La mitad del front está deducida leyendo, no ejecutada — verificala vos.)

## 3. `toggleTenantActive` apunta a un endpoint que no existe

`src/features/tenants/tenantsApi.ts` declara una mutation contra `POST /tenants/{id}/toggle_active/`. **Ese endpoint no existe** en el backend (`TenantViewSet` solo tiene la acción `upload_logo`). Además **no tiene ningún consumidor**: el toggle que sí se ve en pantalla funciona por `PATCH updateTenant` con `activo`, que sí es real.

O sea: código muerto que apunta a un fantasma. Confirmá ambas cosas con `grep` antes de tocar y **borralo** — o, si encontrás que algo lo usa, pará y reportá.

---

## Qué hacer
- **Backend:** que `/api/auth/refresh/` rechace a un usuario inactivo (401/403 con mensaje claro) en vez de emitir un token inservible. Subclasear el serializer de simplejwt y verificar el `User` del claim es la vía directa. ⚠️ Cuidado con el costo: agrega una query por refresh — aceptable, porque los refresh son raros (el access dura 8 h).
- **Front:** que un refresh rechazado termine en `logout()` y en la pantalla de login. Revisá que la rama de error de `baseQueryWithReauth` de verdad se alcance.
- **Front:** borrar la mutation fantasma.

## Restricciones
- Backend: solo lo necesario para el refresh. **No** metas `CHECK_REVOKE_TOKEN` ni blacklist — eso es [[BACKEND-20260805-sin-revocacion-de-sesiones]], aparcado a la espera de una decisión del owner. Si lo tocás, el review falla.
- ⚠️ **No rompas** lo entregado hoy: throttling (`/auth/refresh/` tiene `TokenRefreshIPThrottle`), pisos de dinero/stock, guards de tenancy, `User.clean()`, PUT deshabilitado, invariante del correo.
- Diseño: clases `ta-*`, sin `.module.css` nuevo.

## Entregable / verificación
1. `makemigrations --check --dry-run` → sin cambios. `npm run typecheck` y `npm run build` → limpios.
2. Pegá request/respuesta:

| # | Caso | Esperado |
|---|---|---|
| 1 | `POST /auth/refresh/` con el refresh de un usuario **desactivado** | **401/403**, no 200 |
| 2 | **`POST /auth/refresh/` de un usuario activo** | **200** con access nuevo (regresión — si rompés esto, se cae la sesión de todos a las 8 h) |
| 3 | `grep toggleTenantActive src/` | **0 hits** tras borrarlo |
| 4 | **Login de cajero + usar el POS** | **200/201** (regresión) |
| 5 | **Muchos refresh seguidos** | el 429 del throttle sigue apareciendo donde corresponde (regresión) |

3. Para el front, contá **qué se ve**: cajero desactivado en pleno turno ⇒ ¿vuelve al login?
4. Veredicto ✅ / 🔴.

**Doble actualización:** `el_vuelto_backend/CLAUDE.md` (que `/auth/refresh/` valida al usuario) + `el_vuelto_frontend/CLAUDE.md` (que un refresh rechazado desloguea).

> [!warning] Si algo no cuadra
> Pará y reportá con `archivo:línea`. Lo del backend se verificó ejecutando el 2026-08-05; lo del front está deducido leyendo — si al abrirlo ves otra cosa, decilo.
