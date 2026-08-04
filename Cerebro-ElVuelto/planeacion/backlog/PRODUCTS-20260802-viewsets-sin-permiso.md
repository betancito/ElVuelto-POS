---
tags: [tarea, products, seguridad]
status: 🟢
prioridad: alta
updated: 2026-08-02
---

# PRODUCTS-20260802-viewsets-sin-permiso — Escalada de privilegios en products/categories

**Tipo:** seguridad (escalada de privilegios) · **Descubierto:** auditoría de módulos 2026-08-02

## Problema
`CategoryViewSet` (`apps/products/views.py:13`) y `ProductViewSet` (`:39`) **no declaran `permission_classes`** → caen en el default DRF `IsAuthenticated` (`settings/base.py:97-99`). Es decir, **cualquier usuario autenticado, incluido un CAJERO, puede crear/editar/borrar productos y categorías** por API. El `CLAUDE.md` documenta `IsAdmin`, pero el código **no lo aplica**. Solo la acción `pos` tiene `IsCajero` (`:70`). Ver `modules/products/riesgos/permisos-viewsets-sin-isadmin`.

## Criterio de aceptación
Solo ADMIN/SUPERADMIN pueden mutar productos y categorías (un CAJERO recibe 403). La acción `pos` sigue accesible al cajero.

## Notas para el Dev
- Añadir `permission_classes = [IsAdmin]` a ambos viewsets, o `get_permissions()` que deje `pos` en `IsCajero` y el resto en `IsAdmin`.
- Verificar que el POS del cajero consuma `GET /products/pos/` (acción), no `list`.
- Doble actualización: `backend/CLAUDE.md` (Products) — ya dice IsAdmin, pero confirmar tras el fix.

## Decisión del owner (2026-08-02)
Confirmado: el CAJERO **no** debe modificar el catálogo; en el POS solo lo toca (solo-lectura, `GET /products/pos/`) y va al carrito. → `IsAdmin` en el CRUD de products/categories. Ver [[ADR-G-20260802-modelo-de-acceso-por-rol]]. **Prioridad 🔒 alta.**

## Resuelto (2026-08-02) 🟢
Cerrado en dos corridas: (1) `IsAdmin` en products/categories ([[RUN-20260802-permisos-isadmin]]) — falló por bloquear la lectura de categorías del cajero; (2) [[RUN-20260802-categorias-read-cajero]] — `get_permissions` en `CategoryViewSet` deja al cajero leer y bloquea escritura. Products viewsets restringidos, POS del cajero intacto.
