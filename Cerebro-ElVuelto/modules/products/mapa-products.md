---
tags: [modulo, mapa]
status: vivo
module: products
updated: 2026-08-02
---

# Products — Mapa de código

Tabla `archivo:línea | qué hace | notas`. Base de rutas: `el_vuelto_backend/` y `el_vuelto_frontend/`. Ver contratos en [[contratos-products]], datos en [[datos-products]], formularios en [[formularios-products]].

## Backend — `apps/products/`

| archivo:línea | qué hace | notas |
|---|---|---|
| `models.py:8-10` | `ProductType(TextChoices)` | `SIN_CODIGO` / `CON_CODIGO`. Labels en español. |
| `models.py:13-27` | `Category(TenantMixin)` | UUID PK, `nombre` max100, `imagen_url`/`imagen_public_id` null/blank, `created_at`. `db_table="product_categories"`, `unique_together (tenant,nombre)`. |
| `models.py:30-66` | `Product(TenantMixin)` | UUID PK; `category` FK `SET_NULL` null/blank `related_name="products"`; `nombre` max200; `tipo`; `precio_venta` `DecimalField(10,2)` (NO null); `precio_costo`/`barcode`/`proveedor` null/blank; `stock_actual`/`stock_minimo` `IntegerField(default=0)`; `imagen_url`/`imagen_public_id`; `activo default True`. `db_table="products"`. Constraint `unique_tenant_barcode` condicional (`barcode__isnull=False`) en `:57-63`. |
| `serializers.py:6-11` | `CategorySerializer` | `fields=[id,tenant,nombre,imagen_url,created_at]`; `read_only=[id,tenant,imagen_url,created_at]`. `nombre` writable, `imagen_url` solo por `upload_image`. |
| `serializers.py:13-63` | `ProductSerializer` | `category_nombre` = `CharField(source="category.nombre", read_only)` (:14). `read_only=[id,tenant,imagen_url,created_at,updated_at]`. `stock_actual`/`stock_minimo` writables. |
| `serializers.py:38-55` | `ProductSerializer.validate` | Si `tipo==CON_CODIGO` EXIGE `barcode`+`precio_costo`+`proveedor` (usa instance como fallback en PATCH). **Única capa donde vive esta regla.** |
| `serializers.py:57-63` | `ProductSerializer.validate_category` | Rechaza categoría de otro tenant (`value.tenant_id != request.tenant.id`). Permite `None`. |
| `serializers.py:66-82` | `ProductPOSSerializer` | Minimal para POS: `category = CharField(source="category.nombre", read_only)` → devuelve NOMBRE, no UUID. Campos: id,nombre,tipo,precio_venta,barcode,category,stock_actual,imagen_url. |
| `views.py:13-36` | `CategoryViewSet(TenantModelViewSet)` | `queryset=Category.objects.all().order_by("nombre")`. **SIN `permission_classes`** → default `IsAuthenticated`. Acción `upload_image` (:17-36) sube a Cloudinary folder `elvuelto/categories`. |
| `views.py:39-79` | `ProductViewSet(TenantModelViewSet)` | **SIN `permission_classes`** salvo la acción `pos`. |
| `views.py:42-47` | `ProductViewSet.get_queryset` | OVERRIDE: filtra `tenant=self.request.tenant` a mano + `select_related("category")` + query param `?activo=true/1` → bool. Ignora el `get_queryset` del padre (que igual filtraría por tenant). |
| `views.py:49-68` | `ProductViewSet.upload_image` | Cloudinary folder `elvuelto/products`, `public_id=f"product_{id}"`, guarda `imagen_url`+`imagen_public_id`. |
| `views.py:70-79` | `ProductViewSet.pos` | `@action detail=False GET url_path="pos" permission_classes=[IsCajero]`. Filtra `tenant + activo=True`, usa `ProductPOSSerializer`. NO respeta paginación (Response directa de lista). |
| `urls.py:5-9` | Router DRF | `categories` → CategoryViewSet; `""` (raíz) → ProductViewSet. Montado en `/api/products/` (root `urls.py`). |
| `admin.py` | Django admin | `CategoryAdmin`, `ProductAdmin`. **No usa el serializer → salta la validación CON_CODIGO.** |
| `migrations/0001_initial.py` | Crea Category+Product | Product nacía con `imagen = ImageField` (:44). |
| `migrations/0002_...py` | Cloudinary swap | Quita `product.imagen`; añade `imagen_url`/`imagen_public_id` a ambos modelos. |

