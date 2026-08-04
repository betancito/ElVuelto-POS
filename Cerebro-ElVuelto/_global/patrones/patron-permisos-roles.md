---
tags: [patron, global, permisos, roles]
status: vivo
updated: 2026-08-02
---

# Patrón — Roles y permisos

> [!warning] LÉEME SI VAS A TOCAR: cualquier vista con `permission_classes` o control por rol.

## Roles
`UserRole` (`apps/users/models.py:7-10`): `SUPERADMIN`, `ADMIN`, `CAJERO`. Campo `User.rol` default `CAJERO` (`models.py:44`).

## Clases de permiso (`apps/users/permissions.py`) — JERÁRQUICAS
| Clase | Permite | Línea |
|---|---|---|
| `IsSuperAdmin` | solo SUPERADMIN | `:6-12` |
| `IsAdmin` | ADMIN + SUPERADMIN | `:15-23` |
| `IsCajero` | CAJERO + ADMIN + SUPERADMIN | `:26-34` |

Default DRF global: `IsAuthenticated` (`settings/base.py:97-99`).

## Dónde se aplica (mapa rápido)
- **tenants:** `IsSuperAdmin` (todo el CRUD). `check-by-slug` es `AllowAny`.
- **users:** `IsAdmin` (`users/views.py:83`).
- **products/categories:** `IsAdmin` por defecto; acción `pos` es `IsCajero` (`products/views.py:70`).
- **inventory:** list `IsAdmin`, create `IsCajero` con sub-regla `lead_cashier` (`inventory/views.py:27-40`).
- **sales:** create `IsCajero`, list/retrieve `IsAdmin` (`sales/views.py:23-26`).
- **reports:** `IsAdmin` (todas las APIView).

## Gotchas
- `IsCajero` **también** deja pasar ADMIN y SUPERADMIN (es el más permisivo). No asumas "solo cajero".
- Un SUPERADMIN pegándole a un endpoint tenant-scoped tiene `tenant=None` → resultado vacío o `PermissionDenied` (ver [[patron-tenancy]]).
- **`lead_cashier`** (`User.lead_cashier` `models.py:46`): sub-flag de cajero. Habilita registrar `ENTRADA` de inventario (`inventory/views.py:34-39`). No documentado en los CLAUDE.md → ver [[DOCS-20260802-corregir-claudemd-drift]].

## Modelo de acceso (decisión owner — [[ADR-G-20260802-modelo-de-acceso-por-rol]])
- **CAJERO = solo POS:** leer catálogo (`GET /products/pos/`) + crear ventas + `ENTRADA` de inventario solo si `lead_cashier`. **No** crea/edita/borra productos, categorías ni usuarios.
- **ADMIN = su tenant.**
- **SUPERADMIN = solo plataforma** (tenants, usuarios SA, billing). **No** accede a datos operativos de un tenant salvo por **impersonación** ([[SUPERADMIN-20260802-impersonar-tenant]]). Endpoints tenant-scoped con `tenant=None` → **403**.
- ⚠️ Hoy el código NO cumple del todo: products viewsets sin `IsAdmin` ([[PRODUCTS-20260802-viewsets-sin-permiso]]) y reports da 500 con `tenant=None` ([[REPORTS-20260802-endpoints-500-tenant-none]]).

## Enlaces
[[patron-tenancy]] · [[patron-jwt-refresh]]
