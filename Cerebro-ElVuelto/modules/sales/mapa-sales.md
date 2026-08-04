---
tags: [modulo, mapa]
status: vivo
module: sales
updated: 2026-08-02
---

# Sales — Mapa de código

Tabla `archivo:línea | qué hace | notas`. Rutas relativas a cada repo (`el_vuelto_backend/`, `el_vuelto_frontend/src/`).

## Backend — `apps/sales/`

| archivo:línea | qué hace | notas |
|---|---|---|
| `models.py:10-12` | `PaymentMethod` TextChoices | `EFECTIVO`, `NEQUI_TRANSFERENCIA` (solo 2 métodos) |
| `models.py:15-45` | Modelo `Sale` (hereda `TenantMixin`) | UUID PK, `codigo` autogenerado, FK `user` PROTECT, `total`/`monto_recibido`/`cambio` Decimal(10,2), `ordering=-created_at`, `db_table=sales` |
| `models.py:35-42` | `Sale.save()` genera `codigo` | 7 chars `[A-Z0-9]`, loop hasta unicidad (check-then-save, sin lock) |
| `models.py:48-67` | Modelo `SaleItem` (`models.Model`, **NO** TenantMixin) | FK `sale` CASCADE `related_name=items`, FK `product` PROTECT, `product_nombre` snapshot(200), `cantidad` IntegerField, `db_table=sale_items` |
| `serializers.py:13-17` | `SaleItemInputSerializer` (input) | Solo `product` (UUID) + `cantidad` (min_value 1). **No acepta `precio_unitario`** |
| `serializers.py:20-30` | `SaleItemSerializer` (output) | ModelSerializer: id, product, product_nombre, precio_unitario, cantidad, subtotal |
| `serializers.py:33-52` | `SaleSerializer` (output) | Añade `user_nombre` (source `user.nombre`), `items` read_only; `read_only_fields`: id/codigo/tenant/user/total/cambio/created_at |
| `serializers.py:55-162` | `SaleCreateSerializer` (`serializers.Serializer`) | Orquesta la venta atómica |
| `serializers.py:67-76` | `validate()` | Si `EFECTIVO` exige `monto_recibido` **pero NO valida `monto_recibido >= total`** ⚠️ |
| `serializers.py:78-104` | `_resolve_products()` | 1 query `filter(id__in, tenant, activo=True).select_for_update()`; valida stock solo `CON_CODIGO` |
| `serializers.py:106-162` | `create()` `@transaction.atomic` | Recalcula `total` con Decimal server-side; `cambio = recibido - total`; crea Sale+SaleItem; `CON_CODIGO`→`InventoryMovement SALIDA_VENTA` (cantidad negativa) + `Product.update(stock=F()-cant)` |
| `views.py:11-65` | `SaleViewSet` | Mixins Create+Retrieve+List sobre `GenericViewSet`. **No** usa `TenantModelViewSet` |
| `views.py:23-26` | `get_permissions()` | `create`→`IsCajero`; resto→`IsAdmin` |
| `views.py:28-53` | `get_queryset()` | Filtra `tenant=request.tenant` **a mano** + query params fecha/metodo/user/search(Q codigo|user.nombre) |
| `views.py:55-58` | `get_serializer_class()` | create→`SaleCreateSerializer`; else→`SaleSerializer` |
| `views.py:60-65` | `create()` override | Valida, `save()`, devuelve `SaleSerializer` (201) |
| `urls.py:5-8` | Router `DefaultRouter` reg `""` basename `sale` | Montado en `elvuelto/urls.py:12` → `/api/sales/` |
| `admin.py:6-20` | `SaleAdmin` + `SaleItemInline` | Todo read-only en admin |
| `migrations/0001` | Crea `Sale` + `SaleItem` | |
| `migrations/0002` | Añade FKs user/product/sale | |
| `migrations/0003` | Añade `codigo` en 3 pasos (nullable→backfill→unique) | |

## Frontend — `features/sales/`

