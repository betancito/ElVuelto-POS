---
tags: [adr, tenancy, users]
status: aceptado
module: tenancy
updated: 2026-08-02
---

# ADR-TENANCY-20260802 — Correo de usuario único global + creación de tenant atómica

## Contexto
Al crear un tenant, `TenantCreateSerializer.create` (`apps/tenants/serializers.py:49-69`) crea el `Tenant` y luego su `User` ADMIN **sin `transaction.atomic`**. Si `admin_correo` ya existe (correo es único global, `apps/users/models.py:42`), `create_user` lanza `IntegrityError` → **500** y deja el `Tenant` huérfano. Surgió la pregunta de si un mismo correo debería poder administrar varios negocios.

## Decisión (owner, 2026-08-02)
1. **El correo de usuario es ÚNICO GLOBAL:** un correo = una cuenta = un negocio. Un dueño con varios negocios usa correos distintos. (Se mantiene el modelo actual; no se soporta un correo en varios tenants.)
2. **La creación de tenant es ATÓMICA:** todo dentro de `transaction.atomic`; si `admin_correo` ya existe → **400 por campo** ("correo en uso"), sin dejar `Tenant` a medio crear.

## Estado
Aceptado.

## Consecuencias
- **Positivas:** simple, seguro, sin tenants huérfanos; login sin ambigüedad de "a qué negocio entro".
- **Deuda:** no soporta un mismo correo como admin de varios negocios (aceptado por ahora). Implementar el `atomic` + pre-validación de unicidad.

## Tareas derivadas
[[TENANCY-20260802-creacion-tenant-atomica]]

## Enlaces
[[tenants--users--auth]] · [[patron-jwt-refresh]]
