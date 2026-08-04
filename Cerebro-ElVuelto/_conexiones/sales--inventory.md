---
tags: [conexion, sales, inventory]
status: vivo
updated: 2026-08-02
---

# Conexión — sales ↔ inventory

## Contrato: la venta descuenta stock (atómico)
Al crear una venta, por cada `SaleItem` cuyo producto sea `CON_CODIGO`, `SaleCreateSerializer.create` (`apps/sales/serializers.py:150-160`), dentro de `@transaction.atomic`:
1. Crea un `InventoryMovement` con `tipo_movimiento=SALIDA_VENTA` y `cantidad` **negativa**.
2. Actualiza `Product.stock_actual` con `F("stock_actual") - cantidad` (evita race conditions).
Antes, `_resolve_products` bloquea las filas con `select_for_update()` y valida stock suficiente (`serializers.py:78-104`).

## `SALIDA_VENTA` es system-only
`InventoryMovementSerializer.validate_tipo_movimiento` (`apps/inventory/serializers.py:31-36`) **rechaza** que se cree `SALIDA_VENTA` manualmente por el endpoint de inventario. Solo la venta lo crea.

## Front — invalidación de tags
`createSale` invalida `Sale`, `InventoryMovement` y `Product` (`salesApi.ts:54`) → stock y movimientos se refrescan solos tras vender.

## Reglas
- Nunca crear `SALIDA_VENTA` fuera del flujo de venta.
- Nunca mutar `stock_actual` sin `F()` (ver [[products--inventory]]).

## Enlaces
[[patron-formato-cop]] · productos `SIN_CODIGO` no trackean stock.
