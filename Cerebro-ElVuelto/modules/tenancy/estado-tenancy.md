---
tags: [modulo, estado]
status: vivo
module: tenancy
updated: 2026-08-15
---

# Tenancy — Estado

**Semáforo:** 🟢 documentado (backend + super-admin CRUD)
**App back:** `apps/tenants` (~303 LOC) · **Feature front:** `features/super-admin/tenants` + `features/tenants` (~363 LOC) · **Complejidad:** 🟡

## Punteros
- Código: [[mapa-tenancy]] · Endpoints: [[contratos-tenancy]] · Datos: [[datos-tenancy]] · Formularios: [[formularios-tenancy]]
- Preguntas abiertas: [[preguntas-tenancy]]
- Riesgos: [[riesgo-toggle-active-fantasma]] · [[riesgo-creacion-tenant-no-atomica]] · [[riesgo-slug-por-nombre]] · [[riesgo-errores-400-silenciados]] · [[riesgo-logo-tenant-sin-ui]]
- Conexiones: `[[tenancy--auth]]` · `[[tenancy--users]]` · `[[tenancy--products]]` (isolation backbone: products/inventory/sales/reports)

## Qué es (3-5 líneas)
Núcleo de multi-tenancy. Define el modelo `Tenant` (negocio/sucursal, PK UUID), su logo en Cloudinary (`TenantDocument`), y los tres artefactos de aislamiento que consume TODO el backend: `TenantMixin` (FK abstracta), `TenantMiddleware` (inyecta `request.tenant` desde el JWT) y `TenantModelViewSet` (auto-filtra por tenant). En el front, el super-admin crea/edita negocios (`features/super-admin/tenants/index.tsx`) y la creación devuelve la contraseña inicial del ADMIN una sola vez. `check-by-slug/` es el único endpoint público (lo usa el login de staff, módulo [[auth]]).

## Pendientes / drift doc↔código
_(esta nota está desactualizada en general — actualizado 2026-08-09 solo en lo tocado hoy; el resto sigue reflejando el estado de 2026-08-02 y puede no ser cierto: `toggle_active` fantasma, creación no atómica, y el shim de `TenantsPage.tsx` fueron cerrados en sesiones intermedias — ver [[00-planeacion]] para el estado real de cada ítem antes de confiar en las líneas de abajo)_

- 🟢 ~~**Slug por nombre**~~ — **cerrado 2026-08-09**: `Tenant.slug` ahora persiste, único, generado una vez por `Tenant.save()` (`apps/tenants/slugs.py`), inmutable ante rename. `TenantBySlugView` pasó de O(n) a `filter(slug=..., activo=True)`. Ver [[ADR-TENANCY-20260809-slug-persistido]] · [[RUN-20260809-slug-persistido]] · [[riesgo-slug-por-nombre]].
- 🟡 **Hallazgo nuevo (menor, no bloqueante):** `Tenant.save()` genera el slug con un `SELECT ... EXISTS()` sin lock — dos `POST /api/tenants/` concurrentes con el mismo `nombre` pueden generar el mismo slug candidato y el segundo INSERT choca contra el `unique=True`, saliendo como **500** (no 400, porque `IntegrityError` no lo mapea DRF) en vez de un 400 limpio. Sin corrupción de datos, sin fuga cross-tenant — solo UX del error. Ver [[TENANCY-20260809-race-slug-integrity-error]].
- 🟢 ~~**Sin UI para subir logo del tenant**~~ — **cerrado 2026-08-12**: control tipo avatar en el
  header de `TenantDetailPage.tsx`, cableado al hook `useUploadTenantLogoMutation` que ya existía.
  Ver [[ADR-TENANCY-20260812-logo-tenant-superadmin-ui]] · [[RUN-20260812-logo-tenant-superadmin-ui]]
  · [[riesgo-logo-tenant-sin-ui]].
- 🟢 **Logo también en los modales de crear/editar — 2026-08-12 (más tarde el mismo día).** Subida
  **diferida** (se aplica al dar Crear/Guardar; Cancelar descarta) y se puede **quitar** el logo, lo
  que agregó `DELETE /api/tenants/{id}/logo/` (`IsSuperAdmin`, idempotente, 204) y el helper
  `destroy_image` en `elvuelto/cloudinary_uploads.py`. El `POST /api/tenants/` sigue en **JSON** a
  propósito: multipart dispararía `BooleanField.default_empty_html=False` y el negocio nacería
  inactivo. Ver [[ADR-TENANCY-20260812-logo-tenant-modales-crear-editar]] ·
  [[RUN-20260812-logo-tenant-modales-crear-editar]].
- 🟢 **Pegar el logo con ⌘V / Ctrl+V — 2026-08-15.** Segundo camino de entrada al mismo `LogoDraft`, en
  los dos modales. El listener va en `document` (no en el `<form>`: un `paste` apunta al elemento con
  foco, así que el handler del form no dispara hasta que algo adentro lo tenga — el gesto natural es
  abrir y pegar). Regla imagen-vs-texto para no robarle el ⌘V a quien está escribiendo, y
  `toast.success` obligatorio porque el pegado **se come la tecla** y es el único camino que carga un
  archivo que el usuario nunca vio. Cero backend. Ver
  [[ADR-TENANCY-20260815-pegar-logo-portapapeles]] · [[RUN-20260815-pegar-logo-portapapeles]].
  ⚠️ El ⌘V real no se pudo ejecutar (sin navegador en el entorno) — falta confirmación visual del owner.
- 🔴 **Deuda de a11y en `TenantsTable.tsx`** (y replicada en `TenantDetailPage.tsx`): `role="button"`
  sobre el `<tr>` poda las celdas del árbol de accesibilidad. Viene del trabajo del 08-09 y **ya está
  commiteada en `9727c03`** — es deuda en `main`, no trabajo pendiente de commitear (corregido en el
  PASO 0 del 2026-08-13). Ver [[FRONT-20260812-role-button-en-tr-rompe-tabla]].
- 🔴 **N+1 en `TenantSerializer.get_logo_url`** — el `prefetch_related("documents")` no sirve porque el
  serializer usa `.filter()` sobre el related manager. Ver [[BACKEND-20260812-n1-logo-url-listado-tenants]].
- 🟡 **Errores 400 por campo se pierden en un toast genérico** en `index.tsx`. Ver [[riesgo-errores-400-silenciados]] (sin re-verificar hoy).
- ❓ Interfaz TS `Tenant` (tenantsApi.ts) — ver [[preguntas-tenancy]] P-6 (sin re-verificar hoy).
