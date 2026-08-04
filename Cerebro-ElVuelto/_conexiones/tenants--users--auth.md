---
tags: [conexion, tenancy, users, auth]
status: vivo
updated: 2026-08-02
---

# Conexión — tenants ↔ users ↔ auth

## El eje del multi-tenant
- `User.tenant` es FK **nullable** (`apps/users/models.py:34-40`): `null` = superadmin (sin tenant).
- Crear un tenant crea su primer usuario ADMIN: `TenantCreateSerializer._create_initial_admin` (`apps/tenants/serializers.py:58-69`), rol `ADMIN`, `is_staff=True`, password `secrets.token_urlsafe(12)` devuelto una sola vez como `initial_admin_password`.
- El login mete `tenant_id` en el JWT (`users/serializers.py:26`) → `TenantMiddleware` resuelve `request.tenant` (ver [[patron-tenancy]]).

## Unicidad
- `correo`: único **global** (`users/models.py:42`).
- `cedula`: única **por tenant** (`UniqueConstraint unique_cedula_por_tenant`, `users/models.py:60-66`).

## Login por cédula (staff)
`StaffLoginPage` resuelve el tenant por slug con `checkTenantBySlug` (público, `tenants/views.py:20-44`) y **luego** hace login por cédula pasando `tenant_id`. Pero el endpoint de login **no exige** `tenant_id` → si dos tenants repiten cédula, ambigüedad. Ver [[login-cajero-sin-tenant-id]] y [[AUTH-20260802-exigir-tenant-id-login-cajero]].

## Enlaces
[[patron-jwt-refresh]] · [[patron-permisos-roles]]
