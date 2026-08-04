---
tags: [prompt, products, fix, seguridad]
status: 🔴
updated: 2026-08-02
---

# Prompt DEV (FIX) — Cajero puede LEER categorías (no escribir) en el POS

**Corrige:** [[RUN-20260802-permisos-isadmin]] · **Tarea:** [[PRODUCTS-20260802-viewsets-sin-permiso]] · **Decisión:** [[ADR-G-20260802-modelo-de-acceso-por-rol]]
**Alcance:** UNA cosa (permisos de `CategoryViewSet`). No scope creep. No git.

## Contexto / qué salió mal
El fix anterior puso `permission_classes = [IsAdmin]` en `CategoryViewSet` (`apps/products/views.py:14`), lo que bloqueó **toda** la operación de categorías para el cajero, **incluida la lectura**. Pero el POS del cajero lee categorías: `el_vuelto_frontend/src/features/sales/PosPage.tsx:10,66` (`useListCategoriesQuery` → `GET /api/products/categories/`). Resultado: **403** para el cajero → *category chips* rotas.

El cajero es **solo-lectura del catálogo**: debe **leer** categorías, pero **no** crear/editar/borrar.

## Qué hacer
1. En `CategoryViewSet` (`apps/products/views.py:13`), quitar `permission_classes = [IsAdmin]` y reemplazarlo por permisos **por acción**:
   ```python
   def get_permissions(self):
       if self.action in ("list", "retrieve"):
           return [IsCajero()]   # cajero/admin/superadmin pueden LEER
       return [IsAdmin()]        # create/update/partial_update/destroy/upload_image → solo admin
   ```
   (`IsCajero` ya está importado.)
2. **Dejar `ProductViewSet` como está** (`permission_classes = [IsAdmin]`): el cajero lee productos por la acción `pos` (`IsCajero`), no por `list`. No tocar.

## Restricciones
- Mantener el bloqueo de **escritura** de categorías para el cajero (ese era el objetivo de seguridad).
- No tocar `TenantModelViewSet` ni el filtrado de tenant (el `list` sigue scoped por tenant).

## Entregable / verificación
- Token **CAJERO**: `GET /api/products/categories/` → **200**; `POST /api/products/categories/` → **403**; `PATCH`/`DELETE` categoría → **403**; `GET /api/products/pos/` → **200**.
- Token **ADMIN**: CRUD de categorías completo → 200/201.
- **Front:** abrir el POS como cajero → las *category chips* aparecen y filtran (sin 403 en la pestaña Red).
- **Doble actualización:** `backend/CLAUDE.md` (Products) — ajustar `categories list/retrieve` a **IsCajero** (lectura); `create/update/delete/upload_image` siguen **IsAdmin**. (El fix anterior las había puesto como `IsAdmin`; corregir list/retrieve.)
- Pegar salida REAL + veredicto ✅/🔴.
