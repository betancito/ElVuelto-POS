---
tags: [conexion, products, inventory]
status: vivo
updated: 2026-08-02
---

# Conexión — products ↔ inventory

## `Product.stock_actual` es la fuente de verdad del stock
`stock_actual` (`apps/products/models.py:45`, `IntegerField default 0`) se muta **solo** con `F()` en dos lugares:
1. `InventoryMovementSerializer.create` — `stock_actual += cantidad` (`apps/inventory/serializers.py:59-65`). `cantidad` es positiva para `ENTRADA`, negativa para `SALIDA_VENTA`/`AJUSTE`.
2. `SaleCreateSerializer.create` — `stock_actual -= cantidad` (`apps/sales/serializers.py:158-160`). Ver [[sales--inventory]].

## Solo `CON_CODIGO` trackea stock
Los productos `SIN_CODIGO` no llevan inventario. `StockView` (`inventory/views.py:64-76`) y `StockSerializer` (`bajo_minimo`, `serializers.py:89`) solo consideran `Product` `CON_CODIGO` + `activo`.

## Integridad referencial
- `InventoryMovement.product` es FK **PROTECT** (`inventory/models.py:16-20`) → no se puede borrar un producto con movimientos.
- `SaleItem.product` también es PROTECT.

## Regla
Nunca escribas `stock_actual` con un valor calculado en Python; siempre `F()` para evitar carreras.

## Enlaces
[[patron-formato-cop]]
