---
tags: [riesgo, reports, tenancy, seguridad]
status: resuelto
module: reports
severidad: alta
updated: 2026-08-03
---

# Riesgo — `sales-detail` da 500 cuando `request.tenant` es None

**Severidad:** 🔴 alta · **Estado:** 🟢 RESUELTO 2026-08-03

> [!decision] Resuelto — `require_tenant` (verificado contra código 2026-08-03)
> `SalesDetailExportView` (y las 5 vistas de reports + `StockView`) ahora llaman `require_tenant(request)` (`apps/tenants/utils.py`) que lanza **403** por truthiness cuando `request.tenant` es None. El deref `request.tenant.nombre` ya usa el local resuelto. Ver [[RUN-20260803-guard-tenant-none]]. Ojo: el guard NO puede usar `is None` — `request.tenant` es `SimpleLazyObject` y `lazy is None` nunca es True (ver [[patron-tenancy]]).

## Qué
`SalesDetailExportView` (`apps/reports/views.py:169`) hace `request.tenant.nombre`. Si `request.tenant is None` (un SUPERADMIN — que `IsAdmin` deja pasar — o un tenant inactivo), es `AttributeError` → HTTP **500**. Las otras vistas de reports en ese caso devuelven datos vacíos (no crashean, pero tampoco tienen sentido).

## Impacto
500 no controlado; además evidencia que los endpoints tenant-scoped no manejan `tenant=None` de forma consistente. Ver [[patron-tenancy]] y `modules/inventory/riesgos/superadmin-tenant-none`.

## Fix
Cuando `request.tenant` es None → 403/404 explícito (helper `require_tenant`). Ver [[REPORTS-20260802-endpoints-500-tenant-none]].
