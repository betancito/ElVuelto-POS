---
tags: [conexion, reports, tenancy]
status: vivo
updated: 2026-08-02
---

# Conexión — reports ↔ tenants

## Contrato: el export usa datos del negocio
`SalesDetailExportView` (`apps/reports/views.py:169-174`) incluye en la respuesta `tenant_nombre` y `tenant_logo_url` (del `TenantDocument` tipo logo) para armar el export/recibo en el front.

## Acoplamiento frágil
- Si `request.tenant` es None (SUPERADMIN o tenant inactivo) → **500** al dereferenciar `request.tenant.nombre`. Ver [[sales-detail-500-si-tenant-none]].
- El logo depende de que exista un `TenantDocument` LOGO (ver [[patron-cloudinary]]).

## Enlaces
[[sales--reports]] · [[tenants--users--auth]]
