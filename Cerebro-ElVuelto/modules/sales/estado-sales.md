---
tags: [modulo, estado]
status: vivo
module: sales
updated: 2026-08-02
---

# Sales — Estado

**Semáforo:** 🟢 documentado
**App back:** `apps/sales` (329 LOC py) · **Feature front:** `features/sales` (~2032 LOC) · **Complejidad:** 🔴 alta (corazón del sistema: venta atómica + stock + dinero)

## Punteros
- Código: [[mapa-sales]] · Endpoints: [[contratos-sales]] · Datos: [[datos-sales]] · Formularios: [[formularios-sales]]
- Preguntas abiertas: [[preguntas-sales]]
- Riesgos: [[dinero-y-guard-monto]] · [[paginacion-historial-tope-50]] · [[tenant-filter-manual-y-superadmin]]
- Conexiones: `[[sales--inventory]]` · `[[sales--reports]]` · `[[sales--products]]`

## Qué es (3-5 líneas)
Registra la venta POS completa en **una sola transacción atómica** (`SaleCreateSerializer.create` en `serializers.py:106-162`): calcula el total del lado servidor con `Decimal`, crea `Sale` + `SaleItem`, y para productos `CON_CODIGO` genera un `InventoryMovement SALIDA_VENTA` y descuenta `stock_actual` con `F()`. El frontend (`PosPage.tsx`) es una caja táctil con carrito Redux (`posSlice`), escáner de código de barras global, modal de efectivo y recibo imprimible. El historial (`SalesHistoryPage.tsx`) lo consulta solo ADMIN.

## Cómo fluye una venta
1. Cajero agrega productos al carrito (`posSlice.addItem`) por click, búsqueda o escáner.
2. Elige método de pago; si `EFECTIVO` abre `CashInputModal` para el monto recibido.
3. `handleCobrar` (`PosPage.tsx:252`) llama `createSale` → `POST /api/sales/`.
4. Backend valida stock (solo `CON_CODIGO`), recalcula total, persiste y descuenta stock.
5. `SuccessModal` muestra vuelto + recibo; el carrito se limpia.

## Pendientes / drift doc↔código
- 🔴 **Sin guard `monto_recibido >= total` en el backend** para EFECTIVO → `cambio` negativo persistible por API directa. Ver [[dinero-y-guard-monto]].
- 🔴 **Historial tope 50**: `SaleViewSet` pagina por defecto (PAGE_SIZE 50) pero `SalesHistoryPage` pagina en cliente 20/pág y nunca pide `page` al server → ventas > 50 inalcanzables. Ver [[paginacion-historial-tope-50]].
- 🟡 **`TenantMixin` NO auto-filtra QuerySets** (mentira del CLAUDE.md raíz): es solo un FK abstracto (`tenants/models.py:58-68`). `SaleViewSet` filtra tenant a mano (`views.py:29`), no usa `TenantModelViewSet`. Ver [[tenant-filter-manual-y-superadmin]].
- 🟡 **`precio_unitario` que el front manda en cada item se ignora** en el backend (`SaleItemInputSerializer` solo acepta `product`+`cantidad`). Ver [[formularios-sales]].
- 🟡 Tipos TS `Sale.monto_recibido` / `Sale.cambio` declarados `string` no-null, pero el backend devuelve `null` (NEQUI). Ver [[formularios-sales]].
- ⚪ `console.log` de depuración vivo en el listener de escáner (`PosPage.tsx:231`).
