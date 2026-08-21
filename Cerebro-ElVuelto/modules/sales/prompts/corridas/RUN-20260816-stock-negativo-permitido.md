---
tags: [corrida, run, sales, inventory, products]
status: cerrada
module: sales
updated: 2026-08-16
---

# RUN-20260816-stock-negativo-permitido — permitir que una venta deje el stock en negativo

**Decisión:** [[ADR-SALES-20260816-stock-negativo-permitido]] · **Ejecutó:** el **Planner** (pedido
directo, [[GOBERNANZA]] §10) con modo plan aprobado · **Sin prompt para el Dev.**

## Qué se cambió (9 archivos)
**Backend:** `apps/sales/serializers.py` (se quita el rechazo por stock; `set` ordenado en vez del
`defaultdict` muerto; tope de `cantidad`; guard de desborde del total) · `apps/sales/views.py`
(`stock_negativo` en la respuesta del POST) · `apps/inventory/serializers.py` (guard direccional) ·
`apps/products/models.py` (sin `MinValueValidator` en `stock_actual`) ·
`apps/products/serializers.py` (`stock_actual` read-only + `update()` con `update_fields`) ·
migración `products/0004`.
**Frontend:** `salesApi.ts`, `SuccessModal.tsx`, `InventoryPage.tsx`, `ProductsPage.tsx`,
`InventoryEntryPanel.tsx`.
**Doc:** los dos `CLAUDE.md`.

## Verificación — salida real, contra el servidor del owner

| # | Caso | Resultado |
|---|---|---|
| 1 | `makemigrations` | **un solo** `AlterField` de `stock_actual`; `migrate` OK; `--check` → sin pendientes |
| 2 | stock 20 → **vender 30** | **201** (antes 400) · stock **−10** · `stock_negativo: [{nombre:"Gaseosa", stock_actual:-10}]` |
| 3 | **La trampa:** ENTRADA **+5** sobre −10 | **201** → −5. *Con el guard viejo esto daba 400* |
| 4 | AJUSTE **−1** desde −5 | **400** — los ajustes manuales siguen sin poder cavar más hondo |
| 5 | ENTRADA **+10** | stock 5 — salió del hueco |
| 6 | AJUSTE **−20** desde 5 | **400** (regresión: sigue bloqueado) |
| 7 | Mismo producto en **dos líneas** (3+4) desde 5 | −2 exacto · **2 líneas** en el recibo (contrato intacto) |
| 8 | `monto_recibido` insuficiente | **400**, stock sin tocar (rollback OK) |
| 9 | `PATCH {"stock_actual": -9999}` | 200 pero **ignorado**, stock intacto |
| 10 | `cantidad: 50000` | **400** por el tope de campo |
| 11 | 10.000 uds × $10.000 = 100.000.000 | **400** `"El total supera el máximo permitido (99999999.99)"` — *antes de este guard era **500*** |
| 12 | **Lost update reproducido:** PATCH de nombre con venta concurrente | stock −15 **se conserva** (antes lo pisaba con el valor rancio) y el nombre se guarda |
| 13 | typecheck / build | exit 0 los dos (corridos tras cada ronda) |
| 14 | Limpieza | base como estaba: solo **BambiPan** (del owner), 4 usuarios |

## Revisión adversarial — dos rondas, 45 agentes, y la ronda 2 volvió a pagar

### Ronda 1 — 40 agentes, 35 hallazgos, 16 refutados, **19 sobrevivientes**
Lo que importó, todo introducido por el cambio:
1. 🔴 **`PATCH /api/products/` quedó aceptando `stock_actual` negativo arbitrario.** Quitar el
   `MinValueValidator` del modelo también quitó el `min_value` que **DRF deriva** de los validators, así
   que un PATCH pasó de 400 a 200. → `read_only_fields`.
2. 🔴 **Escribí un docstring que miente.** Afirmaba que la suma por producto era lo que `create()` cobra
   y descuenta; `create()` itera línea por línea y los valores del `defaultdict` no los leía nadie.
   → `set` ordenado + docstring y `CLAUDE.md` reescritos.
