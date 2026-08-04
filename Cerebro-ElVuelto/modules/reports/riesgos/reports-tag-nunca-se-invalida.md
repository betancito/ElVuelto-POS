---
tags: [riesgo, reports, rtk-query]
status: vivo
module: reports
severidad: alta
updated: 2026-08-02
---

# Riesgo — El tag `Report` nunca se invalida (dashboards stale)

**Severidad:** 🔴 alta

## Qué
Ninguna mutación invalida el tag `Report` de RTK Query. `createSale` invalida `Sale`, `InventoryMovement` y `Product` (`el_vuelto_frontend/src/features/sales/salesApi.ts:54`) pero **no** `Report`. Los endpoints de reports lo proveen (`reportsApi.ts:63-80`). Resultado: tras una venta, el dashboard y los reportes quedan **stale** hasta un refetch manual.

## Impacto
El ADMIN toma decisiones sobre cifras viejas. Alto en un POS donde el dashboard es la landing.

## Fix
Añadir `Report` a `invalidatesTags` de `createSale` (y de `createMovement`/ajustes si afectan cifras). Ver [[REPORTS-20260802-invalidar-tag-report]].
