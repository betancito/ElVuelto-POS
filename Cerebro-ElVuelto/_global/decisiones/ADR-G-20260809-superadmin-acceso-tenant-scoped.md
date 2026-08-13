---
tags: [adr, global, super-admin, permisos, seguridad]
status: aceptado
updated: 2026-08-09
---

# ADR-G-20260809 — Acceso de SUPERADMIN a un tenant específico: endpoints dedicados, no impersonación

## Contexto

[[ADR-G-20260802-modelo-de-acceso-por-rol]] decidió que **SUPERADMIN = solo plataforma**: sin acceso directo a datos operativos de un tenant, salvo por una "impersonación (login-as)" que quedó explícitamente **sin construir** ([[SUPERADMIN-20260802-impersonar-tenant]]).

Investigado el 2026-08-09 (research-only, sin cambios): confirmado que hoy **no existe ningún camino** — ni endpoint, ni query param, ni header — por el que un `rol=SUPERADMIN, tenant=None` pueda leer usuarios, ventas o reportes de un tenant elegido por id. `UserViewSet.get_queryset()` resuelve el tenant vía `require_tenant(request)`, que para un SUPERADMIN siempre es `None` ⇒ **403** (`apps/tenants/utils.py`). Lo mismo aplica a los 5 `APIView` de reports y al resto de vistas tenant-scoped.

Nueva feature pedida por el owner: desde `super-admin/tenants`, click en un negocio → página de detalle con métricas básicas + una grilla de sus usuarios + poder resetear la contraseña de un usuario y descargar el PDF de credenciales (reusando `UserCredentialsModal`/`downloadUserCredentialCard`, ya existentes y genéricos).

## Decisión

Owner: humano (jeronimobeta90), 2026-08-09.

**No se construye impersonación completa para esto.** En su lugar: **tres endpoints nuevos, dedicados, `IsSuperAdmin`-only**, cada uno tomando el `tenant_id` de la URL explícitamente (no de `request.tenant`, que sigue sin existir para un SUPERADMIN):

1. `GET /api/tenants/{id}/users/` — lista de usuarios de ESE tenant.
2. `POST /api/tenants/{id}/users/{user_id}/reset_password/` — resetea la contraseña de un usuario de ESE tenant (con guard: el `user_id` debe pertenecer al `tenant_id` de la URL, o 404).
3. `GET /api/tenants/{id}/metrics/` — ventas del mes, ventas de hoy, conteo de admins/cajeros, fecha de alta, estado activo.

**Por qué esto y no impersonación:** lo pedido es leer + un reset acotado, no "operar como" el admin del tenant (crear ventas, editar productos, etc.). Endpoints dedicados son más chicos, más auditables por lectura de código (cada uno hace exactamente una cosa), y no requieren emitir un token especial, manejar "salir de la impersonación", ni construir auditoría de sesión — superficie mínima para lo que se pidió.

**No cierra [[SUPERADMIN-20260802-impersonar-tenant]].** Esa sigue siendo una feature más grande y de propósito general (operar como el tenant, no solo ver/resetear), que queda abierta para cuando (si) haga falta.

## Estado
Aceptado. Implementación: [[SUPERADMIN-20260809-pagina-detalle-negocio]].

## Consecuencias
- **Positivas:** superficie mínima y explícita; cada endpoint nuevo es de solo lectura salvo el reset, que ya existe como patrón (`UserViewSet.reset_password`) y solo se reusa con un guard de tenant distinto.
- **Deuda:** si en el futuro se pide más (ej. superadmin creando una venta de prueba, o editando productos de un tenant), esto no lo resuelve — ahí sí hace falta la impersonación real.
- **Guard obligatorio:** el reset de password debe verificar que el `user_id` pertenece al `tenant_id` de la URL — sin eso, cualquier `user_id` válido resetearía la contraseña de un usuario de OTRO tenant.

## Tareas derivadas
- [[SUPERADMIN-20260809-pagina-detalle-negocio]] — feature completa (backend + front).

## Enlaces
[[ADR-G-20260802-modelo-de-acceso-por-rol]] · [[SUPERADMIN-20260802-impersonar-tenant]] · `apps/tenants/utils.py` · `apps/users/views.py:146-158`
