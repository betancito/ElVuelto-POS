---
tags: [tarea, super-admin, auth, feature]
status: 🔴
prioridad: media
updated: 2026-08-02
---

# SUPERADMIN-20260802-impersonar-tenant — Impersonación (login-as) de un negocio

**Tipo:** feature (nueva) · **Decisión:** [[ADR-G-20260802-modelo-de-acceso-por-rol]]

## Contexto
Para ver/operar los datos de un negocio, el SUPERADMIN "entraría como" el admin del tenant.

**Esta feature no existe hoy** (verificado en el PASO 0 del 2026-08-13): no hay endpoint de
impersonación en `apps/tenants/urls.py`, el JWT solo sella el `tenant_id` del propio usuario
(`apps/users/serializers.py:62`) y no hay modelo de auditoría. Las 4 apariciones de `impersonat` en el
backend (`apps/tenants/views.py:157`, `apps/tenants/utils.py:9`, `el_vuelto_backend/CLAUDE.md:383` y
`:710`) son todas **negaciones** ("What this is NOT: impersonation").

> [!warning] Ojo — el supuesto original de esta nota quedó matizado
> La nota nacía de que "el SUPERADMIN **no** tendrá acceso directo a los datos de un negocio". Eso ya no
> es del todo cierto: [[ADR-G-20260809-superadmin-acceso-tenant-scoped]] le dio una **superficie de
> soporte acotada por URL** — hoy lee usuarios y métricas de ventas de un tenant
> (`apps/tenants/views.py:180`, `:220`) y puede resetear una contraseña (`:195`) **sin impersonar**.
> Eso reduce la urgencia de esta feature: antes de tomarla hay que preguntarle al owner qué le falta
> hoy que esos 3 endpoints no le den.

Rutas reales del super-admin hoy (`el_vuelto_frontend/src/app/router.tsx:52-59`):
`home` · `tenants` · `tenants/:id` · `billing` · `history`. La ruta `users` **fue eliminada** (la
reemplazó `TenantDetailPage`), al contrario de lo que decía esta nota.

## Objetivo
Desde `super-admin/tenants`, un botón "Ingresar como admin" que le dé al SUPERADMIN una sesión con el contexto de ese tenant (rol ADMIN efectivo), y una forma clara de **salir** y volver a super-admin. Con **auditoría** de quién impersonó a quién y cuándo.

## Criterio de aceptación
- El SUPERADMIN puede impersonar a un tenant y ver/operar como su ADMIN; al salir vuelve a su sesión de plataforma.
- Queda registro de la impersonación (auditoría).
- Sin la impersonación, el SUPERADMIN sigue sin acceso a datos de tenant (403).

## Preguntas de alcance (para el owner, antes de codear)
- ¿La impersonación es **solo lectura** o también permite **operar** (crear ventas, editar productos)?
- ¿Se audita en BD? ¿Con expiración?

## Notas para el Dev
- Endpoint tipo `POST /api/tenants/{id}/impersonate/` (`IsSuperAdmin`) que emita un token con `tenant_id` del negocio + marca de impersonación (para auditoría y para poder distinguirlo de un ADMIN real).
- Cuidado con no exponer datos cruzados; el token impersonado debe estar acotado al tenant.
- Doble actualización: `backend/CLAUDE.md` (Auth) + `frontend/CLAUDE.md` (super-admin).
