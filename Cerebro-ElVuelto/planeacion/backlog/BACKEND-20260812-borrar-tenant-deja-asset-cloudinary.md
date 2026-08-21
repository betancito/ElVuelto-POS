---
tags: [tarea, backend, cloudinary, tenancy]
status: 🔴
prioridad: baja
updated: 2026-08-12
---

# BACKEND-20260812-borrar-tenant-deja-asset-cloudinary — el CASCADE borra la fila, no la imagen

**Tipo:** limpieza de recursos externos · **Encontrado en:** investigación previa a
[[ADR-TENANCY-20260812-logo-tenant-modales-crear-editar]]. Preexistente.

## El problema
`TenantDocument.tenant` tiene `on_delete=models.CASCADE` (`apps/tenants/models.py:61`), así que
`DELETE /api/tenants/{id}/` borra la fila del documento — pero **nada destruye el asset en
Cloudinary**. Queda un huérfano permanente por cada negocio dado de baja que tuviera logo, ocupando
cuota de la cuenta para siempre.

A diferencia del huérfano que puede dejar `destroy_image` cuando falla (acotado a 1 por tenant y
**auto-sanable**, porque el `public_id` es determinista y la próxima subida lo pisa), este **no se
auto-sana**: el tenant ya no existe, nadie va a volver a subir bajo ese `public_id`.

**CONFIRMADO en el PASO 0 del 2026-08-13** (antes estaba ❓): productos y categorías tienen el **mismo
agujero, y peor**. `Category`/`Product` guardan `imagen_public_id` (`apps/products/models.py:19`, `:65`)
y `apps/products/views.py` nunca importa ni llama `destroy_image` — solo sube (`views.py:7-12`). Así
que ni el `DELETE` de un producto/categoría, ni el CASCADE del tenant sobre ellos (vía `TenantMixin`,
`apps/tenants/models.py:87-91`), destruyen esos assets. Sin el atenuante de la auto-sanación.

## Criterio de aceptación
Borrar un tenant que tiene logo destruye también su asset en Cloudinary. Verificable con
`cloudinary.api.resource(public_id)` → `NotFound` después del `DELETE`.

## Notas para el Dev
- La herramienta ya existe: `destroy_image()` en `elvuelto/cloudinary_uploads.py`.
- Un `pre_delete` signal sobre `TenantDocument` cubriría de una tanto el borrado del tenant como
  cualquier otro camino de cascada — pero ojo: haría que `delete_logo` destruya dos veces (inofensivo,
  la segunda da "not found"), y un signal que hace I/O de red en medio de una transacción tiene su
  propio riesgo. Decidir antes de implementar.
- El alcance real es mayor que el título: cubrir también `Product`/`Category` (ver arriba), o dejar
  explícito que esta tarea es solo el logo del tenant y abrir otra para el catálogo.
