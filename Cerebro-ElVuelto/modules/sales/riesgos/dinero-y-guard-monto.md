---
tags: [modulo, riesgo, sales, dinero]
status: parcial
module: sales
severidad: alta
updated: 2026-08-04
---

> [!info] Actualización 2026-08-04 — apareció (y se cerró) un segundo caso de la misma familia
> El chequeo de stock se hacía **línea por línea**, así que repetir el mismo producto en varios ítems lo evadía y dejaba `stock_actual` negativo (sobreventa). Cerrado en [[RUN-20260804-items-duplicados-sobreventa]]: `_resolve_products` agrega por `product_id` antes de comparar.
> **La regla que dejan los dos juntos:** el servidor no confía ni en el **monto** ni en la **forma** del payload. Al revisar cualquier validación nueva de ventas, preguntate *"¿qué pasa si el cliente manda esto dos veces?"*.

# Riesgo — Dinero (number↔Decimal) y falta de guard `monto_recibido >= total`

**ID:** `SALES-20260802-dinero-guard-monto`
**Severidad:** 🔴 alta (integridad monetaria en el corazón del POS)

> [!decision] Parte A 🟢 RESUELTA 2026-08-03 · Parte B 🔴 abierta
> **A) Guard `monto_recibido >= total`:** cerrado por [[PROMPT-FIX-SALES-20260803-guard-monto-recibido]] ([[RUN-20260803-guard-monto-recibido]]). El guard vive en `SaleCreateSerializer.create()` (tras el `total`, antes de `cambio`); EFECTIVO con `monto_recibido < total` → **400** por campo; NEQUI intacto. Verificado en shell (insuficiente/exacto/sobra/NEQUI). El snippet de abajo describe el bug **previo**.
> **B) Dinero como float en el front:** sigue 🔴 (ver más abajo) — se atará a un prompt de front (POS) junto con el surface del 400.

## Resumen
Dos problemas relacionados con el manejo de dinero en la venta:

### A) El backend NO valida `monto_recibido >= total` (crítico)
`SaleCreateSerializer.validate` (`serializers.py:67-76`) solo comprueba que, si `metodo_pago == EFECTIVO`, `monto_recibido` no sea `None`. **No hay piso.** Luego:

```
# serializers.py:124-125
if metodo_pago == PaymentMethod.EFECTIVO and monto_recibido is not None:
    cambio = monto_recibido - total
```

Si `monto_recibido < total`, `cambio` sale **negativo** y se persiste tal cual en `Sale.cambio`. La única barrera es el front:
- `PosPage.tsx:277-278` → `cobrarDisabled` cuando `montoRecibido < totalVenta`.
- `CashInputModal.tsx:38` → `isEnough = amount >= total` (solo colorea).

Cualquier `POST /api/sales/` directo (Postman, script, bug de front, otra app) crea una venta con vuelto negativo y total pagado insuficiente, sin error.

### B) Dinero como `number`/float en el front vs `Decimal` en el back (medio)
- `precio_venta` llega como **string** de la API (`PosProduct.precio_venta`, `productsApi.ts:42`) y se convierte con `parseFloat` a `number` (`PosPage.tsx:110`), guardado en `CartItem.precioUnitario: number` (`posSlice.ts:6`).
- `totalVenta` es un `reduce` de floats (`PosPage.tsx:73`).
- `CashInputModal` usa `parseInt(display,10)` (`CashInputModal.tsx:37`) → **descarta centavos**.
- El backend recalcula `total`/`subtotal` con `Decimal` (`serializers.py:118-121,138`), autoritativo.

El total del backend es correcto; el riesgo es que el **total/vuelto mostrado** al cajero y el guard `montoRecibido < totalVenta` usan floats, así que con precios decimales podrían diferir por centavos del `cambio` real que calcula el backend con `Decimal`.

## Evidencia
- Falta de guard: `apps/sales/serializers.py:67-76`, `serializers.py:124-125`.
- Guard solo front: `features/sales/PosPage.tsx:277-278`, `components/CashInputModal.tsx:38`.
- Float/parse: `PosPage.tsx:73,110`, `posSlice.ts:6`, `CashInputModal.tsx:37`, `utils/formatCOP.ts` (`Math.round`).
- Decimal server-side: `serializers.py:118-121,138`.

## Impacto
- Ventas con `cambio` negativo → cuadre de caja y reportes falseados (`[[sales--reports]]`).
- Descuadre de centavos entre lo mostrado y lo guardado si aparecen precios con decimales.

## Mitigación propuesta (NO se aplica aquí — va a backlog)
1. En `validate()`: si `EFECTIVO`, recalcular/exigir `monto_recibido >= total` y devolver 400 por campo. (Requiere el `total` en validate; hoy se calcula recién en `create`.)
2. Considerar validar también en `create` antes de persistir `cambio`.
3. Estandarizar dinero: enteros COP o `Decimal` consistente; evitar `parseFloat`/`parseInt` para montos que se comparan con el total.

## Preguntas ligadas
- [[preguntas-sales]] P-1 (¿guard intencional?), P-2 (¿enteros o decimales?).
