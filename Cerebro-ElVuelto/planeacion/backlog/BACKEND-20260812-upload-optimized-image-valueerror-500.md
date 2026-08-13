---
tags: [tarea, backend, cloudinary, robustez]
status: 🔴
prioridad: baja
updated: 2026-08-12
---

# BACKEND-20260812-upload-optimized-image-valueerror-500 — el `except` de la subida tampoco es total

**Tipo:** robustez · **Encontrado en:** revisión adversarial de
[[ADR-TENANCY-20260812-logo-tenant-modales-crear-editar]] — es el **mismo agujero** que sí se arregló en
`destroy_image` esa corrida, en la otra mitad del archivo.

## El problema
`upload_optimized_image` (`elvuelto/cloudinary_uploads.py`) captura solo
`cloudinary.exceptions.Error` para prometer *"una falla de Cloudinary se vuelve 400, no el 500 que
producía el SDK pelado"*. Pero `uploader.call_api` llama `utils.sign_request` (`uploader.py:882`) y
`utils.cloudinary_api_url` (`:892`) **antes** de abrir su propio `try:` (`:902`), y ambas levantan un
**`ValueError`** pelado ("Must supply api_key" / "api_secret" / "cloud_name" —
`utils.py:619,622,910`) que no hereda de `Error`. Reproducido contra `cloudinary==1.44.2`: las 3
permutaciones de credenciales faltantes se escapan.

Como `settings/base.py` lee las tres credenciales con `default=""`, un entorno que perdió su `.env`
**arranca normal** y solo falla acá. Resultado: las tres subidas de imagen (producto, categoría, logo)
devuelven **500** en vez del 400 documentado.

## Por qué es más leve que el caso de `destroy_image`
Ahí el `ValueError` además **dejaba estado a medias** (la fila `TenantDocument` sobrevivía y el logo
quedaba imposible de quitar). Acá no se escribe nada antes de la llamada, así que el daño es solo el
código de estado y el mensaje: el front cae a su fallback genérico en vez de mostrar el mensaje real.

## Criterio de aceptación
Con `CLOUDINARY_CLOUD_NAME`/`API_KEY`/`API_SECRET` vacías, `POST /api/products/{id}/upload_image/`
devuelve **400** con un cuerpo `{"error": ...}` que `applyServerErrors` sabe leer, no un 500.

## Notas para el Dev
- No basta con copiar el `except Exception` de `destroy_image`: ahí es best-effort y devuelve `False`,
  acá hay que decidir **qué mensaje** ve el usuario. Ojo con no filtrar detalle de configuración del
  servidor en la respuesta (hoy el mensaje interpola `{exc}`, que diría "Must supply api_key").
- Ver el gotcha ya documentado en `el_vuelto_backend/CLAUDE.md`, sección *Image Uploads*.
