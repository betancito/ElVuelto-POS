---
tags: [modulo, mapa]
status: vivo
module: reports
updated: 2026-08-02
---

# Reports — Mapa de código

> Módulo derivado: **sin models, sin serializers**. Backend = 5 `APIView`. Frontend = 1 api RTK Query + 2 páginas consumidoras.

## Backend — `apps/reports/`

| archivo:línea | qué hace | notas |
|---|---|---|
| `views.py:13` | `BOGOTA_TZ = ZoneInfo("America/Bogota")` | TZ única usada por todas las vistas |
| `views.py:16-58` | `SummaryReportView` (GET) | KPIs del período: `total_ventas, num_transacciones, unidades_vendidas, porcentaje_efectivo, porcentaje_nequi`. Acepta `?fecha` o `?fecha_inicio&fecha_fin`; **sin params → agrega TODO el histórico** |
| `views.py:36-39` | `sales_qs.aggregate(Sum(total), Count(id))` | agregación principal |
| `views.py:41` | `SaleItem ... Sum("cantidad")` | unidades vendidas (lee `sales`) |
| `views.py:45-48` | conteo por `metodo_pago` → porcentajes | `EFECTIVO` vs `NEQUI_TRANSFERENCIA`, `round()` a entero |
| `views.py:61-109` | `VentasPorHoraView` (GET) | serie 0-23h. Si falta `?fecha` usa hoy (`:68-69`) |
| `views.py:73` | `ExtractHour("created_at", tzinfo=BOGOTA_TZ)` | hora en TZ Bogotá |
| `views.py:81-97` | top 3 productos por hora | **`top_productos` NO documentado en CLAUDE.md**; usa `itertools.groupby` |
| `views.py:99-107` | rellena 24 horas (0..23) con ceros | garantiza array completo |
| `views.py:112-178` | `SalesDetailExportView` (GET) | detalle completo para export. `?fecha` o rango; sin params → hoy (`:132-135`) |
| `views.py:137-142` | `prefetch_related("items").select_related("user")` | evita N+1 |
| `views.py:149` | `sale.user.nombre` → `cajero` | nombre del cajero |
| `views.py:150` | `get_metodo_pago_display()` | devuelve label ("Efectivo" / "Nequi / Transferencia") |
| `views.py:169` | `request.tenant.nombre` | ⚠️ **500 si `request.tenant` es None** → [[sales-detail-500-si-tenant-none]] |
| `views.py:170-174` | `tenant.documents.filter(document_type="logo")` | logo Cloudinary; `related_name="documents"` en `TenantDocument` |
| `views.py:181-218` | `TopProductosView` (GET) | ranking por unidades. `?limit` = `min(x,100)` (`:190`) |
| `views.py:199-206` | `values(product_id,product_nombre).annotate(Sum cantidad/subtotal)` | agrupa por producto (snapshot `product_nombre`) |
| `views.py:221-259` | `VentasPorDiaView` (GET) | serie por día. Sin rango → últimos 7 días (`:230-232`) |
| `views.py:240` | `TruncDate("created_at", tzinfo=BOGOTA_TZ)` | día en TZ Bogotá |
| `views.py:247-258` | relleno día por día (while loop) | garantiza días sin ventas en 0 |
| `urls.py:11-16` | 5 rutas: `summary/ ventas-por-hora/ ventas-por-dia/ top-productos/ sales-detail/` | incluidas bajo `/api/reports/` (`elvuelto/urls.py:13`) |
| `apps.py:1-7` | `ReportsConfig` label `reports` | app registrada en `INSTALLED_APPS` |
| `migrations/` | solo `__init__.py` | **no hay migraciones** (sin modelos) |

**Permisos:** las 5 vistas → `permission_classes = [IsAdmin]` (`users/permissions.py:15-23` = ADMIN o SUPERADMIN). No hay `AllowAny`. Tenant filtrado **a mano** con `request.tenant` (inyectado por `TenantMiddleware`, `tenants/middleware.py:23-31`).

