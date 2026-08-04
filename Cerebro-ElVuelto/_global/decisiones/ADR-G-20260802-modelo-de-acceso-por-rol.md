---
tags: [adr, global, permisos, roles, seguridad]
status: aceptado
updated: 2026-08-02
---

# ADR-G-20260802 — Modelo de acceso por rol (cajero solo-lectura, superadmin solo plataforma)

## Contexto
La auditoría encontró dos problemas de control de acceso:
- **products:** `CategoryViewSet`/`ProductViewSet` sin `permission_classes` → default `IsAuthenticated` → un CAJERO puede CRUD de productos (`apps/products/views.py:13,39`). Ver [[PRODUCTS-20260802-viewsets-sin-permiso]].
- **reports (y demás tenant-scoped):** `IsAdmin` deja pasar SUPERADMIN, que tiene `tenant=None` → resultados vacíos o **500** (`apps/reports/views.py:169`). Ver [[REPORTS-20260802-endpoints-500-tenant-none]].

## Decisión (owner, 2026-08-02)
1. **CAJERO = solo-lectura del catálogo.** En el POS toca los productos en el panel táctil y van al carrito; **nunca** crea/edita/borra. Consume únicamente `GET /products/pos/`. El CRUD de products/categories se restringe a **`IsAdmin`**.
   - Alcance del cajero: leer catálogo (`/products/pos/`), crear ventas, y registrar `ENTRADA` de inventario **solo si** `lead_cashier`. Nada más.
2. **SUPERADMIN = solo plataforma.** No accede directamente a datos operativos de un tenant (reports, ventas, inventario). Solo administra la plataforma (tenants, usuarios SA, billing).
   - Para ver/operar datos de un negocio, el SUPERADMIN usará **impersonación (login-as)** — feature aún **no construida**: [[SUPERADMIN-20260802-impersonar-tenant]].
   - Mientras tanto, los endpoints tenant-scoped que reciban `request.tenant is None` responden **403** explícito (no 500, no vacío ambiguo).

## Estado
Aceptado.

## Consecuencias
- **Positivas:** cierra la escalada de privilegios y el 500; modelo de acceso claro y auditable.
- **Deuda:** (a) `IsAdmin` en products viewsets; (b) endurecer endpoints ante `tenant=None`; (c) construir la impersonación.

## Regla operativa
> CAJERO → solo POS (leer catálogo + crear ventas + `ENTRADA` si `lead_cashier`).
> ADMIN → su tenant.
> SUPERADMIN → solo plataforma; datos de un tenant **solo** por impersonación.

## Tareas derivadas
[[PRODUCTS-20260802-viewsets-sin-permiso]] · [[REPORTS-20260802-endpoints-500-tenant-none]] · [[SUPERADMIN-20260802-impersonar-tenant]]

## Enlaces
[[patron-permisos-roles]] · [[ADR-G-20260802-tenancy-isolation]]
