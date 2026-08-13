---
tags: [epica, super-admin, feature]
status: 🟢 cerrada
updated: 2026-08-09
---

> [!info] Cerrada 2026-08-09
> Ambas fases (backend + front) corridas y verificadas. Falta solo la confirmación visual del humano en navegador (ningún Chrome conectado en este entorno de review).

# EPIC-20260809 — Super-admin: página de detalle del negocio (reemplaza el módulo Usuarios)

## Objetivo
Primera feature nueva tras cerrar [[EPIC-20260802-estabilizacion]]. El super-admin deja de tener un módulo "Usuarios" separado (hoy un placeholder vacío) y en su lugar, al hacer click en un negocio desde `super-admin/tenants`, entra a una página de detalle con métricas básicas y una pestaña de usuarios donde puede ver la grilla, resetear contraseñas y descargar el PDF de credenciales.

## Por qué
Hoy `super-admin/users` (`SAUsersPage`) es un placeholder estático sin ninguna llamada a API — "Módulo de usuarios en construcción". El caso de uso real (el owner recibe un pedido de un tenant: "reseteame la contraseña de mi cajero") no tiene dónde vivir. Ponerlo dentro del detalle del negocio (en vez de una lista plana de usuarios de TODOS los tenants) es más natural: primero elegís el negocio, después el usuario.

## Decisión de arquitectura
[[ADR-G-20260809-superadmin-acceso-tenant-scoped]] — endpoints nuevos dedicados (`IsSuperAdmin`, tenant-id explícito en la URL), no impersonación completa.

## Alcance
- Backend: 3 endpoints nuevos en `apps/tenants/` (usuarios de un tenant, reset password acotado a ese tenant, métricas básicas).
- Front: `TenantDetailPage` nueva (`/super-admin/tenants/:id`), con métricas + tab de usuarios; click en fila de la tabla de negocios navega ahí.
- Reuso, sin cambios: `UserCredentialsModal` + `downloadUserCredentialCard` (`src/components/ui/`, `src/utils/downloadCredentials.ts`) — ya son genéricos, no tenant-admin-específicos.
- Borrado: `super-admin/users/` (placeholder), su ruta, su entrada de nav, y el botón de `QuickActions` que apuntaba ahí.

## Fuera de alcance
- Impersonación completa ([[SUPERADMIN-20260802-impersonar-tenant]]) — sigue abierta, aparte.
- Editar/crear usuarios desde el detalle del negocio (solo ver + resetear password, por ahora).
- Métricas avanzadas (gráficos, top productos) — ver pregunta de alcance resuelta: solo el set básico.

## Tareas
- [[SUPERADMIN-20260809-pagina-detalle-negocio]]

## Prompts (en orden — uno depende del otro)
1. Backend — [[PROMPT-FEAT-TENANCY-20260809-endpoints-superadmin-tenant-scoped]] — 🟢 corrido-ok, [[RUN-20260809-endpoints-superadmin-tenant-scoped]].
2. Frontend — [[PROMPT-FEAT-TENANCY-20260809-frontend-tenant-detail-page]] — 🟢 corrido-ok, [[RUN-20260809-frontend-tenant-detail-page]].
