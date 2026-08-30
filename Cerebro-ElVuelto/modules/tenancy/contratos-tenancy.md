---
tags: [modulo, contratos]
status: vivo
module: tenancy
updated: 2026-08-30
---

# Tenancy — Contratos (endpoints)

Base: `/api/tenants/` (montado en `elvuelto/urls.py`). Router `DefaultRouter` en `r""` ⇒ el ViewSet vive en la raíz de ese prefijo.

## Endpoints

### 1. Check por slug (PÚBLICO)
- **GET** `/api/tenants/check-by-slug/<slug>/`
- Vista: `views.py:20` `TenantBySlugView` · Permiso: **`AllowAny`** + `authentication_classes=[]` (ignora cualquier Bearer)
- Request: path param `slug` (string)
- Response 200 (existe): `{ "exists": true, "id": "<uuid>", "nombre": "...", "logo_url": "<url|null>" }`
- Response 200 (no existe): `{ "exists": false, "nombre": null, "logo_url": null }` ⚠️ **omite la clave `id`** (la interfaz TS `TenantSlugCheck` la declara `string|null`)
- Filtrado tenant: N/A. Itera `Tenant.objects.filter(activo=True)` y compara `_nombre_to_slug(nombre) == slug` → O(n), devuelve el primer match. Solo expone datos no sensibles.
- Llamado por: `features/auth/StaffLoginPage.tsx:71` (`useCheckTenantBySlugQuery`, `skip` si no hay slug). Conexión [[tenancy--auth]].

### 2. Listar tenants
- **GET** `/api/tenants/` · Vista: `TenantViewSet.list` (`views.py:47`) · Permiso: **`IsSuperAdmin`**
- Response: lista paginada DRF (`PageNumberPagination`, PAGE_SIZE 50) → `{count,next,previous,results:[TenantSerializer]}`; el front normaliza array-o-`{results}` (`tenantsApi.ts:53`).
- `TenantSerializer` fields: `id, nombre, nit, ciudad, correo, support_number, activo, logo_url, created_at, updated_at`.
- Filtrado tenant: NO aplica; superadmin ve TODOS. `provides Tag Tenant`.
- Llamado por: `index.tsx:43`, `StatsGrid.tsx:5`.

### 3. Detalle
- **GET** `/api/tenants/{id}/` · `TenantViewSet.retrieve` · **`IsSuperAdmin`**
- Response: `TenantSerializer`. Hook `useGetTenantQuery` exportado pero **sin uso** en el front.

### 4. Crear tenant (+ ADMIN inicial)
- **POST** `/api/tenants/` · Serializer: `TenantCreateSerializer` (`serializers.py:32`) · **`IsSuperAdmin`**
- Request: `{ nombre, nit, ciudad, correo, support_number?, admin_nombre, admin_correo }` (`admin_*` write_only)
- Efecto: crea `Tenant`, genera `secrets.token_urlsafe(12)`, crea `User` rol ADMIN (`is_staff=True`) vía `create_user`. ⚠️ **sin `@transaction.atomic`** → ver [[riesgo-creacion-tenant-no-atomica]].
- Response 201: `TenantSerializer` + `initial_admin_password` (texto plano, una sola vez).
- Errores: 400 por `nit`/`correo` duplicados o `max_length` (UniqueValidator/CharField del serializer); si `admin_correo` ya existe como User → IntegrityError → **500** (no 400). El front traga el 400 en toast genérico (`index.tsx:68`) — [[riesgo-errores-400-silenciados]].
- Llamado por: `index.tsx:57` (`useCreateTenantMutation`), invalida tag `Tenant`.

### 5. Editar tenant
- **PATCH** `/api/tenants/{id}/` · `TenantViewSet.partial_update` · **`IsSuperAdmin`**
- Request (todos opcionales): `{ nombre, nit, ciudad, correo, support_number, activo }`. `activo` ES escribible aquí ⇒ el toggle de estado se hace por este PATCH, no por un endpoint dedicado.
- Response: `TenantSerializer`. Llamado por `index.tsx:87` con `{id, ...data, activo}`.

### 6. Subir logo
- **POST** `/api/tenants/{id}/upload_logo/` · acción `views.py:60` · **`IsSuperAdmin`**
- Request: `multipart/form-data` campo `logo` (archivo imagen). Sin archivo → 400 `{"error":"No image provided."}`.
- Efecto: Cloudinary upload (folder `elvuelto/tenants/logos`, `public_id=tenant_{id}_logo`, overwrite) + `TenantDocument.update_or_create`.
- Response 200: `{ "logo_url": "<secure_url>" }`.
- Hook `useUploadTenantLogoMutation` exportado pero **ninguna pantalla lo invoca** → [[riesgo-logo-tenant-sin-ui]].

### 7. ⚠️ toggle_active — FANTASMA (no existe en backend)
- El front declara **POST** `/api/tenants/{id}/toggle_active/` (`tenantsApi.ts:77`) + hook `useToggleTenantActiveMutation`.
- **`TenantViewSet` NO tiene acción `toggle_active`** (solo `upload_logo`). Cualquier llamada daría **404**. Hook sin uso hoy. → [[riesgo-toggle-active-fantasma]].

## Borrado
- **DELETE** `/api/tenants/{id}/` existe vía `ModelViewSet` (destroy, `IsSuperAdmin`), pero el front NO expone botón de borrar ni endpoint RTK Query. `Tenant` no tiene `on_delete` protector; borrar cascada a `TenantDocument` y a todo lo que cuelga de `TenantMixin` (products/sales/inventory) por `CASCADE`. ❓ ver [[preguntas-tenancy]] P-7.

## Cómo se filtra el tenant (backbone)
El aislamiento NO vive en este módulo de endpoints sino en 3 piezas reutilizadas: `TenantMiddleware` (`request.tenant` desde JWT), `TenantMixin` (FK), `TenantModelViewSet` (`get_queryset().filter(tenant=...)`). Consumido por products/inventory/sales/reports/users — ver grep en [[mapa-tenancy]]. Superadmin tiene `tenant=None` y omite el filtro vía `IsSuperAdmin`.

> [!warning] Re-anclado el 2026-08-30 — falta `factura_electronica` en las listas de arriba
> `TenantSerializer.Meta.fields` es una lista **explícita** y desde el 2026-08-30 incluye
> `factura_electronica` (`BooleanField`, `default=False`, escribible por PATCH, no está en
> `read_only_fields`). `TenantCreateSerializer` lo hereda vía `Meta(TenantSerializer.Meta)`, así que
> también se acepta en el `POST`. Y el payload de login (`_user_payload`) suma la clave
> `tenant_factura_electronica`, que es `None` para un superadmin sin tenant.
> Ver [[ADR-TENANCY-20260830-factura-electronica-por-tenant]].

