---
tags: [conexion, products, sales]
status: vivo
updated: 2026-08-02
---

# Conexión — products ↔ sales

## Contrato: la venta referencia y "congela" el producto
- `SaleItem.product` es FK **PROTECT** (`apps/sales/models.py:51-55`): no se puede borrar un producto que tenga ventas.
- `SaleItem.product_nombre` es un **snapshot** del nombre al momento de la venta (`sales/models.py:56`) → el historial sobrevive a renombres. Reports usa este snapshot (ver [[sales--reports]]).
- El **precio es autoritativo del servidor**: `SaleCreateSerializer.create` toma `product.precio_venta` al vender (`sales/serializers.py:118-121`); el input de venta solo manda `product` + `cantidad` (`serializers.py:13-17`). Ver [[patron-formato-cop]].

## Stock
El descuento de stock por venta (solo `CON_CODIGO`) se detalla en [[sales--inventory]] y [[products--inventory]].

## Enlaces
[[sales--inventory]] · [[products--inventory]]
