---
tags: [prompt, reports, fix, rtk-query]
status: 🟢
updated: 2026-08-03
---

# Prompt DEV — Invalidar el tag `Report` al crear una venta (dashboards stale)

**Tarea backlog:** [[REPORTS-20260802-invalidar-tag-report]] · **Riesgo:** [[reports-tag-nunca-se-invalida]]
**Alcance:** UNA cosa — que tras una venta los reports/dashboards se refresquen. No scope creep. No git.

## Contexto mínimo necesario
- Leer: `el_vuelto_frontend/CLAUDE.md` (RTK Query tag invalidation), `src/features/sales/salesApi.ts`, `src/features/reports/reportsApi.ts`, `src/app/apiBase.ts:48`.
- Regla dura — **RTK QUERY TAGS:** una mutación invalida TODOS los tags afectados. Una venta toca: `Sale` + `InventoryMovement` + `Product` + **`Report`**.

## El bug (anclado)
- Las 5 queries de reports proveen `'Report'` (`reportsApi.ts:64,68,72,76,80`).
- `createSale` invalida `['Sale', 'InventoryMovement', 'Product']` (`salesApi.ts:54`) — **le falta `'Report'`**. Resultado: summary / ventas-por-hora / top-productos / ventas-por-dia / sales-detail quedan **stale** tras vender, hasta un refetch manual.
- `'Report'` ya existe en `tagTypes` (`apiBase.ts:48`), así que typecheckea.

## Qué hacer (pasos)
1. En `src/features/sales/salesApi.ts`, en `createSale.invalidatesTags`, agregar `'Report'`:
   ```ts
   invalidatesTags: ['Sale', 'InventoryMovement', 'Product', 'Report'],
   ```
2. **No** toques `createMovement` (inventory): los reports son agregaciones de **ventas** (Sale/SaleItem); un movimiento manual de inventario no cambia ningún report, así que agregar `'Report'` ahí sería sobre-invalidar. (Si encuentras evidencia real de un report basado en stock, dilo, no lo asumas.)

## Restricciones
- Stack inmutable. Solo `salesApi.ts`. No cambies los `providesTags` de reports ni el `tagTypes`.
- **Doble actualización:** en `el_vuelto_frontend/CLAUDE.md` (nota de RTK Query tag invalidation), dejar constancia de que `createSale` invalida `Sale + InventoryMovement + Product + Report` (una venta refresca los dashboards).

## Entregable / verificación
- `npm run typecheck` → limpio (pegar salida). Confirma que `'Report'` es un tag válido del `tagTypes`.
- Prueba manual (si levantas el front): con el dashboard/reports abierto, registrar una venta desde el POS → los KPIs/summary se actualizan **sin refrescar la página**.
- Veredicto ✅ / 🔴 con la evidencia.
