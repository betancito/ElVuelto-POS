---
tags: [tarea, tenancy, limpieza]
status: 🔴
prioridad: media
updated: 2026-08-02
---

# TENANCY-20260802-toggle-active-fantasma — Endpoint toggle_active fantasma

**Tipo:** limpieza / decisión · **Descubierto:** auditoría de módulos 2026-08-02

## Problema
El front define la mutation `POST /tenants/{id}/toggle_active/` y exporta `useToggleTenantActiveMutation` (`el_vuelto_frontend/src/features/tenants/tenantsApi.ts:77-80,91`), pero `TenantViewSet` **no tiene esa acción** (`apps/tenants/views.py:47-85`, solo `upload_logo`) → **404** si se cablea. El toggle real se hace por `PATCH` con `activo`. Hook muerto o endpoint faltante. Ver `modules/tenancy/riesgos/riesgo-toggle-active-fantasma`.

## Criterio de aceptación
O se crea la acción `toggle_active` en el backend, o se elimina el hook del front (decisión del owner, P-1 tenancy).

## Notas para el Dev
- No cablear el hook a ciegas: primero decidir con el owner.