3. 🔴 **`cantidad` se quedó sin techo** (el chequeo de stock lo era de rebote) → tope de campo.
4. 🔴 **Callejón en el chip "En negativo"**: se desmontaba con el filtro prendido y dejaba la lista vacía
   sin forma de volver. También prometía un conteo global filtrando dentro de una categoría.
5. 🔴 **Contradicciones en la doc**: `CLAUDE.md:518` seguía listando `stock_actual` entre los campos con
   piso, a 12 líneas de la línea nueva que decía lo contrario; el `models.py` decía *"Money and stock
   have a floor of 0"* 26 líneas arriba de donde le quité el piso; y el ADR que yo citaba **no existía
   todavía**.
6. 🔴 Las tarjetas seguían pintando el triángulo de "bajo mínimo" en los negativos, contradiciendo unos
   KPIs que se hicieron disjuntos a propósito; `ProductsPage` pintaba el negativo en gris apagado.

### Ronda 2 — 5 agentes sobre los arreglos. **Dos de mis arreglos estaban mal**
- 🔴 **`read_only_fields` NO cerraba el hueco, y mi comentario nuevo afirmaba que sí.**
  `ModelSerializer.update()` termina en un `instance.save()` pelado, y un save sin `update_fields`
  escribe **todas** las columnas — `stock_actual` incluida, con el valor que la instancia leyó al empezar
  el request. **Lost update determinístico**: el admin guarda un cambio de precio mientras el cajero
  cobra 3 unidades → el UPDATE del PATCH espera el lock de la venta y después escribe el stock viejo. La
  venta queda en `Sale`, `SaleItem` **e** `InventoryMovement`, y el stock dice que nunca pasó. Duele más
  ahora: el negativo es el pasivo que dice qué ENTRADA se debe, así que pisarlo **borra una deuda o
  resucita una ya pagada**. → `update()` propio con `update_fields`, **reproducido y verificado** (caso 12).
- 🔴 **Mi justificación del tope de `cantidad` era falsa.** Escribí "far below the overflow"; 10.000 × 
  $10.000 = 100.000.000 y `Sale.total` es `numeric(10,2)` (máx 99.999.999,99). El tope **no** evitaba el
  500. → guard sobre el **total calculado** (`MAX_SALE_TOTAL`, derivado del modelo), que sí lo cubre
  venga de una línea o de mil (caso 11).
- 🟡 El aviso del `SuccessModal` no tenía tope y empujaba "Nueva Venta" fuera de un modal de 90vh con un
  carrito de muchos negativos → capado en 3 + "y N más".
- 🟡 El orden de los errores dejó de ser determinista al pasar a `set` → `dict.fromkeys`.

## Deuda registrada, no tocada
- [[INVENTORY-20260816-recordatorio-activo-stock-negativo]] — el recordatorio **activo** que el owner
  dejó explícitamente para después. Hoy la señal es pasiva: hay que entrar a Inventario.
- [[BACKEND-20260816-borrar-tenant-con-ventas-da-500]] — descubierto limpiando: `DELETE /api/tenants/{id}/`
  revienta con `ProtectedError` si el negocio tiene ventas. **Preexistente**, no lo causó este cambio.
- Un producto en negativo que el admin **desactiva** desaparece de `StockView` (filtra `activo=True`) y
  con él del único recordatorio que existe. Anotado dentro del ítem del recordatorio activo.

## Veredicto
✅ **Pasó**, con dos rondas de arreglos propios. La ronda 2 volvió a ser la que más valió: encontró que
**dos de mis cinco arreglos estaban mal** — uno no cerraba el hueco que decía cerrar (y lo afirmaba en un
comentario), y el otro se apoyaba en una cuenta falsa. Ninguno de los dos se veía leyendo el diff una vez.

Pendiente de confirmación visual del owner: el aviso del modal y los KPIs de Inventario (sin navegador en
el entorno).
