---
tags: [modulo, riesgo, codigo-muerto, feature-incompleta]
status: abierto
module: products
severidad: medio
updated: 2026-08-02
---

# Riesgo — Borrado/desactivación de producto y categoría inalcanzable en la UI

**Ancla:** `features/products/ProductsPage.tsx:118` y `:555` (`deletingId`), `ConfirmModal` en `:374-381` (producto) y `:707-715` (categoría).

## Qué pasa
Ambas pestañas declaran `const [deletingId, setDeletingId] = useState<string|null>(null)` y renderizan un `ConfirmModal` de borrado condicionado a `deletingId`. Pero **`setDeletingId` nunca se invoca con un id**: las únicas llamadas lo resetean a `null` dentro del propio modal (`:378-379`, `:712-713`). El `onClick` de cada card es `openEdit`, no borrado. No hay botón/ícono que dispare el borrado.

Además, el campo `activo` del producto no se edita en ningún formulario (ver [[formularios-products]]), así que tampoco existe desactivación suave.

## Consecuencia
- El `ConfirmModal` de borrado es **código muerto** (condición siempre falsa).
- Las mutations `deleteProduct`/`deleteCategory` (`productsApi.ts:79`,`:99`) quedan sin consumidor real.
- **No hay forma, desde la pantalla, de eliminar ni desactivar un producto o una categoría.** El único mantenimiento es Django admin.
- Ojo con `PROTECT`: aunque se conectara el borrado, un `Product` con historial en `SaleItem`/`InventoryMovement` daría IntegrityError ([[products--sales]] / [[products--inventory]]) — por eso probablemente convenga desactivar (`activo=False`) en vez de borrar.

## Código muerto adicional (mismo archivo)
- `EditOutlinedIcon` (`import :22`) y `DeleteOutlineIcon` (`import :23`): importados, nunca usados en JSX.
- `ShoppingBagIcon` (`:1432-1440`): componente definido, nunca referenciado.

## Fix sugerido (Dev)
Definir el flujo deseado (P-2 en [[preguntas-products]]): botón de desactivar (`activo=False`, patrón consistente con `?activo=` del back) y/o botón de borrado que llame `setDeletingId(p.id)`. Limpiar imports/componentes muertos.