## Frontend

### `features/reports/reportsApi.ts` (RTK Query, inyecta en `apiBase`)
| archivo:línea | qué hace | notas |
|---|---|---|
| `reportsApi.ts:3-58` | interfaces TS de respuesta | `SummaryReport, VentasPorHoraItem, VentasPorDiaItem, TopProducto, SaleExport, SalesDetailReport` |
| `reportsApi.ts:15` | `VentasPorHoraItem.top_productos` | tipa el campo no documentado en CLAUDE.md |
| `reportsApi.ts:63` | `getSummary` → `/reports/summary/` | `providesTags: ['Report']` |
| `reportsApi.ts:67` | `getVentasPorHora` → `/reports/ventas-por-hora/` | `provides Report` |
| `reportsApi.ts:71` | `getVentasPorDia` → `/reports/ventas-por-dia/` | `provides Report` |
| `reportsApi.ts:75` | `getTopProductos` → `/reports/top-productos/` | `provides Report`; param `limit` |
| `reportsApi.ts:79` | `getSalesDetail` → `/reports/sales-detail/` | `provides Report` |
| `apiBase.ts:48` | `tagTypes` incluye `'Report'` | ⚠️ nadie lo **invalida** → [[reports-tag-nunca-se-invalida]] |

### `features/dashboard/DashboardPage.tsx` (landing ADMIN)
| archivo:línea | qué hace | notas |
|---|---|---|
| `DashboardPage.tsx:82-85` | llama `getSummary/getVentasPorHora/getTopProductos({fecha: hoy})` + `listSales` | "hoy" automático (`todayBogota()`) |
| `DashboardPage.tsx:37-78` | `HourTooltip` con `top_productos` | consume el campo por-hora |
| `DashboardPage.tsx:121-204` | KPI grid (ventas, transacciones, unidades, método) | clases `ta-kpi-*` |
| `DashboardPage.tsx:207-303` | LineChart por hora (recharts) + top productos | `ta-card` |
| `DashboardPage.tsx:327-345` | tabla "Últimas ventas" desde `listSales` (`sales`, no reports) | usa `s.user_nombre`, `s.total` (string) |

### `features/reports/ReportsPage.tsx` (página con selector de período + export)
| archivo:línea | qué hace | notas |
|---|---|---|
| `ReportsPage.tsx:28-73` | helpers de fecha (`todayBogota`, semana/mes ISO ↔ rango) | cálculo de rangos en cliente |
| `ReportsPage.tsx:219-447` | calendarios custom (semana/mes/rango) | popovers propios, no MUI |
| `ReportsPage.tsx:451-491` | estado + queries; skip condicional | `ventas-por-hora` solo si `diario`; `ventas-por-dia` si no; `sales-detail` solo al exportar |
| `ReportsPage.tsx:512-552` | `exportExcel()` con `xlsx` | 3 hojas: Resumen/Ventas/Productos |
| `ReportsPage.tsx:554-874` | `exportHTML()` genera HTML+SVG standalone | donut de métodos, chart, tabla filtrable; logo tenant/ElVuelto en base64 |
| `ReportsPage.tsx:1039-1090` | KPI cards (venta total, ticket promedio, método) | `ta-kpi-*` |
| `ReportsPage.tsx:1093-1240` | chart por período + barra por método de pago | recharts Line/Bar según período |
| `ReportsPage.tsx:1242-1312` | top 5 + tabla detalle de productos | `ta-table` |
| `ReportsPage.module.css` | archivo de 1 línea (vacío/placeholder) | usa clases `ta-*`, no CSS module |

**Ruta/nav:** `router.tsx:95` `/dashboard` → `DashboardPage`; `router.tsx:99` `/reports` → `ReportsPage`. Ambas bajo bloque protegido ADMIN.
