---
tags: [tarea, feature, sales, inventory, negocio]
status: 🟢
prioridad: feature
updated: 2026-08-16
---

# SALES-20260816-stock-negativo-permitido — vender aunque no haya stock registrado

**Tipo:** feature / **cambio de regla de negocio** · **Pedido:** directo del owner el 2026-08-16
(*"para no limitar un negocio a que siempre tiene que estar llenando el inventario para poder vender…
si tengo 20 gaseosas y vendí 30 porque me llegó un pedido pero no tuve tiempo de registrarlo, vamos a
permitir que el inventario quede en números negativos"*) · **Estado:** 🟢 implementada y verificada ·
**Decisión:** [[ADR-SALES-20260816-stock-negativo-permitido]] ·
**Corrida:** [[RUN-20260816-stock-negativo-permitido]]

## Qué se entregó
`POST /api/sales/` ya no rechaza por falta de stock: el stock queda negativo y eso **es** el registro de
que hay una ENTRADA pendiente. El negativo se ve en tres lugares (elegidos por el owner):
- **cajero**, en el modal de éxito de la venta que lo causó — avisa, no frena;
- **admin/líder**, en Inventario: KPI "En negativo" **disjunto** de "bajo mínimo", chip de filtro y badge
  *"Falta registrar entrada"*;
- en `ProductsPage` y el panel de entrada del POS, en rojo.

Cambio obligado y menos obvio: el guard de inventario pasó a **direccional**, porque con el guard viejo
una ENTRADA parcial sobre un stock negativo quedaba rechazada y no había forma de salir del hueco.

## Estado de la verificación
✅ 14/14 casos contra servidor real (incluidos los 4 del recorrido completo del hueco y la reproducción
del *lost update*) · ✅ migración única y `--check` limpio · ✅ typecheck y build en 0 · ✅ dos rondas
adversariales (45 agentes) · ✅ entorno devuelto como estaba.

⚠️ **Pendiente:** el aviso del modal y los KPIs no se pudieron ver renderizados (sin navegador en el
entorno). Falta que el owner lo confirme a ojo.

## Cómo confirmarlo a ojo
1. En un producto CON_CODIGO con stock bajo, vender más de lo que hay → la venta pasa y el modal de éxito
   muestra *"X quedó en −N u. · Falta registrar la entrada en inventario"*.
2. Ir a **Inventario** → debe aparecer el KPI **"En negativo"** y el chip rojo para filtrarlos.
3. Registrar una **entrada parcial** (menos de lo que se debe) → debe aceptarla y dejar el stock menos
   negativo. *Esto es lo que fallaba antes del arreglo direccional.*

## Deuda que dejó registrada
- [[INVENTORY-20260816-recordatorio-activo-stock-negativo]] — el recordatorio activo que el owner dejó
  para después.
- [[BACKEND-20260816-borrar-tenant-con-ventas-da-500]] — preexistente, descubierto al limpiar.
