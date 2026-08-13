---
tags: [modulo, riesgo]
status: resuelto
module: tenancy
severity: baja
updated: 2026-08-12
---

> [!decision] ✅ Resuelto 2026-08-12
> El hook ya se invoca desde una pantalla real: `TenantDetailPage.tsx` (header, control tipo avatar
> clickeable). Ver [[ADR-TENANCY-20260812-logo-tenant-superadmin-ui]] ·
> [[RUN-20260812-logo-tenant-superadmin-ui]]. El resto de esta nota queda como registro histórico del
> gap tal como se encontró.

# Riesgo — Logo del negocio: backend y hook existen, no hay UI

**Ancla:** `el_vuelto_backend/apps/tenants/views.py:60-85` ↔ `el_vuelto_frontend/src/features/tenants/tenantsApi.ts:69-76`

## Qué pasa
Toda la cadena para subir el logo de un tenant está implementada **excepto la pantalla**:
- Backend: acción `upload_logo` (`views.py:60`) sube a Cloudinary y hace `TenantDocument.update_or_create` (`views.py:76`).
- Front API: mutation `uploadTenantLogo` + hook `useUploadTenantLogoMutation` (`tenantsApi.ts:69,90`).
- Front consumo: `logo_url` **se muestra** en `TenantsTable.tsx:35-39`.

Pero **ningún componente invoca el hook** (grep confirma solo la definición/export). Ni el modal de crear ni el de editar (`index.tsx`) tienen input de archivo para el logo.

## Consecuencia
El logo del negocio solo puede setearse por llamada API directa, Django admin o seed. Desde el super-admin la columna de logo siempre saldrá vacía salvo intervención manual. El branding del login de staff (`check-by-slug` devuelve `logo_url`) queda sin forma de configurarse por producto.

## Impacto
Funcionalidad incompleta, no un bug. Bajo riesgo operativo; alto "sorpresa" para quien espere poder subir el logo desde la pantalla de negocios.

## Recomendación (no aplicar aquí)
Agregar un input de archivo (patrón Cloudinary/`FormData` ya usado en products/categories) en el modal de editar negocio, cableado al hook existente. Ver [[preguntas-tenancy]] P-3.
