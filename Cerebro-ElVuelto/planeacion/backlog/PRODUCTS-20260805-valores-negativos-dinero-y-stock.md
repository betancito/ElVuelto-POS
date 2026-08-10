---
tags: [tarea, products, inventory, sales, dinero, stock, bug]
status: 🟢
prioridad: alta
updated: 2026-08-05
---

> [!done] Cerrado 2026-08-05 — ✅ [[RUN-20260805-valores-negativos]]
> `MinValueValidator(0)` en `precio_venta`, `precio_costo`, `stock_actual` y `stock_minimo` (sin `CheckConstraint`: cero riesgo de migración fallida), heredado por DRF vía `ModelSerializer`. El stock no puede quedar negativo por ningún movimiento, con `select_for_update()` dentro de la transacción y un 400 que dice el disponible. Cero permitido a propósito. Verificado 10/10, incluido `full_clean()` desde el shell.

# 🔒 PRODUCTS-20260805-valores-negativos-dinero-y-stock — Ni el dinero ni el stock tienen piso

**Tipo:** bug (integridad monetaria y de inventario) · **Descubierto:** [[auditoria-adversarial-20260805]] · **Verificado por el Planner de punta a punta**

Los campos numéricos del modelo **no tienen validadores de mínimo**. `precio_venta` solo lleva el `DecimalValidator` que Django agrega por `max_digits`/`decimal_places` — nada que impida un negativo.

## 1. 🔒 Un precio negativo hace que la caja **entregue** plata

Verificado ejecutando, de punta a punta:
```
POST /api/products/  {"precio_venta": "-50000.00", ...}   → 201 CREADO
POST /api/sales/     {"monto_recibido": "0.00", items:[ese producto ×1]}
   → 201 | total: -50000.00 | cambio: 50000.00
```
El servidor acepta la venta y le dice al cajero que **entregue $50.000 de cambio** por una venta que no cobró nada. El guard de `monto_recibido >= total` se cumple sin problema: `0 >= -50000`.

Basta un error de tipeo del admin al cargar un producto (un `-` de más) para que la caja empiece a regalar plata.

## 2. Un `AJUSTE` deja el stock bajo cero

Verificado:
```
producto con stock_actual = 5
POST /api/inventory/movements/  {"tipo_movimiento": "AJUSTE", "cantidad": -99}  → 201
stock_actual quedó en: -94
```
[[SALES-20260804-items-duplicados-sobreventa]] cerró la sobreventa **por el camino de ventas** — `_resolve_products` agrega por producto y aguantó todos los ataques, incluidas dos ventas concurrentes. Pero inventory tiene su propia puerta y no valida el resultado.

## Criterio de aceptación
1. No se puede crear ni editar un producto con `precio_venta` (o `precio_costo`) negativo → **400** por campo.
2. Una venta nunca produce `total` o `cambio` negativos.
3. Un movimiento de inventario no puede dejar `stock_actual` por debajo de cero → **400** con un mensaje que diga el stock disponible.
4. Los datos existentes siguen funcionando (ver la nota de abajo).

## Notas para el Dev
- ⚠️ **Mirá primero si hay filas que ya violan la regla** antes de meter un `CheckConstraint`: una migración que falle a mitad en producción es peor que el bug. Si las hay, decidí (limpiar, o quedarte en validación de serializer) y **reportalo**.
- La defensa en profundidad es la misma lección de [[auditoria-adversarial-20260805]]: validar en el serializer **y** en el modelo (`MinValueValidator`), porque los comandos de management y el `/admin/` no pasan por DRF.
- El stock negativo puede ser legítimo de corregir hacia arriba: la regla es sobre el **resultado**, no sobre el signo de la cantidad (un `AJUSTE` negativo está bien mientras no deje el stock bajo cero).
- Doble actualización: `el_vuelto_backend/CLAUDE.md`.
