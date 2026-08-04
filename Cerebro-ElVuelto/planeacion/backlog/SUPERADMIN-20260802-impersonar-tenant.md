---
tags: [tarea, super-admin, auth, feature]
status: 🔴
prioridad: media
updated: 2026-08-02
---

# SUPERADMIN-20260802-impersonar-tenant — Impersonación (login-as) de un negocio

**Tipo:** feature (nueva) · **Decisión:** [[ADR-G-20260802-modelo-de-acceso-por-rol]]

## Contexto
El SUPERADMIN **no** tendrá acceso directo a los datos de un negocio (reports/ventas/inventario). Para verlos/operarlos, "entrará como" el admin del tenant. **Esta feature no existe hoy** (grep de `impersonat`/`login-as` = 0; el super-admin solo tiene `home/tenants/users/billing/history`).

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
