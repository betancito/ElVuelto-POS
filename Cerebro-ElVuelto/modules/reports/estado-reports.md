---
tags: [modulo, estado]
status: vivo
module: reports
updated: 2026-08-02
---

# Reports — Estado

**Semáforo:** 🟡 documentado (código leído completo)
**App back:** `apps/reports` (~283 LOC, `views.py` 259) · **Feature front:** `features/reports` (`ReportsPage.tsx` 1318 LOC, `reportsApi.ts` 91) + `features/dashboard` (`DashboardPage.tsx` 359) · **Complejidad:** 🟡 (backend simple; frontend pesado en export cliente)

## Punteros
- Código: [[mapa-reports]] · Endpoints: [[contratos-reports]] · Datos: [[datos-reports]] · Formularios: [[formularios-reports]]
- Preguntas abiertas: [[preguntas-reports]]
- Riesgos:
  - [[reports-tag-nunca-se-invalida]] 🔴 (reportes quedan stale tras una venta)
  - [[sales-detail-500-si-tenant-none]] 🔴 (500 para SUPERADMIN / tenant inactivo)
  - [[dinero-como-float]] 🟡 (Decimal → float en toda respuesta)
  - [[agregados-sin-fecha-todo-el-historico]] 🟡 (sin params de fecha agrega todo el histórico)
- Conexiones: [[sales--reports]] (fuente de datos), [[reports--tenants]] (logo/nombre para export)

## Qué es (3-5 líneas)
Módulo **derivado / de solo lectura**: no tiene modelos propios ni serializers. Cinco `APIView` (`views.py`) que **recalculan agregados** leyendo `Sale` / `SaleItem` (app `sales`) y arman resúmenes, series por hora/día, ranking de productos y un export de detalle. El front lo consume desde dos lugares: `DashboardPage` (landing del ADMIN, siempre "hoy") y `ReportsPage` (selector diario/semanal/mensual/personalizado + export a Excel/HTML generado 100% en el cliente). Todo en zona horaria `America/Bogota` (`views.py:13`).

## Pendientes / drift doc↔código
- 🔴 **DRIFT endpoints:** `CLAUDE.md` (backend) documenta **3** endpoints de reports; existen **5** (`urls.py:11-16`): faltan `ventas-por-dia/` y `sales-detail/`. Ver [[contratos-reports]].
- 🔴 **DRIFT payload:** `ventas-por-hora` devuelve además `top_productos` por hora (`views.py:92-97,104`), no documentado en `CLAUDE.md`. El tipo TS sí lo tiene (`reportsApi.ts:15`).
- 🔴 **Cache stale:** ninguna mutación invalida el tag `Report`; `createSale` invalida `Sale, InventoryMovement, Product` (`salesApi.ts:54`). Ver [[reports-tag-nunca-se-invalida]].
- 🟡 **Permiso:** las 5 vistas son `IsAdmin` (ADMIN+SUPERADMIN), **no** `AllowAny`. Filtran tenant **manualmente** por `request.tenant` (excepción a la regla "nunca filtres tenant a mano" del `CLAUDE.md`, porque son `APIView`, no `TenantModelViewSet`).
- 🟡 **DRIFT menor:** `CLAUDE.md` dice `ventas-por-hora ?fecha (required)`; en realidad si falta usa hoy (`views.py:68-69`).
- 🟢 **Confirmado (no bug):** `views.py:171` filtra `document_type="logo"` en minúscula y el choice real es `"logo"` (`tenants/models.py:30`). Coincide.