## Frontend — `features/products/`

| archivo:línea | qué hace | notas |
|---|---|---|
| `productsApi.ts:3-7` | `interface Category` | `imagen_url` string\|null. **No trae `tenant` ni `created_at`.** |
| `productsApi.ts:9-22` | `interface Product` | `category` UUID\|null + `category_nombre` string\|null; `precio_venta`/`precio_costo` **string**; `stock_actual` number. **NO incluye `stock_minimo` ni `updated_at`.** |
| `productsApi.ts:24-33` | `interface ProductPayload` | Todos opcionales; `precio_venta`/`precio_costo` string; `activo?` (nunca se envía desde el form). |
| `productsApi.ts:39-49` | `interface PosProduct` | `category` = NOMBRE string. |
| `productsApi.ts:53-70` | queries `listProducts`/`getPosProducts`/`listCategories` | `transformResponse` normaliza array o `{results}`. Tags `Product`/`Category`. |
| `productsApi.ts:71-110` | mutations CRUD + upload | create/update/delete product+category, `uploadProductImage`/`uploadCategoryImage` (FormData). Invalidan tag correspondiente. |
| `ProductsPage.tsx:35-43` | `productSchema` (Zod) | `nombre` min2; `category` min1 (REQUERIDO); `tipo` enum; `precio_venta` min1; `precio_costo`/`barcode`/`proveedor` **`.optional()`**. Sin refine CON_CODIGO. |
| `ProductsPage.tsx:46-48` | `categorySchema` (Zod) | Solo `nombre` min2. |
| `ProductsPage.tsx:54-102` | `ProductsPage` (root) | Dual-tab Productos/Categorías (estado local). |
| `ProductsPage.tsx:105-539` | `ProductsTab` | RHF (:124) `defaultValues {tipo:'SIN_CODIGO'}`; `openCreate`/`openEdit` hacen `reset()`; `onSubmit` (:170) arma `ProductPayload` y hace create/update + upload imagen. Agrupa cards por categoría. |
| `ProductsPage.tsx:171-174` | Regla imagen obligatoria (crear) | Front-only: exige `imageFile` al crear. |
| `ProductsPage.tsx:182-184` | Transformación payload | `precio_costo: data.precio_costo \|\| null`; barcode/proveedor → `null` si `SIN_CODIGO`. |
| `ProductsPage.tsx:204-206` | catch `onSubmit` | **`console.error(err)` — traga el 400.** Ver [[errores-400-swallowed-en-forms]]. |
| `ProductsPage.tsx:374-381` | `ConfirmModal` borrar producto | **Inalcanzable:** `setDeletingId` nunca se llama. Ver [[delete-inalcanzable-en-ui]]. |
| `ProductsPage.tsx:542-766` | `CategoriesTab` | RHF (:559) sin defaults; cuenta productos por `p.category` (UUID) en `:563-566`. Mismo patrón de submit + catch tragado (:622-624). ConfirmModal inalcanzable (:708-715). |
| `ProductsPage.tsx:768-923` | `CategorySelect` | Dropdown custom con imagen de categoría; escribe UUID en RHF vía `setValue('category', id)`. |
| `ProductsPage.tsx:937-1094` | `CameraScanner` | Escaneo por cámara: `BarcodeDetector` nativo o fallback `@zxing/browser`. |
| `ProductsPage.tsx:1099-1282` | `BarcodeField` | Máquina de estados idle/scanning/scanned para lector físico (buffer + timeout 2s) + botón cámara. |
| `ProductsPage.tsx:1285-1318` | `PriceInput` + `formatThousands` | Muestra separador de miles con puntos; envía dígitos crudos (string). Toma solo parte entera. |
| `ProductsPage.tsx:1331-1395` | `ImageUploadField` | Click o `Ctrl+V` (paste) para imagen; máx 2 MB (solo texto, no valida tamaño). |
| `ProductsPage.tsx:1432-1440` | `ShoppingBagIcon` | **Componente muerto, no se usa.** |
| `ProductsPage.module.css:1` | — | Vacío: "No longer used — styles live in tenant-admin.css". El TSX usa clases `ta-*`. |
| `app/router.tsx:90-96` | Ruta `/products` | Dentro de `ProtectedRoute allowedRoles={['ADMIN']}` → `AdminLayout`. Guarda solo el FRONT, no la API. |
