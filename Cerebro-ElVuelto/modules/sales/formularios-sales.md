---
tags: [modulo, formularios, auditoria]
status: vivo
module: sales
updated: 2026-08-02
---

# Sales — Auditoría de formularios

> [!warning] El módulo `sales` **NO usa React Hook Form ni Zod** en ningún lado. La "venta" no es un `<form>`: es estado Redux (`posSlice`) + envío imperativo (`PosPage.handleCobrar`). Las validaciones viven en handlers/JS plano y en el backend. Esto se documenta explícito por cada bloque.

---

## 1. Venta POS (creación de `Sale`) — `PosPage.tsx`

- **Componente:** `features/sales/PosPage.tsx:38` · **Modo:** solo crear.
- **Schema Zod:** ❌ **NINGUNO.** El "estado del formulario" es el slice Redux `pos` (`posSlice.ts:12-16`): `items[]`, `metodoPago`, `montoRecibido`. No hay `zodResolver`, ni `RHF`, ni `defaultValues`/`reset`.
- **Validación en su lugar:**
  - Carrito no vacío: `handleCobrar` retorna si `items.length === 0` (`PosPage.tsx:253`) y `cobrarDisabled` deshabilita el botón (`:276`).
  - EFECTIVO exige monto ≥ total: `cobrarDisabled` (`PosPage.tsx:277-278`) + `CashInputModal.isEnough` (`CashInputModal.tsx:38`). **Solo en front.**
- **Estructura dinámica:** el panel de pago (`PaymentSection`) muestra el bloque de efectivo (recibido/vuelto) solo si `metodoPago === 'EFECTIVO'` (`PaymentSection.tsx:56`). Modo `inventory` (lead cashier) reemplaza el carrito por `InventoryEntryPanel` (`PosPage.tsx:406`) — pertenece a `[[sales--inventory]]`.
- **Submit:** `handleCobrar` (`PosPage.tsx:252`) → `createSale` mutation (`salesApi.ts:52`) → `POST /api/sales/`. Transformaciones: `montoEfectivo = metodoPago==='EFECTIVO' ? (montoRecibido ?? totalVenta) : totalVenta` (`:255-256`); items → `{ product, cantidad, precio_unitario:number }` (`:261-265`). Respuesta: `setLastSale`, `clearCart()`, abre `SuccessModal`.
- **Errores del servidor:** ⚠️ el `catch` es **genérico** (`PosPage.tsx:270-272`): pinta un banner fijo `"Hubo un error al registrar la venta..."`. **Los errores por campo del 400 (stock insuficiente, producto inactivo, monto requerido) se PIERDEN** — el cajero no ve cuál producto quedó sin stock. No hay `setError` (no hay RHF).

### Matriz de paridad por campo

| campo | validación front | tipo TS (payload) | serializer DRF | modelo Django | constraint BD | ⚠️ divergencia |
|---|---|---|---|---|---|---|
| `items` | `length===0` bloquea | `{product,cantidad,precio_unitario}[]` | `SaleItemInputSerializer(many, min_length=1)` `serializers.py:58` | vía `SaleItem` | — | front nunca manda vacío |
| `items[].product` | id de `PosProduct` | `string` (uuid) | `UUIDField` `serializers.py:16` | FK Product PROTECT | FK | OK |
| `items[].cantidad` | numpad `>0`, `<=0` elimina (`posSlice.ts:42`) | `number` | `IntegerField(min_value=1)` `serializers.py:17` | `IntegerField` | — | OK |
| `items[].precio_unitario` | `parseFloat(precio_venta)` (`PosPage.tsx:110`) | `number` | **NO existe** en input serializer | snapshot `product.precio_venta` server-side | — | 🔴 **el front lo manda y el back lo IGNORA** (`serializers.py:13-17` vs `121`) |
| `metodo_pago` | toggle Efectivo/Nequi | `'EFECTIVO'\|'NEQUI_TRANSFERENCIA'` | `ChoiceField` `serializers.py:59` | `CharField(30) choices` | — | OK, enums espejados |
| `monto_recibido` | `CashInputModal` `parseInt` (**sin centavos** `CashInputModal.tsx:37`); guard `>= total` solo front | `number` | `DecimalField(10,2) required=False allow_null` `serializers.py:60-65` | `DecimalField null=True` | — | 🔴 **number(float) ↔ Decimal**; 🔴 **guard `>= total` ausente en back**. Ver [[dinero-y-guard-monto]] |
| `total` | `totalVenta` reduce float (`PosPage.tsx:73`) — **no se envía** | (no en payload) | recalculado `Decimal` `serializers.py:118-121` | `DecimalField` | — | back autoritativo; front solo display |
| `tenant` / `user` | — | (no en payload) | de `request.tenant`/`request.user` `serializers.py:108-110` | FK | — | read_only, correcto |

