---
tags: [modulo, riesgo, sales, paginacion]
status: abierto
module: sales
severidad: alta
updated: 2026-08-02
---

# Riesgo — Historial de ventas topado en 50 (paginación server ignorada)

**ID:** `SALES-20260802-paginacion-historial-tope-50`
**Severidad:** 🔴 alta (pérdida de datos visibles en el historial)

## Resumen
`GET /api/sales/` está **paginado por el servidor** con el default de DRF, pero el front lo trata como si devolviera la lista completa y pagina en cliente. Resultado: **solo se pueden ver las primeras 50 ventas**; el resto es inalcanzable desde la UI.

## Cadena del defecto
1. `SaleViewSet` (`views.py:11-16`) usa `ListModelMixin` sin `pagination_class` propio → aplica el default:
   `DEFAULT_PAGINATION_CLASS = PageNumberPagination`, `PAGE_SIZE = 50` (`settings/base.py:100-101`).
2. Por tanto la respuesta es `{ count, next, previous, results: [...máx 50...] }`.
3. `listSales.transformResponse` (`salesApi.ts:44-45`) hace:
   `Array.isArray(response) ? response : response.results` → **se queda solo con `results` (máx 50)** y descarta `count`/`next`.
4. `SalesHistoryPage` pagina **en cliente** 20/página sobre ese array (`SalesHistoryPage.tsx:12,102-106`) y **nunca envía `?page=`** al backend (`ListSalesParams` no tiene `page`, `salesApi.ts:30-35`).

Así, con 51+ ventas en un tenant, `allSales.length` se queda en 50, `totalPages = ceil(50/20) = 3`, y no hay forma de pedir la venta #51.

## Evidencia
- `apps/sales/views.py:11-16,28-53` (sin `pagination_class`).
- `elvuelto/settings/base.py:100-101` (PageNumberPagination, PAGE_SIZE 50).
- `features/sales/salesApi.ts:30-35,39-48` (sin `page`, descarta `results` extra).
- `features/sales/SalesHistoryPage.tsx:12,94-106` (paginación cliente 20/pág).

## Impacto
- Historial incompleto: ventas antiguas invisibles salvo que los filtros de fecha/búsqueda reduzcan el conjunto a ≤50.
- Métricas derivadas del historial en el front (conteos, totales visibles) subestiman.
- Mitigación parcial hoy: los filtros `fecha_inicio`/`fecha_fin`/`search` acotan y suelen dejar <50 filas.

## Mitigación propuesta (backlog, NO aquí)
- Opción A: enviar `?page=` desde `listSales` y consumir `count`/`next` (paginación real server-driven).
- Opción B: desactivar paginación en `SaleViewSet` (`pagination_class = None`) si se acepta traer todo — riesgo de payloads grandes.
- Opción C: endpoint/paginación específica con page size configurable.

## Preguntas ligadas
- (ninguna directa; decisión de diseño de paginación.)
