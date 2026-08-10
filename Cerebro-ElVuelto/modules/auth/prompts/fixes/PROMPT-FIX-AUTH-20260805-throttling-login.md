---
tags: [prompt, auth, seguridad, backend, fix]
status: 🔴
module: auth
updated: 2026-08-05
---

# 🔒 Prompt DEV — Poner límite de intentos en los endpoints de autenticación

**Tarea backlog:** [[AUTH-20260805-sin-throttling-en-login]]
**Alcance:** throttling en 4 endpoints + configuración de cache. No git. No tocar el front.

## El problema

Hoy se puede adivinar el PIN de un cajero **sin ninguna credencial previa**:

1. `TenantBySlugView` (`apps/tenants/views.py:20-46`) es `AllowAny` con `authentication_classes = []` y devuelve `{"exists": true, "id": "<uuid del tenant>", ...}` — ese UUID es exactamente el `tenant_id` que pide el login de cajero.
2. La cédula no es secreta (va en el documento, la conocen los compañeros).
3. El PIN son 4 dígitos = 10.000 combinaciones (decisión deliberada del owner: pantalla táctil, **no la toques**).
4. **No hay ningún límite**: verificado, cero `DEFAULT_THROTTLE_*` en `settings/` y ni `django-axes` ni `django-ratelimit` en `requirements.txt`.

Medido por la auditoría: ~9 req/s sin un solo 429 ⇒ el espacio completo cae en **~18 minutos con un hilo**.

> **No "arregles" esto quitando el `id` de la respuesta.** El front lo necesita: `StaffLoginPage` resuelve el tenant por slug y se lo pasa a `/api/auth/login/cashier/`, que lo exige desde [[AUTH-20260802-exigir-tenant-id-login-cajero]] (la cédula solo es única por tenant). Sacarlo rompe el login del POS. **Lo que falta es limitar intentos.**

## Qué hacer

### 1. Throttling en los endpoints de autenticación
`POST /api/auth/login/`, `POST /api/auth/login/cashier/`, `POST /api/auth/refresh/` y `GET /api/tenants/check-by-slug/<slug>/`.

- Usá el throttling de DRF (`ScopedRateThrottle` con un scope por endpoint, o clases propias). **No** agregues dependencias nuevas sin decirlo.
- **Solo estos endpoints.** No pongas `DEFAULT_THROTTLE_CLASSES` global: el POS es la pantalla que más requests hace y un límite global la rompería.
- Elegí tasas defendibles y **justificalas en el reporte**. Pensá en el uso real: un cajero se equivoca de PIN un par de veces, no doscientas.

### 2. Decidí la clave del límite
Un throttle **por IP** es lo fácil, pero en un local **todos los cajeros comparten la misma NAT**: un compañero con dedos torpes puede bloquear a los demás. Un límite por `cedula` + `tenant_id` es más preciso.
Decidí, implementá y **explicá el trade-off** — no hay una respuesta única y quiero ver el razonamiento.

### 3. ⚠️ El cache, que es donde esto se rompe en silencio
El throttling de DRF **cuenta en el cache**. No hay `CACHES` configurado, así que Django usa **`LocMemCache`, que es por proceso**: con varios workers de gunicorn cada uno lleva su propia cuenta y el límite efectivo se multiplica por el número de workers.

- Configurá `CACHES` explícitamente y documentá qué pasa en dev vs producción (Redis sería lo correcto en producción; para dev `LocMemCache` alcanza).
- **No** metas Redis como dependencia obligatoria sin avisar — si lo proponés, dejalo opcional por variable de entorno y decilo en el reporte.

## Restricciones
- Solo backend: `settings/`, `apps/users/views.py`, `apps/tenants/views.py` y, si hace falta, un módulo nuevo de throttles. **Nada de front.**
- **No cambies** el PIN de 4 dígitos, ni el requisito de `tenant_id`, ni el contrato de ninguna respuesta.
- ⚠️ **No rompas** lo entregado: guards de tenancy, `User.clean()`, PUT deshabilitado, política de password, invariante del correo, params de fecha.
- Sin migraciones (esto no toca modelos).

## Entregable / verificación
1. `makemigrations --check --dry-run` → sin cambios.
2. Pegá request/respuesta:

| # | Caso | Esperado |
|---|---|---|
| 1 | N+1 intentos fallidos seguidos contra `/api/auth/login/cashier/` | los primeros **401/403**, después **429** |
| 2 | Lo mismo contra `/api/auth/login/` | **429** al pasar el tope |
| 3 | Muchos GET seguidos a `check-by-slug` | **429** al pasar el tope |
| 4 | **Login correcto de cajero, sin intentos previos** | **200** con tokens (regresión) |
| 5 | **Un cajero logueado usando el POS**: `GET /products/pos/` + `POST /sales/` varias veces | **200/201 siempre**, ningún 429 (regresión — es lo que más me importa) |
| 6 | **`GET /api/reports/summary/` como ADMIN, repetido** | sin 429 (regresión) |

3. Decí explícitamente: qué tasas elegiste y por qué, si throttleás por IP o por identidad, y qué configuraste en `CACHES`.
4. Veredicto ✅ / 🔴.

**Doble actualización:** `el_vuelto_backend/CLAUDE.md` (Authentication) — las tasas, la clave del límite, y la advertencia de que con `LocMemCache` el conteo es por proceso.

> [!info] Lo que este prompt NO resuelve
> Aunque detectes el ataque, `reset_password` sigue **sin revocar** la sesión ([[BACKEND-20260805-sin-revocacion-de-sesiones]]): una vez adentro, cambiarle el PIN al cajero no lo saca. Es otra tarea, pendiente de decisión del owner. No la toques acá.

> [!warning] Si algo no cuadra
> Pará y reportá con `archivo:línea`. Las anclas se verificaron el 2026-08-05, pero el código manda.