### Respuesta `Sale` — paridad de tipos (lectura)

| campo | tipo TS (`salesApi.ts`) | realidad backend | ⚠️ divergencia |
|---|---|---|---|
| `total` | `string` (:15) | Decimal→string | OK |
| `monto_recibido` | `string` (:18) | Decimal→string **o `null`** | 🟡 debería ser `string\|null`; se salva con `?? '0'` en `ReceiptPreview.tsx:25` |
| `cambio` | `string` (:19) | Decimal→string **o `null`** | 🟡 idem; `SuccessModal.tsx:19` usa `sale.cambio ? ...` |
| `metodo_pago` | union 2 valores | choices modelo | OK |

---

## 2. Modal de efectivo — `CashInputModal.tsx`

- **Componente:** `CashInputModal.tsx:34` · captura `monto_recibido` (numpad + botones de billetes/monedas).
- **Schema Zod:** ❌ ninguno. Estado local `display: string`.
- **Validación:** `amount = parseInt(display,10)` (`:37`); confirma solo si `amount > 0` (`:56`); tope `9_999_999` (`:43,51`); `isEnough = amount >= total` (`:38`) solo controla el color, **no bloquea** confirmar (bloquea el botón Cobrar aguas arriba).
- ⚠️ `parseInt` descarta decimales → montos en pesos enteros. Consistente con COP sin centavos, pero incoherente con `DecimalField(10,2)`. Ver [[dinero-y-guard-monto]].

## 3. Editor de cantidad (carrito) — `CartItem.tsx`

- **Componente:** `CartItem.tsx:32`, numpad flotante vía `createPortal`.
- **Validación:** `applyQty` aplica solo si `parseInt > 0` (`:64-70`); tope 999 (`:60`); botón `-` a cantidad 1 → 0 → `updateQuantity` elimina (`posSlice.ts:42-43`). Sin Zod.

## 4. Filtros de historial — `SalesHistoryPage.tsx`

- **Componente:** `SalesHistoryPage.tsx:85`. Inputs controlados (`search`, `fechaInicio`, `fechaFin`), no es un form ni Zod.
- Manda a `listSales` con `undefined` cuando están vacíos (`:96-99`). `fecha_*` van como `YYYY-MM-DD` (input `type="date"`) → backend filtra por `created_at__date` (`views.py:38-41`). Fechas sin conversión de zona horaria explícita en front; el backend compara contra `__date` en la TZ del server (`America/Bogota`). ❓ ver [[preguntas-sales]] P-5.
- Paginación **cliente** (20/pág) sobre `allSales` — ver [[paginacion-historial-tope-50]].

---

## ⚠️ Divergencias detectadas

1. 🔴 **`precio_unitario` fantasma en el payload:** front lo envía (`PosPage.tsx:264`, tipado en `CreateSaleArgs` `salesApi.ts:27`) pero `SaleItemInputSerializer` no lo declara (`serializers.py:13-17`) → se descarta. Seguro (precio autoritativo del server) pero es un campo muerto en el contrato. → backlog: quitar del payload/tipo o documentar.
2. 🔴 **Guard `monto_recibido >= total` solo en front** (`PosPage.tsx:277`), ausente en `validate()` (`serializers.py:67-76`). → [[dinero-y-guard-monto]].
3. 🔴 **Dinero como `number`/float en front** (`totalVenta`, `precioUnitario`, `parseInt` en efectivo) frente a `Decimal` en back. → [[dinero-y-guard-monto]].
4. 🟡 **Errores de campo del 400 se pierden** en un banner genérico (`PosPage.tsx:270-272`): el cajero no sabe qué producto falló por stock.
5. 🟡 **Tipos `monto_recibido`/`cambio` declarados `string` no-null** pero el back devuelve `null` (`salesApi.ts:18-19`).

## ❓ Por confirmar
- Ver [[preguntas-sales]] P-1 (¿el guard de monto falta a propósito?), P-5 (zona horaria de filtros de fecha).
