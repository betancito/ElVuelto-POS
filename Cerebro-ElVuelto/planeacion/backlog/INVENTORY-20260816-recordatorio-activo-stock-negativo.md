---
tags: [tarea, inventory, ux, feature]
status: 🔴
prioridad: media
updated: 2026-08-16
---

# INVENTORY-20260816-recordatorio-activo-stock-negativo — avisarle al líder/admin sin que tenga que entrar a mirar

**Tipo:** feature · **Origen:** el owner lo dejó explícitamente para después al pedir el stock negativo
el 2026-08-16 (*"ya veremos cómo recordarle al cajero líder o al administrador que se encargue de
registrar lo que llegó"*) · **Decisión padre:** [[ADR-SALES-20260816-stock-negativo-permitido]]

## Qué hay hoy (pasivo)
El negativo se ve, pero **solo si alguien va a mirar**:
- El cajero lo ve **una vez**, en el modal de éxito de la venta que lo causó, y se lo lleva el viento.
- El admin/líder lo ve en **Inventario**: KPI "En negativo", chip de filtro, badge *"Falta registrar
  entrada"*; y en `ProductsPage` y el panel de entrada del POS, en rojo.

O sea: si nadie abre Inventario, la deuda se acumula en silencio. Eso es aceptable como primer paso —
antes del cambio la caja simplemente se bloqueaba— pero no es el recordatorio que el owner quiere.

## El problema a resolver
Que la persona que **puede** saldar la deuda (admin, o cajero líder, que es quien puede registrar
`ENTRADA`) se entere **sin tener que acordarse de ir a buscar**.

## Preguntas de alcance para el owner (antes de codear)
- ¿Por dónde? Hoy el proyecto **no tiene** ningún canal de notificación: ni correo, ni push, ni tabla de
  notificaciones. Lo más barato es dentro de la app (un badge en el sidebar / un banner en el dashboard);
  cualquier otra cosa es infraestructura nueva.
- ¿A quién? ¿Solo al ADMIN, o también al `lead_cashier` (que es quien tiene permiso de `ENTRADA`)?
- ¿Cuándo? ¿Al entrar a la app, al cerrar turno, o cada tanto?
- ¿Se puede posponer/marcar como "ya pedí el pedido"? Eso implicaría estado nuevo en la BD.

## Notas para quien lo tome
- El dato ya existe y no hace falta endpoint nuevo: `GET /api/inventory/stock/` trae `stock_actual`, y
  el front deriva `stock_actual < 0` (así se hace hoy en `InventoryPage`).
- El permiso de registrar `ENTRADA` es `IsCajero` + `lead_cashier=True`, o `IsAdmin` — ver el
  `CLAUDE.md` del backend, sección Inventory.
- Ojo con el ruido: si un negocio vive en negativo, un aviso permanente se vuelve invisible. Vale la
  pena pensar el umbral antes que el canal.
