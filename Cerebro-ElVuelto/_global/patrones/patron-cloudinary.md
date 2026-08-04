---
tags: [patron, global, cloudinary, media]
status: vivo
updated: 2026-08-02
---

# Patrón — Cloudinary (imágenes)

> [!warning] LÉEME SI VAS A TOCAR: subida de logos o imágenes de productos/categorías.

## Config
`cloudinary.config(...)` en `settings/base.py:118-126` (cloud_name/api_key/api_secret desde env, `secure=True`).

## Qué se guarda en BD
Siempre **dos** campos: `cloudinary_url` (para mostrar) + `cloudinary_public_id` (para sobre-escribir/borrar).
- `TenantDocument` (logos de tenant): `apps/tenants/models.py:43-44`, `unique_together (tenant, document_type)`.
- `Product.imagen_url/imagen_public_id` (`products/models.py:47-48`), `Category.imagen_url/imagen_public_id` (`products/models.py:16-17`).

## Endpoints de subida (multipart FormData, 2 pasos)
Primero se crea el registro; **la imagen se sube en una llamada aparte**:
| Recurso | Endpoint | Campo file | Folder | Vista |
|---|---|---|---|---|
| Logo tenant | `POST /api/tenants/{id}/upload_logo/` | `logo` | `elvuelto/tenants/logos` | `tenants/views.py:60-85` (`update_or_create`) |
| Producto | `POST /api/products/{id}/upload_image/` | `image` | `elvuelto/products` | `products/views.py:49-68` |
| Categoría | `POST /api/products/categories/{id}/upload_image/` | `image` | `elvuelto/categories` | `products/views.py:17-36` |

`overwrite=True`, `public_id` determinístico (p. ej. `product_{id}`). El front pega imagen con `Ctrl+V` además del file picker (`ProductsPage.tsx`).

## Enlaces
[[patron-diseno-ta]]
