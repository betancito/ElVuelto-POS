---
tags: [tarea, reports, rtk-query]
status: 🔴
prioridad: alta
updated: 2026-08-02
---

# REPORTS-20260802-invalidar-tag-report — Invalidar el tag Report al vender

**Tipo:** bug (cache stale) · **Descubierto:** auditoría de módulos 2026-08-02

## Problema
`createSale` invalida `Sale`, `InventoryMovement`, `Product` pero **no** `Report` (`el_vuelto_frontend/src/features/sales/salesApi.ts:54`). Dashboard y reportes quedan stale tras una venta. Ver `modules/reports/riesgos/reports-tag-nunca-se-invalida`.

## Criterio de aceptación
Tras una venta, dashboard/reportes reflejan la cifra nueva sin refetch manual.

## Notas para el Dev
- Añadir `'Report'` a `invalidatesTags` de `createSale` (y de `createMovement`/ajustes si afectan cifras).
- Regla general: ver [[patron-errores-drf-rtk]] no; ver checklist de tags en [[INIT-AGENTS]].
