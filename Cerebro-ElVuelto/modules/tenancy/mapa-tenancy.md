---
tags: [modulo, mapa]
status: vivo
module: tenancy
updated: 2026-08-02
---

# Tenancy — Mapa de código

Anclas verificadas leyendo el código. Ver contratos en [[contratos-tenancy]], datos en [[datos-tenancy]].

## Backend — `apps/tenants/`

| archivo:línea | qué hace | notas |
|---|---|---|
| `models.py:6-23` | Modelo `Tenant` (UUID pk, nombre, nit único, ciudad, correo único, support_number, activo, timestamps) | `db_table="tenants"`; sin `ordering` en Meta |
| `models.py:26-55` | Modelo `TenantDocument` (logo Cloudinary) | `unique_together (tenant, document_type)`; `db_table="tenant_documents"`; choices solo `LOGO` |
| `models.py:58-68` | `TenantMixin` **abstracto**: agrega FK `tenant` | `related_name="%(app_label)s_%(class)s_set"`; NO manager, NO queryset propio |
| `middleware.py:6-21` | `_resolve_tenant(request)`: lee Bearer, `AccessToken.get("tenant_id")`, `Tenant.filter(id, activo=True).first()` | devuelve `None` si no hay token/tenant_id (flujo superadmin); `except (TokenError, Exception)` traga todo |
| `middleware.py:23-31` | `TenantMiddleware`: setea `request.tenant = SimpleLazyObject(...)` | perezoso; solo se resuelve al acceder |
| `viewsets.py:5-24` | `TenantModelViewSet` (base de products/inventory) | `_get_tenant` lanza `PermissionDenied` si None; `get_queryset` filtra por tenant; `perform_create` guarda tenant |
| `views.py:16-17` | `_nombre_to_slug`: `re.sub("[^a-z0-9-]", "", nombre.lower().replace(" ", "-"))` | NO translitera tildes; solo reemplaza espacio literal |
| `views.py:20-44` | `TenantBySlugView` (APIView, `AllowAny`, `authentication_classes=[]`) | itera TODOS los tenants activos O(n) comparando slug; expone `{exists,id,nombre,logo_url}` |
| `views.py:47-58` | `TenantViewSet` (ModelViewSet, siempre `IsSuperAdmin`) | `get_serializer_class`: create→`TenantCreateSerializer`, resto→`TenantSerializer`; queryset ordenado por nombre |
| `views.py:60-85` | acción `upload_logo` (`POST`, `IsSuperAdmin`) | sube a Cloudinary `elvuelto/tenants/logos`, `update_or_create` del `TenantDocument` |
| `serializers.py:8-29` | `TenantSerializer` | `logo_url` = `SerializerMethodField` (primer doc LOGO); `read_only`: id, created_at, updated_at |
| `serializers.py:32-69` | `TenantCreateSerializer(TenantSerializer)` | `admin_nombre`/`admin_correo` write_only; `initial_admin_password` read_only; `create` genera `secrets.token_urlsafe(12)` y crea User ADMIN |
| `urls.py:6-12` | `DefaultRouter` en `r""` + path `check-by-slug/<slug>/` | montado bajo `/api/tenants/` (elvuelto/urls.py) |
| `admin.py:6-11` | `TenantAdmin` (Django admin) | list_display/search/filter; `TenantDocument` NO registrado |
| `migrations/0001` | crea Tenant (con campo `logo ImageField`, luego removido) | — |
| `migrations/0002` | crea `TenantDocument` + `unique_together` | — |
| `migrations/0003` | quita `Tenant.logo`, agrega `support_number` | estado actual del modelo |

**Consumidores del backbone de aislamiento** (fuera de tenancy, NO se documentan aquí):
- `TenantMixin`: `products/models.py:13,30` (Category, Product), `inventory/models.py:14`, `sales/models.py:15`.
- `TenantModelViewSet`: `products/views.py:13,39`, `inventory/views.py`.
- `request.tenant`: products/inventory/sales/reports/users serializers y views (ver grep en [[contratos-tenancy]]).

## Frontend

| archivo:línea | qué hace | notas |
|---|---|---|
| `features/tenants/tenantsApi.ts:46-82` | inyecta 7 endpoints RTK Query en `apiBase` | tag `Tenant`; ver [[contratos-tenancy]] |
| `features/tenants/tenantsApi.ts:3-44` | tipos TS: `TenantSlugCheck`, `Tenant`, `CreateTenantArgs`, `CreateTenantResponse`, `UpdateTenantArgs` | `Tenant` sin `updated_at` |
| `features/tenants/TenantsPage.tsx:1-3` | **shim muerto**: `export { default } from '@/features/super-admin/tenants'` | no lo importa nadie salvo re-export |
| `features/super-admin/tenants/index.tsx:42` | **página viva** `TenantsPage`: tabla + modales crear/editar + credenciales | ruta `/super-admin/tenants` (router.tsx:54) |
| `features/super-admin/tenants/index.tsx:21-37` | `createSchema` / `editSchema` Zod | estáticos; ver [[formularios-tenancy]] |
| `features/super-admin/tenants/components/TenantsTable.tsx:12` | tabla read-only con logo, estado (Badge) y botón editar | única acción de fila = editar |
| `features/super-admin/tenants/components/PasswordBanner.tsx:10` | banner de contraseña | **definido pero NO usado** por index.tsx (usa `CredentialsModal`) |
| `features/super-admin/tenants/TenantsPage.module.css` | estilos de la página viva | usa `.module.css`, NO `ta-*` |
| `app/apiBase.ts:8-13` | `prepareHeaders` agrega `Authorization` solo si hay token | por eso `check-by-slug` sale sin auth cuando el staff no está logueado |
| `app/router.tsx:18,54` | importa y monta `TenantsPage` en `/super-admin/tenants` (SUPERADMIN) | — |

**Consumidores del API tenants** (otros módulos): `auth/StaffLoginPage.tsx:71` (`useCheckTenantBySlugQuery`), `super-admin/home/components/StatsGrid.tsx:5` (`useListTenantsQuery`). Slug del staff se genera en `users/UsersPage.tsx:30` (`toSlug`).
