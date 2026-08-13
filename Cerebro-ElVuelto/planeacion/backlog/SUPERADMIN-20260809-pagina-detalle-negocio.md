---
tags: [tarea, super-admin, tenancy, users, feature]
status: 🟢
prioridad: feature
updated: 2026-08-09
---

> [!info] Cerrada 2026-08-09 — ambas fases
> Backend: 13/13 casos verificados con requests HTTP reales ([[RUN-20260809-endpoints-superadmin-tenant-scoped]]). Front: typecheck+build limpios, 9/9 casos trazados contra el código, componentes reusados verificados ([[RUN-20260809-frontend-tenant-detail-page]]). Visual en navegador no ejecutada (sin Chrome conectado en este entorno) — pendiente de que el humano lo confirme a ojo cuando pueda.

# SUPERADMIN-20260809-pagina-detalle-negocio — Detalle del negocio con métricas + gestión de usuarios

**Tipo:** feature (nueva) · **Épica:** [[EPIC-20260809-superadmin-gestion-tenants]] · **Decisión:** [[ADR-G-20260809-superadmin-acceso-tenant-scoped]]

## Qué se pide
Al hacer click en un negocio desde `super-admin/tenants` (`TenantsTable.tsx` — hoy sin ninguna acción en la fila, verificado), navegar a una página de detalle de ese tenant que muestre:
1. **Métricas básicas**: ventas del mes, ventas de hoy, número de usuarios (admins/cajeros), fecha de alta, estado activo/inactivo.
2. **Tab de usuarios**: grilla con los usuarios de ese tenant. Click en un usuario → modal con opción "Restablecer contraseña", que reusa el flujo y el PDF de credenciales que ya existen (`UserCredentialsModal` + `downloadUserCredentialCard`, verificados: son genéricos, no dependen de que quien los llame sea un ADMIN de tenant).

Y borrar el módulo `super-admin/users` actual — verificado que es un placeholder estático (`SAUsersPlaceholder.tsx`) sin ninguna llamada a API, cero pérdida funcional.

## Por qué hoy no se puede simplemente reusar `/api/users/`
Verificado (research 2026-08-09, sin cambios de código): `UserViewSet.get_queryset()` resuelve el tenant vía `require_tenant(request)`, que para un `SUPERADMIN` (`tenant=None`) siempre da **403**. No existe ningún endpoint que deje a un SUPERADMIN leer usuarios/reportes de OTRO tenant por id. Ver el detalle completo en [[ADR-G-20260809-superadmin-acceso-tenant-scoped]].

## Criterio de aceptación
1. Click en una fila de `super-admin/tenants` navega a `/super-admin/tenants/{id}` (el botón de editar existente sigue funcionando igual, sin disparar la navegación).
2. La página de detalle muestra las métricas listadas arriba, correctas para ESE tenant (verificable comparando contra los números reales en la BD).
3. La tab de usuarios lista SOLO los usuarios de ese tenant (nunca de otro).
4. Resetear la contraseña de un usuario desde ahí funciona, y muestra el mismo modal/PDF de credenciales que ya existe en `features/users/UsersPage.tsx` (mismo componente, sin reinventar el diseño).
5. Intentar resetear la contraseña de un `user_id` que pertenece a OTRO tenant (URL manipulada) → 404, nunca éxito.
6. `/super-admin/users` deja de existir: sin ruta, sin entrada de nav, sin botón roto en ningún lado que apunte ahí.

## Plan de prompts (2, en orden)
1. **Backend** — [[PROMPT-FEAT-TENANCY-20260809-endpoints-superadmin-tenant-scoped]] — ✅ 🟢 corrido-ok, [[RUN-20260809-endpoints-superadmin-tenant-scoped]] (13/13 casos verificados con requests HTTP reales).
2. **Frontend** — [[PROMPT-FEAT-TENANCY-20260809-frontend-tenant-detail-page]] — entregado al Dev, pendiente de correr.
