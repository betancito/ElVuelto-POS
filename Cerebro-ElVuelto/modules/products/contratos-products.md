---
tags: [modulo, contratos, api]
status: vivo
module: products
updated: 2026-08-02
---

# Products — Contratos (endpoints)

Router DRF (`apps/products/urls.py`) montado en `/api/products/` (root `elvuelto/urls.py:11`).
`categories` → `CategoryViewSet`; raíz `""` → `ProductViewSet`.

> [!warning] Permiso real ≠ CLAUDE.md
> Ni `CategoryViewSet` ni `ProductViewSet` declaran `permission_classes`. Aplica el **default DRF `IsAuthenticated`** (`base.py:97-99`). Solo la acción `pos` fuerza `IsCajero`. El CLAUDE.md del backend afirma `IsAdmin` para create/update/delete: **es falso en el código**. → [[permisos-viewsets-sin-isadmin]].

## Aislamiento por tenant
- `TenantMiddleware` inyecta `request.tenant` desde el JWT.
- `CategoryViewSet`: hereda `TenantModelViewSet.get_queryset` → `.filter(tenant=request.tenant)`; si `request.tenant is None` lanza `PermissionDenied` (403), no 404.
- `ProductViewSet.get_queryset` (`views.py:42-47`): filtra `tenant` a MANO (no llama a `super()`), sin el guard de `PermissionDenied` del padre → si `request.tenant is None`, `Product.objects.filter(tenant=None)` devolvería lista vacía en vez de 403. Divergencia sutil de comportamiento vs Category.
- `perform_create` (heredado): setea `tenant=request.tenant` automáticamente (por eso `tenant` es read_only en los serializers).

## Categorías — `/api/products/categories/`

| método | ruta | vista (archivo:línea) | permiso REAL | request | response | errores |
|---|---|---|---|---|---|---|
| GET | `/categories/` | `CategoryViewSet` list (`views.py:13`) | IsAuthenticated | — | paginado `{count,next,previous,results:[Category]}` (PAGE_SIZE=50) | 401, 403 si tenant None |
| POST | `/categories/` | create | IsAuthenticated | `{nombre}` | `Category` (id,tenant,nombre,imagen_url,created_at) | 400 (unicidad ❓ P-3), 401 |
| GET | `/categories/{id}/` | retrieve | IsAuthenticated | — | `Category` | 404, 401 |
| PATCH | `/categories/{id}/` | partial_update | IsAuthenticated | `{nombre}` | `Category` | 400, 404 |
| DELETE | `/categories/{id}/` | destroy | IsAuthenticated | — | 204 | 404. Productos quedan con `category=NULL` (SET_NULL). |
| POST | `/categories/{id}/upload_image/` | `upload_image` (`views.py:17-36`) | IsAuthenticated | `multipart` campo `image` | `{imagen_url}` 200 | 400 `{error:"No image provided."}` |

`Category` serializada: `{id, tenant, nombre, imagen_url, created_at}` (`serializers.py:9`). Nota: el TS del front (`productsApi.ts:3-7`) solo tipa `{id, nombre, imagen_url}`.

## Productos — `/api/products/`

| método | ruta | vista (archivo:línea) | permiso REAL | request | response | errores |
|---|---|---|---|---|---|---|
| GET | `/products/` | `ProductViewSet` list (`views.py:39`) | IsAuthenticated | query `?activo=true\|false\|1\|0` (`views.py:44-46`) | paginado `{...,results:[Product]}` | 401 |
| POST | `/products/` | create | IsAuthenticated | ver payload abajo | `Product` | 400 (validate CON_CODIGO / category otro tenant / barcode duplicado ❓), 401 |
| GET | `/products/{id}/` | retrieve | IsAuthenticated | — | `Product` | 404 |
| PATCH | `/products/{id}/` | partial_update | IsAuthenticated | payload parcial | `Product` | 400, 404 |
| DELETE | `/products/{id}/` | destroy | IsAuthenticated | — | 204 | 404. FK desde `SaleItem`/`InventoryMovement` es `PROTECT` → borrar producto con historial → 500/IntegrityError. Ver [[products--sales]] / [[products--inventory]]. |
| POST | `/products/{id}/upload_image/` | `upload_image` (`views.py:49-68`) | IsAuthenticated | `multipart` campo `image` | `{imagen_url}` 200 | 400 sin imagen |
| GET | `/products/pos/` | `pos` (`views.py:70-79`) | **IsCajero** (CAJERO/ADMIN/SUPERADMIN) | — | **lista SIN paginar** `[PosProduct]` | 401, 403 |

### Payload create/update Product (writable en `ProductSerializer`)
```
nombre         string  (req)
tipo           "SIN_CODIGO"|"CON_CODIGO" (req)
precio_venta   decimal string  (req, DecimalField 10,2)
category       UUID | null     (opcional en back; front lo exige)
precio_costo   decimal | null  (req si CON_CODIGO)
barcode        string | null   (req si CON_CODIGO; único por tenant si no-null)
proveedor      string | null   (req si CON_CODIGO)
stock_actual   int             (writable, default 0 — el front NO lo envía)
stock_minimo   int             (writable, default 0 — el front NO lo envía ni lo tipa)
activo         bool            (writable — el front NO lo envía)
```
Read-only en respuesta: `id, tenant, category_nombre, imagen_url, created_at, updated_at`.

### Respuesta `Product` (`serializers.py:18-35`)
`{id, tenant, category, category_nombre, nombre, tipo, precio_venta, precio_costo, barcode, proveedor, stock_actual, stock_minimo, imagen_url, activo, created_at, updated_at}`.

### Respuesta `PosProduct` (`serializers.py:73-82`)
`{id, nombre, tipo, precio_venta, barcode, category(nombre), stock_actual, imagen_url}`. Ver consumidor en [[products--sales]] (`PosPage`).

## Errores de validación relevantes
- `serializers.py:47-52` → 400 `{barcode/precio_costo/proveedor: "Requerido para productos CON_CODIGO."}`.
- `serializers.py:62` → 400 `{category: "La categoría no pertenece a este tenant."}` (non_field vía `validate_category`).
- Unicidad `(tenant,nombre)` y `unique_tenant_barcode`: **❓ POR CONFIRMAR** si sale 400 limpio o 500 IntegrityError (el serializer no declara validadores de unicidad explícitos y `tenant` es read_only). → [[preguntas-products]] P-3.
