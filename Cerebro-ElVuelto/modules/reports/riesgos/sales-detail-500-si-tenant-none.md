---
tags: [riesgo, reports, tenancy, seguridad]
status: vivo
module: reports
severidad: alta
updated: 2026-08-02
---

# Riesgo — `sales-detail` da 500 cuando `request.tenant` es None

**Severidad:** 🔴 alta

## Qué
`SalesDetailExportView` (`apps/reports/views.py:169`) hace `request.tenant.nombre`. Si `request.tenant is None` (un SUPERADMIN — que `IsAdmin` deja pasar — o un tenant inactivo), es `AttributeError` → HTTP **500**. Las otras vistas de reports en ese caso devuelven datos vacíos (no crashean, pero tampoco tienen sentido).

## Impacto
500 no controlado; además evidencia que los endpoints tenant-scoped no manejan `tenant=None` de forma consistente. Ver [[patron-tenancy]] y `modules/inventory/riesgos/superadmin-tenant-none`.

## Fix
Cuando `request.tenant` es None → 403/404 explícito (helper `require_tenant`). Ver [[REPORTS-20260802-endpoints-500-tenant-none]].
