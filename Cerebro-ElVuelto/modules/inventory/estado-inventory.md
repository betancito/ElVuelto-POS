---
tags: [modulo, estado]
status: vivo
module: inventory
updated: 2026-08-02
---

# Inventory — Estado

**Semáforo:** 🟢 documentado (módulo piloto)
**App back:** `apps/inventory` (~140 LOC: models 43, serializers 90, views 76) · **Feature front:** `features/inventory` (InventoryPage 795 líneas + inventoryApi 51) · **Complejidad:** 🟡 media

## Punteros
- Código: [[mapa-inventory]] · Endpoints: [[contratos-inventory]] · Datos: [[datos-inventory]] · Formularios: [[formularios-inventory]]
- Preguntas abiertas: [[preguntas-inventory]]
- Riesgos: [[errores-servidor-silenciados]] · [[ajuste-stock-negativo]] · [[superadmin-tenant-none]] · [[precio-costo-obligatorio-front]]
- Conexiones: [[products--inventory]] (stock_actual vive en Product) · [[sales--inventory]] (SALIDA_VENTA la crea sales) · [[users--inventory]] (lead_cashier)

## Qué es (3-5 líneas)
Registra **movimientos de inventario** (`InventoryMovement`) que mueven el `stock_actual` del `Product` (el stock NO vive aquí, vive en products). Tres tipos: `ENTRADA` (compra manual), `AJUSTE` (corrección manual +/-) y `SALIDA_VENTA` (automática, la crea el módulo [[sales]], prohibida por API manual). Expone además un endpoint de **stock actual** (`/stock/`) que lista los productos `CON_CODIGO` activos con su nivel y flag `bajo_minimo`. El front es una pantalla ADMIN con pestañas Stock / Historial, KPIs y escaneo de código de barras que abre el modal de movimiento.

## Pendientes / drift doc↔código
- 🔴 El front traga los errores 400/403 del backend (`catch {}`, `InventoryPage.tsx:254`) → validaciones del servidor invisibles. Ver [[errores-servidor-silenciados]].
- 🔴 `AJUSTE` negativo puede dejar `stock_actual` en negativo — no hay piso en 0. Ver [[ajuste-stock-negativo]].
- 🟡 `precio_costo` es **obligatorio** en el form (Zod) pero **opcional** en modelo/serializer, incluso para `AJUSTE`. Ver [[precio-costo-obligatorio-front]].
- 🟡 `proveedor` existe en modelo+serializer pero el form NUNCA lo envía (ni está en el tipo TS) → siempre queda `null` desde inventory.
- 🟡 El path lead-cashier `ENTRADA` (backend `views.py:34-39`) **no tiene UI**: la ruta `/inventory` es solo ADMIN (`router.tsx:88-97`). Capacidad backend inalcanzable desde la app. Ver [[preguntas-inventory]] P-1.
- 🟡 `InventoryMovementViewSet` NO hereda `TenantModelViewSet`: filtra tenant a mano (`views.py:43`, `60-61`) sin guard de `tenant=None`. Ver [[superadmin-tenant-none]].
- ❓ Drift con CLAUDE.md: `apps/inventory/` doc dice permiso POST = "IsAdmin"; el código real es `IsCajero` + gate lead_cashier (`views.py:28-39`).
