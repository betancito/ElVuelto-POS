---
tags: [tarea, reports, tenancy, seguridad]
status: 🟢
prioridad: alta
updated: 2026-08-03
---

> [!decision] 🟢 RESUELTO 2026-08-03 — helper `require_tenant` ([[PROMPT-FIX-REPORTS-20260803-guard-tenant-none]], [[RUN-20260803-guard-tenant-none]]). `tenant=None` → **403** en los 5 reports + `StockView` + `TenantModelViewSet._get_tenant` (este último tenía el mismo `is None` roto por el `SimpleLazyObject`). Verificado (superadmin→403, admin/cajero→200). Follow-up de los viewsets que no extienden `TenantModelViewSet`: [[BACKEND-20260803-guard-tenant-none-viewsets-restantes]].

# REPORTS-20260802-endpoints-500-tenant-none — Manejar request.tenant None

**Tipo:** bug / robustez · **Descubierto:** auditoría de módulos 2026-08-02

## Problema
`SalesDetailExportView` (`apps/reports/views.py:169`) dereferencia `request.tenant.nombre` → **500** cuando `request.tenant is None` (SUPERADMIN, que `IsAdmin` deja pasar, o tenant inactivo). El resto de vistas devuelven vacío sin sentido. Ver `modules/reports/riesgos/sales-detail-500-si-tenant-none` y `modules/inventory/riesgos/superadmin-tenant-none`.

## Criterio de aceptación
Cuando `request.tenant` es None, los endpoints tenant-scoped responden 403/404 explícito (no 500, no datos vacíos ambiguos).

## Notas para el Dev
- Helper `require_tenant(request)` reutilizable; aplicarlo en reports y revisar otros APIView tenant-scoped.
- **Decisión owner (2026-08-02):** el SUPERADMIN **no** debe ver reports ni datos de tenant; solo verá datos impersonando ([[SUPERADMIN-20260802-impersonar-tenant]]). Por tanto, `tenant=None` en endpoints tenant-scoped → **403** explícito. Ver [[ADR-G-20260802-modelo-de-acceso-por-rol]].
