---
tags: [tarea, feature, superadmin, tenancy, frontend, backend]
status: 🟢
prioridad: feature
updated: 2026-08-12
---

# SUPERADMIN-20260812-logo-en-modales-crear-editar — agregar/cambiar/quitar el logo desde los modales

**Tipo:** feature · **Pedida:** directo por el owner en el chat (2026-08-12), implementada por el
Planner con análisis + modo plan previos ([[GOBERNANZA]] §10).

## Qué se pidió
Poder ponerle logo a un negocio desde los modales de **creación** y **edición** de
`super-admin/tenants/index.tsx`, no solo desde `TenantDetailPage`. Al preguntarle, el owner además
pidió poder **quitarlo** — que no existía en el backend.

## Qué quedó
- Control de logo en ambos modales, **subida diferida** (se aplica al dar Crear/Guardar; Cancelar
  descarta). Tri-estado `keep` | `replace` | `remove`.
- Endpoint nuevo `DELETE /api/tenants/{id}/logo/` (`IsSuperAdmin`, idempotente, 204) + helper
  `destroy_image` en `elvuelto/cloudinary_uploads.py`.
- El create se mantiene **JSON** a propósito: multipart activaría la trampa de
  `BooleanField.default_empty_html=False` y el negocio nacería inactivo.

Decisión: [[ADR-TENANCY-20260812-logo-tenant-modales-crear-editar]] (supersede el punto 1 de
[[ADR-TENANCY-20260812-logo-tenant-superadmin-ui]]).
Corrida y verificación: [[RUN-20260812-logo-tenant-modales-crear-editar]] — 15/15 contra servidor real,
revisión adversarial con 1 bug propio encontrado y arreglado.

## Pendiente
🟡 Verificación visual en navegador (sin Chrome conectado en el entorno del Planner).
