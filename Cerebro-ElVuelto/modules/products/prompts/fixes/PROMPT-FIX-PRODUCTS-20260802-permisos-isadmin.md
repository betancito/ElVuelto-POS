---
tags: [prompt, products, fix, seguridad]
status: 🔴
updated: 2026-08-02
---

# Prompt DEV — Restringir products/categories a IsAdmin (cierra escalada de privilegios)

**Tarea backlog:** [[PRODUCTS-20260802-viewsets-sin-permiso]] · **Decisión:** [[ADR-G-20260802-modelo-de-acceso-por-rol]]
**Alcance:** UNA cosa (permisos de estos viewsets). No scope creep. No git.

## Contexto mínimo necesario
- Leer: `apps/products/views.py`, `apps/users/permissions.py`, `backend/CLAUDE.md` (Products), [[patron-permisos-roles]].
- **Bug:** `CategoryViewSet` (`apps/products/views.py:13`) y `ProductViewSet` (`:39`) **no declaran `permission_classes`** → caen en el default `IsAuthenticated` (`settings/base.py:97-99`). Un **CAJERO puede crear/editar/borrar productos y categorías**. Debe ser solo ADMIN/SUPERADMIN.
- **Regla (decisión owner):** el CAJERO es **solo-lectura** del catálogo; en el POS lo consume por `GET /api/products/pos/` (acción `pos`, ya con `IsCajero` a nivel de `@action`, `:70`).

## Qué hacer
1. En `apps/products/views.py`, importar `IsAdmin` de `apps.users.permissions`.
2. Añadir `permission_classes = [IsAdmin]` a `CategoryViewSet` y a `ProductViewSet`.
3. **No tocar** la acción `pos` de `ProductViewSet` (`:70`): su `permission_classes=[IsCajero]` a nivel de `@action` debe seguir permitiendo al cajero leer el catálogo.
4. Verificar que las acciones `upload_image` (que heredan el permiso del viewset) queden en `IsAdmin` — correcto.

## Restricciones
- No cambiar `TenantModelViewSet` ni el filtrado de tenant (ya funciona, ver [[patron-tenancy]]).
- **No tocar inventory:** el flujo de `ENTRADA` del cajero líder (`lead_cashier`) vive en `apps/inventory/views.py:32-40` y no se afecta.
- No modificar la ruta del front (`router.tsx:90` ya restringe a ADMIN).

## Entregable / verificación
- Prueba manual (no hay framework de tests). Con Django shell o httpie/curl:
  - Token **CAJERO**: `POST /api/products/` → **403**; `POST /api/products/categories/` → **403**; `GET /api/products/pos/` → **200**.
  - Token **ADMIN**: `POST /api/products/` → **201**; `GET /api/products/` → **200**.
- Pegar la salida REAL de las pruebas.
- **Doble actualización:** confirmar que `backend/CLAUDE.md` (Products) sigue fiel (ya documenta `IsAdmin`).
- Veredicto ✅/🔴.
