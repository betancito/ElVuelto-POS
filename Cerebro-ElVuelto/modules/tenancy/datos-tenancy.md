---
tags: [modulo, datos]
status: vivo
module: tenancy
updated: 2026-08-30
---

# Tenancy — Datos (modelos y BD)

Fuente: `apps/tenants/models.py` + migraciones `0001`–`0005`. *(Re-anclado el 2026-08-30: decía `0001`–`0003` y ya van cinco.)*

## Modelo `Tenant` (`models.py:6-23`, `db_table="tenants"`)

| campo | tipo | null/blank | default | constraint | notas |
|---|---|---|---|---|---|
| `id` | UUIDField | — | `uuid.uuid4` | PK, `editable=False` | |
| `nombre` | CharField(200) | no/no | — | — | usado para generar slug de login |
| `nit` | CharField(20) | no/no | — | **`unique=True`** | genera UniqueValidator en serializer |
| `ciudad` | CharField(100) | no/no | — | — | |
| `correo` | EmailField(254) | no/no | — | **`unique=True`** | del negocio (≠ correo del admin) |
| `support_number` | CharField(20) | **sí/sí** | — | — | agregado en `0003` |
| `factura_electronica` | BooleanField | no | **`False`** | — | agregado en `0005`. Gobierna el bloque «¿Requiere factura electrónica?» del recibo (pregunta + `correo` + `support_number`). **Opt-in a propósito**, ver [[ADR-TENANCY-20260830-factura-electronica-por-tenant]]. Escribible solo por el super admin |
| `activo` | BooleanField | no | `True` | — | escribible por PATCH; el middleware solo resuelve tenants `activo=True` |
| `created_at` | DateTimeField | — | `auto_now_add` | — | |
| `updated_at` | DateTimeField | — | `auto_now` | — | |

- **Meta:** `db_table="tenants"`, verbose_name. ⚠️ **sin `ordering`** en el modelo; el orden alfabético lo pone la vista (`views.py:50` `.order_by("nombre")`).
- **Sin `clean()`.** Validación = solo lo que impone el serializer/BD (unicidad, max_length, formato email). No hay reglas de negocio en el modelo.

## Modelo `TenantDocument` (`models.py:26-55`, `db_table="tenant_documents"`)

| campo | tipo | null/blank | default | notas |
|---|---|---|---|---|
| `id` | UUIDField | — | `uuid.uuid4` | PK |
| `tenant` | FK→Tenant | no | — | `on_delete=CASCADE`, `related_name="documents"` |
| `document_type` | CharField(50) | no | `LOGO` | `choices=DocumentType` (**solo `("logo","Logo")`**) |
| `cloudinary_public_id` | CharField(255) | no/no | — | necesario para overwrite/borrado |
| `cloudinary_url` | URLField(**500**) | no/no | — | |
| `created_at`/`updated_at` | DateTimeField | — | auto | |

- **`unique_together = [("tenant","document_type")]`** ⇒ un tenant tiene a lo sumo 1 logo. El `update_or_create` de `upload_logo` (views.py:76) respeta esto.
- `logo_url` NO es campo: es `SerializerMethodField` que busca el primer doc `LOGO` (`serializers.py:27`).
- No registrado en Django admin.

## `TenantMixin` (`models.py:58-68`, ABSTRACTO)
- Solo agrega FK `tenant` → `"tenants.Tenant"`, `on_delete=CASCADE`, `related_name="%(app_label)s_%(class)s_set"` (p.ej. `products_product_set`).
- `Meta.abstract = True`. **NO** define manager ni queryset auto-filtrado: el filtrado real lo hace `TenantModelViewSet` en la capa API, no el ORM. ⚠️ Un `Model.objects.all()` directo NO está filtrado por tenant — el aislamiento es solo a nivel de vista.
- Aplicado a: `Category`, `Product` (products), `InventoryMovement` (inventory), `Sale` (sales). Ver [[mapa-tenancy]].

## Migraciones clave (explican el estado actual)
- `0001_initial`: crea `Tenant` **con** `logo = ImageField(upload_to="tenants/logos/")` (almacenamiento local, hoy eliminado).
- `0002_add_tenant_documents`: crea `TenantDocument` + `unique_together`. Marca el giro de logo local → Cloudinary.
- `0004_tenant_slug`: agrega `slug` (persistido, `editable=False`) con backfill ordenado por `created_at`. Ver [[ADR-TENANCY-20260809-slug-persistido]].
- `0005_tenant_factura_electronica`: agrega `factura_electronica` (`BooleanField(default=False)`). `AddField` con default, sin `RunPython`: Postgres 11+ no reescribe la tabla. **El default apaga el bloque del recibo en todos los negocios existentes** — decisión del owner, ver el ADR.
- `0003_remove_tenant_logo_tenant_support_number`: **quita `Tenant.logo`** (ya migrado a `TenantDocument`) y **agrega `support_number`**. El CLAUDE.md del backend lista el modelo Tenant SIN `support_number` — drift documental menor.

## Dónde vive cada validación
| regla | dónde | evidencia |
|---|---|---|
| `nit` único | serializer (UniqueValidator auto de `unique=True`) + BD | `models.py:9` |
| `correo` único | serializer + BD | `models.py:11` |
| `max_length` de cada Char | serializer (400 si excede) | `models.py:8-12` |
| `(tenant, document_type)` único | BD (`unique_together`) | `models.py:52` |
| `admin_nombre` min 2 | serializer (`min_length=2`) | `serializers.py:35` |
| unicidad de `admin_correo` (User) | **solo BD** (create_user, sin validación previa) ⇒ IntegrityError/500 | `serializers.py:62-68` |
| reglas de negocio del Tenant | **en ninguna parte** (sin `clean()`) | — |
