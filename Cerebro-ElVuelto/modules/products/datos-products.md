---
tags: [modulo, datos, modelos]
status: vivo
module: products
updated: 2026-08-02
---

# Products — Datos (modelos y BD)

Fuente: `apps/products/models.py`. Ambos modelos usan `TenantMixin` (`apps/tenants/models.py:60-72`) que añade FK `tenant` → `tenants.Tenant`, `on_delete=CASCADE`, `related_name="%(app_label)s_%(class)s_set"` (ej. `products_product_set`, `products_category_set`).

## `ProductType` (TextChoices) — `models.py:8-10`
| valor | label |
|---|---|
| `SIN_CODIGO` | Sin código de barras |
| `CON_CODIGO` | Con código de barras |

Regla de negocio (no está en el modelo): `SIN_CODIGO` = venta suelta sin stock; `CON_CODIGO` = barcode + stock unitario controlado por [[inventory]]. La distinción se USA en [[sales]] (solo `CON_CODIGO` valida stock) y en el form (muestra/oculta campos).

## `Category` — `models.py:13-27`
| campo | tipo | null/blank | default | notas |
|---|---|---|---|---|
| `id` | UUIDField PK | — | `uuid.uuid4` | `editable=False` |
| `tenant` | FK Tenant | no | — | de TenantMixin, CASCADE |
| `nombre` | CharField(100) | no | — | |
| `imagen_url` | URLField(500) | sí/sí | — | escrito solo por `upload_image` |
| `imagen_public_id` | CharField(255) | sí/sí | — | Cloudinary; NO en serializer |
| `created_at` | DateTimeField | — | `auto_now_add` | |

- `db_table = "product_categories"`.
- `unique_together = [("tenant", "nombre")]` → nombre único por tenant.
- **Sin `ordering` en Meta**; el orden viene del viewset (`order_by("nombre")`).
- Sin `updated_at`.

## `Product` — `models.py:30-66`
| campo | tipo | null/blank | default | notas |
|---|---|---|---|---|
| `id` | UUIDField PK | — | `uuid.uuid4` | |
| `tenant` | FK Tenant | no | — | CASCADE (TenantMixin) |
| `category` | FK Category | sí/sí | — | `on_delete=SET_NULL`, `related_name="products"` |
| `nombre` | CharField(200) | no | — | |
| `tipo` | CharField(20) choices | no | — | sin default → obligatorio |
| `precio_venta` | DecimalField(10,2) | **no** | — | precio final IVA incluido (regla en UI, no en modelo) |
| `precio_costo` | DecimalField(10,2) | sí/sí | — | req si CON_CODIGO (solo serializer) |
| `barcode` | CharField(100) | sí/sí | — | único por tenant si no-null |
| `proveedor` | CharField(200) | sí/sí | — | req si CON_CODIGO (solo serializer) |
| `stock_actual` | IntegerField | — | `0` | lo mueve [[inventory]] vía `F()`; el form de products NO lo toca |
| `stock_minimo` | IntegerField | — | `0` | umbral bajo-stock; NO expuesto en el front de products |
| `imagen_url` | URLField(500) | sí/sí | — | Cloudinary via `upload_image` |
| `imagen_public_id` | CharField(255) | sí/sí | — | NO en serializer |
| `activo` | BooleanField | — | `True` | filtrable con `?activo=`; el form NO lo edita |
| `created_at` | DateTimeField | — | `auto_now_add` | |
| `updated_at` | DateTimeField | — | `auto_now` | |

- `db_table = "products"`.
- Constraint `unique_tenant_barcode` (`models.py:57-63`): `UniqueConstraint(fields=["tenant","barcode"], condition=Q(barcode__isnull=False))` → barcode único por tenant, pero permite múltiples `barcode=NULL` (los `SIN_CODIGO`).
- **Sin `ordering` en Meta**; orden vía viewset `order_by("nombre")`.

## Relaciones salientes/entrantes
- `Product.category` → `Category` (SET_NULL): borrar categoría deja productos con `category=NULL` (front los agrupa como "Sin categoría", `ProductsPage.tsx:266`).
- `Category.products` (reverse) — usado por `related_name="products"`.
- **Entrantes (otros módulos):** `InventoryMovement.product` FK PROTECT ([[products--inventory]]) y `SaleItem.product` FK PROTECT ([[products--sales]]). ⇒ un `Product` con historial NO se puede borrar (IntegrityError). `SaleItem.product_nombre` guarda snapshot del nombre.

## Migraciones clave
- `0001_initial.py` (2026-04-12): crea `Category` + `Product`. Product nacía con `imagen = ImageField(upload_to="products/")` (:44) — almacenamiento local.
- `0002_...` (2026-04-22): **swap a Cloudinary** — elimina `product.imagen`, agrega `imagen_url`+`imagen_public_id` a ambos modelos. Explica por qué `imagen_url` es read_only y se llena por acción `upload_image`, no en el create.

## Dónde vive cada validación
| regla | modelo `clean()` | serializer | BD | admin Django |
|---|---|---|---|---|
| CON_CODIGO ⇒ barcode+precio_costo+proveedor | ❌ no | ✅ `validate` (`serializers.py:38-55`) | ❌ | ❌ (salta serializer) |
| category del mismo tenant | ❌ | ✅ `validate_category` (`:57-63`) | ❌ (FK no valida tenant) | ❌ |
| nombre único por tenant | ❌ | ❓ (unique_together, `tenant` read_only) | ✅ constraint | vía ModelForm |
| barcode único por tenant | ❌ | ❓ | ✅ `unique_tenant_barcode` | vía ModelForm |
| precio_venta > 0 | ❌ | ❌ | ❌ | ❌ |

Ningún modelo define `clean()`. Todo lo condicional depende del serializer → **cualquier ruta que no pase por `ProductSerializer` (Django admin, shell, o un futuro endpoint) puede crear productos CON_CODIGO inconsistentes.** Ver [[validacion-con-codigo-solo-serializer]].