| archivo:línea | qué hace | notas |
|---|---|---|
| `PosPage.tsx:38-453` | Pantalla POS principal (ruta `/pos`, rol CAJERO) | Layout 2 paneles; catálogo/búsqueda/escáner + carrito/pago |
| `PosPage.tsx:73` | `totalVenta` = reduce float `precioUnitario*cantidad` | ⚠️ float, ver [[dinero-y-guard-monto]] |
| `PosPage.tsx:104-117` | `handleAddProduct` → `addItem` | `precioUnitario: parseFloat(p.precio_venta)` (:110) |
| `PosPage.tsx:189-250` | Listener global de escáner | buffer + idle 300ms; ignora si foco en INPUT/TEXTAREA/SELECT; `code.length<3` se descarta (:198); `console.log` vivo (:231) |
| `PosPage.tsx:252-273` | `handleCobrar` | Bloquea carrito vacío (:253); `montoEfectivo = montoRecibido ?? totalVenta`; payload manda `precio_unitario` como **number** (:264) |
| `PosPage.tsx:275-278` | `cobrarDisabled` | EFECTIVO: `montoRecibido===null || montoRecibido < totalVenta` (guard solo en front) |
| `SalesHistoryPage.tsx:85-282` | Historial (ruta `/ventas`, rol ADMIN) | Filtros search/fecha; **paginación en cliente 20/pág** (:12,102-106) |
| `SalesHistoryPage.tsx:28-82` | `SaleReceiptModal` interno | Reusa `ReceiptPreview` + `printReceipt` |
| `posSlice.ts:3-10` | `CartItem` interface | `precioUnitario: number` (:6) |
| `posSlice.ts:12-22` | `PosState` + initial | `montoRecibido: number \| null`, `metodoPago` default `EFECTIVO` |
| `posSlice.ts:28-35` | `addItem` | Si existe suma +1, si no push cantidad 1 |
| `posSlice.ts:39-48` | `updateQuantity` | `cantidad<=0` elimina el item |
| `posSlice.ts:49-53` | `clearCart` | Resetea items + montoRecibido + metodoPago |
| `salesApi.ts:3-9` | Tipo `SaleItem` | `precio_unitario`/`subtotal` = **string** |
| `salesApi.ts:11-22` | Tipo `Sale` | `total`/`monto_recibido`/`cambio` = **string** (monto/cambio en realidad `string\|null`) |
| `salesApi.ts:24-28` | Tipo `CreateSaleArgs` | `monto_recibido: number`, items con `precio_unitario: number` |
| `salesApi.ts:39-48` | `listSales` query | Normaliza array y `{results}` (:44-45); `providesTags:['Sale']`; `keepUnusedDataFor:60`. **No pasa `page`** |
| `salesApi.ts:49-51` | `getSale` query | `/sales/{id}/` |
| `salesApi.ts:52-55` | `createSale` mutation | Invalida `Sale`+`InventoryMovement`+`Product` |
| `components/CartPanel.tsx` | Panel carrito | Lista `CartItem` + slot `children` (PaymentSection) |
| `components/CartItem.tsx:32-196` | Fila de carrito + numpad flotante | `-` a cantidad 1→0 elimina; edición numérica vía portal |
| `components/CashInputModal.tsx:34-176` | Modal efectivo | `parseInt(display,10)` (:37) — **sin centavos**; `isEnough = amount>=total` (:38); tope 9_999_999 |
| `components/PaymentSection.tsx:17-90` | Métodos de pago + vuelto | `vuelto = max(0, montoRecibido-totalVenta)` (:27-30) solo EFECTIVO |
| `components/SuccessModal.tsx:18-201` | Modal éxito | `cambio = parseFloat(sale.cambio)`; imprimir + WhatsApp |
| `components/ReceiptPreview.tsx:23-133` | Vista de recibo | `parseFloat` de total/subtotal/monto_recibido (`?? '0'` guard null) |
| `components/SearchBar.tsx:11-47` | Barra de búsqueda/escáner | En Enter pasa el valor DOM vivo (evita estado stale) |
| `components/InventoryEntryPanel.tsx` | Panel de entrada de inventario (modo `inventory`) | Solo para lead cashier; usa `inventoryApi` → ver `[[sales--inventory]]` |
| `components/ProductGrid.tsx` / `CatalogGrid.tsx` / `CategoryChips.tsx` | Grillas de catálogo POS | Consumen `PosProduct` de `productsApi` |
| `pos.css` | Estilos POS (clases `pos-*`) | ⚠️ **NO** usa `ta-*`; CSS propio. `SalesHistoryPage` sí usa `ta-*` |

## Utilidades cruzadas usadas
- `utils/formatCOP.ts` — `Math.round` + puntos de miles (sin centavos).
- `utils/printReceipt.ts` + `utils/generateReceipt.ts` — recibo térmico 80mm (jsPDF/HTML).
- `features/products/productsApi.ts` — `PosProduct` (`GET /products/pos/`) alimenta el catálogo.
- `features/inventory/inventoryApi.ts` — modo inventario del POS (lead cashier).
