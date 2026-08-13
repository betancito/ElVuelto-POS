---
tags: [prompt, feature, tenancy, superadmin]
status: 🟢 corrido-ok
updated: 2026-08-12
---

# PROMPT-FEAT-TENANCY-20260812-logo-tenant-superadmin-ui

> [!info] Prompt reconstruido, no entregado antes de correr
> El owner se lo pidió directo al Planner en el chat ("agregarle un logo al tenant... desde el panel
> de superadmin"); no hubo handoff Planner→Dev previo. El Planner sí hizo el análisis y la planeación
> primero (modo plan, 2 agentes Explore + lectura directa de los archivos críticos) antes de
> implementar, a pedido explícito del owner. Reconstruido acá post-hoc para que el registro tenga a
> qué apuntar — mismo patrón que [[PROMPT-FEAT-TRANSVERSAL-20260811-docs-swagger-key-gate]]. Ver
> [[RUN-20260812-logo-tenant-superadmin-ui]] para el reconocimiento completo de la desviación de
> protocolo.

## Tarea (tal como la pidió el owner)
Agregar un logo al tenant desde el panel de super-admin, para una experiencia más personalizada del
negocio.

## Qué leer / regla dura aplicable
- `riesgo-logo-tenant-sin-ui.md` — el gap ya estaba documentado: backend + hook existían, faltaba la
  pantalla.
- CLAUDE.md frontend: sección `features/super-admin/` → `TenantDetailPage.tsx`, y el patrón de
  "Server-side form errors" / `getServerErrorMessage` para no-form surfaces.
- Patrón de tenancy/permisos: `upload_logo` ya es `IsSuperAdmin`-only en el backend — no confiar en
  la UI para eso, pero sí confirmarlo con una request real.

## Criterio de aceptación
1. Un SUPERADMIN puede subir/cambiar el logo de un tenant desde `TenantDetailPage.tsx`.
2. El backend sigue siendo la única autoridad de validación (tipo de archivo, tamaño, permiso) —
   verificado con requests reales, no solo lectura de código.
3. `npm run typecheck` y `npm run build` limpios.
4. Doble actualización: `CLAUDE.md` frontend + cerebro (ADR, backlog, registro, RUN).
5. Revisión adversarial antes de cerrar (patrón de pedidos directos, dado que toca tenancy + upload
   de archivos + permiso super-admin).

## Resultado
[[ADR-TENANCY-20260812-logo-tenant-superadmin-ui]] · [[RUN-20260812-logo-tenant-superadmin-ui]]
