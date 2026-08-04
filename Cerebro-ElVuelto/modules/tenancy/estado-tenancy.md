---
tags: [modulo, estado]
status: vivo
module: tenancy
updated: 2026-08-02
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
- 🔴 **`toggleTenantActive` es un endpoint fantasma:** `tenantsApi.ts:77` hace `POST /tenants/{id}/toggle_active/` pero `TenantViewSet` (views.py:47) NO tiene esa acción → 404 si alguien la cablea. Hook `useToggleTenantActiveMutation` exportado pero SIN uso. Ver [[riesgo-toggle-active-fantasma]].
- 🔴 **Creación de tenant no es atómica:** `serializers.py:49-56` crea el Tenant y luego el ADMIN sin `@transaction.atomic` → correo de admin duplicado deja tenant huérfano + 500. Ver [[riesgo-creacion-tenant-no-atomica]].
- 🟡 **Sin UI para subir logo del tenant:** backend (`views.py:60`) y hook (`uploadTenantLogo`) existen; ninguna pantalla los usa. Ver [[riesgo-logo-tenant-sin-ui]].
- 🟡 **Errores 400 por campo (NIT/correo únicos) se pierden en un toast genérico** en `index.tsx:68,91`. Ver [[riesgo-errores-400-silenciados]].
- 🟡 **Slug por nombre:** back `_nombre_to_slug` (views.py:16) y front `toSlug` (UsersPage.tsx:30) divergen en espacios múltiples; ninguno translitera tildes. Ver [[riesgo-slug-por-nombre]].
- 🟡 **`features/tenants/TenantsPage.tsx` es un shim muerto** (re-export de super-admin). El `.module.css` hermano tampoco se usa.
- ❓ Interfaz TS `Tenant` (tenantsApi.ts:10) NO incluye `updated_at`, que sí devuelve el serializer. Ver [[preguntas-tenancy]] P-6.
