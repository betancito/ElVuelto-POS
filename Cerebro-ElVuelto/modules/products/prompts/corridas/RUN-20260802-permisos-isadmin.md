---
tags: [corrida, products, review]
status: cerrado
module: products
updated: 2026-08-02
---

# RUN 2026-08-02 — PROMPT-FIX-PRODUCTS-…-permisos-isadmin

**Prompt:** [[PROMPT-FIX-PRODUCTS-20260802-permisos-isadmin]] · **Veredicto:** 🔴 FALLÓ (regresión) · **Fix:** [[PROMPT-FIX-PRODUCTS-20260802-categorias-read-cajero]]

## Qué hizo el Dev (git diff working tree)
- `apps/products/views.py`: `from apps.users.permissions import IsAdmin, IsCajero`; `permission_classes = [IsAdmin]` en `CategoryViewSet` (:14) y `ProductViewSet` (:41). Acción `pos` intacta (sigue `IsCajero`).
- `backend/CLAUDE.md` (Products): cambió `categories list/retrieve` de `IsAuthenticated` a `IsAdmin` (doble actualización).

## Review del Planner
- ✅ La restricción de **products** es correcta y mínima: `ProductViewSet` = `IsAdmin`, y el cajero lee el catálogo por la acción `pos` (`IsCajero`), no por `list`. La escalada de privilegios del cajero sobre **productos** queda cerrada.
- 🔴 **Regresión:** `CategoryViewSet` = `[IsAdmin]` bloquea también la **lectura**. El POS del cajero llama `GET /api/products/categories/` (`el_vuelto_frontend/src/features/sales/PosPage.tsx:10,66` — `useListCategoriesQuery`). Un cajero real recibe **403** → las *category chips* del POS se rompen (`CategoryChips` queda vacío) y el filtro por categoría deja de funcionar.
- Causa raíz: el prompt original solo previó preservar la lectura de **productos** (acción `pos`), pero no la de **categorías** (que el POS lee por el `list` normal).

## Decisión
El cajero es **solo-lectura del catálogo** → debe **leer** categorías (para filtrar en el POS) pero **no** crearlas/editarlas/borrarlas. Fix: permisos por acción en `CategoryViewSet`.
