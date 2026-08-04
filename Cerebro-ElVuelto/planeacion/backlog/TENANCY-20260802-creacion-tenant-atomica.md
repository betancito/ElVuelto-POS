---
tags: [tarea, tenancy, bug]
status: 🟢
prioridad: alta
updated: 2026-08-02
---

# TENANCY-20260802-creacion-tenant-atomica — Creación de tenant no atómica

**Tipo:** bug / robustez · **Descubierto:** auditoría de módulos 2026-08-02

## Problema
`TenantCreateSerializer.create` (`apps/tenants/serializers.py:49-69`) crea el `Tenant` y luego el `User` ADMIN **sin `transaction.atomic`**. Si `admin_correo` ya existe (correo es único global), `create_user` lanza `IntegrityError` → **HTTP 500** y deja el `Tenant` **huérfano** (creado, sin admin). Además el error debería ser 400 por campo, no 500.

## Criterio de aceptación
Creación atómica: `admin_correo` duplicado → 400 por campo `admin_correo`, sin dejar `Tenant` a medio crear. La creación exitosa no cambia.

## Notas para el Dev
- Envolver `create` en `transaction.atomic` y pre-validar la unicidad de `admin_correo` en `validate`.
- Ref pregunta P-2 de tenancy. Doble actualización: `backend/CLAUDE.md` (Tenants).

## Decisión del owner (2026-08-02)
Confirmado: creación **atómica** + correo **único global** → `admin_correo` duplicado devuelve **400 por campo**, sin tenant huérfano. Ver [[ADR-TENANCY-20260802-correo-admin-unico-global]].

## Resuelto (2026-08-02) 🟢
`create` en `transaction.atomic()` + pre-validación de `admin_correo` en `validate` (400 por campo). `makemigrations --check` sin cambios. Ver [[RUN-20260802-creacion-atomica]].
