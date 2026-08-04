---
tags: [patron, global, dinero, sales]
status: vivo
updated: 2026-08-02
---

# Patrón — Dinero (COP) y precisión decimal

> [!warning] LÉEME SI VAS A TOCAR: cualquier cosa con precios, totales o pagos. Es un POS: la plata importa.

## Backend (autoritativo)
- Dinero = `DecimalField(max_digits=10, decimal_places=2)`: `Sale.total/monto_recibido/cambio` (`sales/models.py:23-26`), `Product.precio_venta/precio_costo` (`products/models.py:41-42`), etc.
- **El total lo calcula el servidor**, no el cliente: `SaleCreateSerializer.create` recalcula `total` desde `product.precio_venta` (`sales/serializers.py:118-121`). El input de venta (`SaleItemInputSerializer` `sales/serializers.py:13-17`) SOLO acepta `product` + `cantidad` → **el precio que manda el front se ignora** (buena propiedad de seguridad; documentarla).
- Del cliente solo entra `monto_recibido` (efectivo entregado), que afecta `cambio = monto_recibido - total` (`serializers.py:124-125`).

## Front (display + payload)
- Respuestas de la API traen montos como **string** (`salesApi.ts:15-21`, `Product.precio_venta:string`).
- El front los baja a **number**: `parseFloat(p.precio_venta)` (`PosPage.tsx:110`), suma en float `totalVenta` (`PosPage.tsx:73`).
- `formatCOP(value:number)` = `Math.round` + puntos de miles (`utils/formatCOP.ts`): solo display, redondea a peso entero.
- `CashInputModal` usa `parseInt` → `monto_recibido` en efectivo es entero (`CashInputModal.tsx:37`).

## Riesgos
- Asimetría **string (respuesta) ↔ number (request)** contra `DecimalField`. Para COP entero el riesgo es bajo; si algún día hay centavos, float IEEE-754 puede introducir artefactos.
- **Falta guard `monto_recibido >= total` en el backend** (`sales/serializers.py:67-76`): el API acepta cambio negativo; solo el front lo bloquea (`PosPage.tsx:275-278`). Ver [[SALES-20260802-guard-monto-recibido]] y el riesgo del módulo sales.

## Enlaces
[[patron-errores-drf-rtk]] · [[sales--inventory]]
