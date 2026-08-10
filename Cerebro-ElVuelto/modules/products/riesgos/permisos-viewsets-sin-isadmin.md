---
tags: [modulo, riesgo, seguridad]
status: resuelto
module: products
severidad: alto
updated: 2026-08-03
---

# Riesgo — Viewsets de products sin `IsAdmin` (cualquier autenticado hace CRUD)

**Estado:** 🟢 RESUELTO 2026-08-03 · **Ancla original:** `apps/products/views.py:13` (`CategoryViewSet`) y `:39` (`ProductViewSet`).

> [!decision] Resuelto — permisos por acción (verificado contra código 2026-08-03)
> Cerrado por [[PROMPT-FIX-PRODUCTS-20260802-categorias-read-cajero]] ([[RUN-20260802-categorias-read-cajero]]). Ojo: el **primer** intento ([[PROMPT-FIX-PRODUCTS-20260802-permisos-isadmin]], [[RUN-20260802-permisos-isadmin]]) puso `[IsAdmin]` plano en `CategoryViewSet` y **rompió** la lectura de categorías del cajero en el POS (⛔); el fix bueno separa lectura/escritura:
> - `CategoryViewSet.get_permissions`: `list`/`retrieve` → `IsCajero`, resto (create/update/partial_update/destroy + `upload_image`) → `IsAdmin` (`views.py:17-22`).
> - `ProductViewSet`: `permission_classes=[IsAdmin]` a nivel clase; solo la acción `pos` sobreescribe a `IsCajero` (`views.py:47,78`).
> - `IsAdmin`=ADMIN/SUPERADMIN, `IsCajero`=CAJERO/ADMIN/SUPERADMIN (`users/permissions.py:15-34`) → el CAJERO **lee** catálogo, **no escribe** (403 en cualquier mutación). El escenario de fallo de abajo ya no aplica.

## Qué pasa
Ninguno de los dos viewsets declara `permission_classes`. Aplica el default DRF `IsAuthenticated` (`settings/base.py:97-99`). La única excepción es la acción `pos` con `permission_classes=[IsCajero]` (`views.py:70`).

Resultado: **cualquier usuario autenticado del tenant — incluido un CAJERO — puede listar, crear, editar y borrar productos y categorías** llamando directamente a `/api/products/` y `/api/products/categories/`, además de subir imágenes.

## Por qué es un riesgo
- El CLAUDE.md del backend documenta explícitamente `IsAdmin` para `create/partial_update/destroy` de productos y categorías. **El código no lo cumple** → mentira de documentación (GOBERNANZA §1).
- La única barrera hoy es el frontend: `ProtectedRoute allowedRoles={['ADMIN']}` (`router.tsx:90`). Eso NO protege la API — un cajero con su JWT puede saltarse el front (Postman, consola).
- Rompe el modelo de roles: un cajero podría alterar precios (`precio_venta`) o borrar catálogo.

## Escenario de fallo
Cajero autenticado (rol `CAJERO`, tenant válido) hace `PATCH /api/products/{id}/ {"precio_venta":"1"}` → 200, precio alterado. O `DELETE /api/products/categories/{id}/` → 204, categoría borrada.

## Fix sugerido (NO aplicar aquí — es del Dev)
Añadir a ambos viewsets algo como `permission_classes = [IsAdmin]` y sobreescribir en `pos` con `IsCajero` (ya lo hace). Confirmar antes con P-1 ([[preguntas-products]]) por si el diseño real quería permitir cajeros.

Relación: contradice [[contratos-products]] (columna "permiso REAL") y el CLAUDE.md backend.
