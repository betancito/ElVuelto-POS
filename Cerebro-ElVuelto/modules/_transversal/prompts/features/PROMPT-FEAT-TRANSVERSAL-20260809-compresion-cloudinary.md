---
tags: [prompt, cloudinary, performance, feature]
status: 🔴
module: _transversal
updated: 2026-08-09
---

# Feature DEV — Comprimir/redimensionar toda imagen al subir a Cloudinary

**Tarea:** [[BACKEND-20260809-compresion-estandar-imagenes]]
**Decisión:** [[ADR-G-20260809-compresion-estandar-cloudinary]]
**Alcance:** backend únicamente. Un helper nuevo + los 3 puntos de subida existentes. No frontend, no git.

## Los 3 puntos de subida, tal como están hoy (verificado, ninguno comprime nada)

```python
# apps/products/views.py:31-37 — CategoryViewSet.upload_image
result = cloudinary.uploader.upload(
    image, folder="elvuelto/categories", public_id=f"category_{category.id}",
    overwrite=True, resource_type="image",
)

# apps/products/views.py:66-72 — ProductViewSet.upload_image
result = cloudinary.uploader.upload(
    image, folder="elvuelto/products", public_id=f"product_{product.id}",
    overwrite=True, resource_type="image",
)

# apps/tenants/views.py:90-96 — TenantViewSet.upload_logo
result = cloudinary.uploader.upload(
    image, folder="elvuelto/tenants/logos", public_id=f"tenant_{tenant.id}_logo",
    overwrite=True, resource_type="image",
)
```
Los 3 hacen únicamente `image = request.FILES.get("image"|"logo"); if not image: 400` antes de esto — cero validación de tipo/tamaño, cero transformación.

## Qué hacer

### 1. Un helper compartido — vos elegís el archivo exacto
No es específico de `products` ni de `tenants`, así que no lo metas dentro de ninguno de esos dos apps de forma que el otro tenga que importar cross-app raro. Dos opciones razonables, elegí la que más cómoda te resulte con la estructura del repo:
- (a) Un módulo nuevo `apps/common/` (con su `__init__.py`, no hace falta que sea una app de Django registrada en `INSTALLED_APPS` — no tiene modelos).
- (b) Un módulo a nivel de proyecto, ej. `elvuelto/cloudinary_uploads.py`, al lado de `settings/` (donde ya vive `cloudinary.config(...)`).

Cualquiera está bien — justificá cuál elegiste en el reporte.

### 2. Los parámetros de transformación — verificados contra el SDK instalado (`cloudinary==1.44.2`)
Confirmé leyendo `site-packages/cloudinary/uploader.py` y `utils.py` que `upload()` acepta `transformation` como `dict` (no hace falta una lista), y que las claves `width`, `height`, `crop`, `quality`, `fetch_format` son las que el propio Cloudinary usa internamente (ej. `utils.py:41` trae `{"width": "auto", "crop": "limit"}` como default de Cloudinary; `"q"` es el código corto documentado para `quality`, `"f"` para `fetch_format`). Dos perfiles:

```python
LOGO_TRANSFORMATION = {
    "width": 1000, "height": 1000, "crop": "limit",
    "quality": "auto:good", "fetch_format": "auto",
}
CATALOG_IMAGE_TRANSFORMATION = {
    "width": 1000, "height": 1000, "crop": "limit",
    "quality": "auto:good", "fetch_format": "auto",
}
```
`crop: "limit"` es el que importa: **solo reduce** si la imagen excede el límite, nunca agranda una imagen chica ni la recorta de forma rara. `quality: "auto:good"` prioriza que no se vea fea sobre exprimir el tamaño al mínimo — no uses `auto:eco` ni `auto:low`. `fetch_format: "auto"` deja que Cloudinary sirva WebP/AVIF al navegador que lo soporte, sin que el front tenga que hacer nada.

Aunque los dos perfiles quedan con los mismos números hoy, definilos como constantes **separadas** (no una sola reusada dos veces) — es la idea de tener perfiles: si más adelante alguien quiere logos más chicos, se toca uno sin tocar el otro.

### 3. El helper en sí
Algo con esta forma (ajustá nombres a tu gusto):
```python
def upload_optimized_image(file, *, folder, public_id, transformation):
    return cloudinary.uploader.upload(
        file, folder=folder, public_id=public_id,
        overwrite=True, resource_type="image",
        transformation=transformation,
    )
```
**Verificá con una subida real** (no asumas) que la `secure_url`/`url` que devuelve Cloudinary ya viene con la transformación aplicada en el path (algo como `.../upload/c_limit,f_auto,h_1000,q_auto:good,w_1000/...`) — es esa URL la que hay que guardar en `imagen_url`/`cloudinary_url`, no una construida a mano.

### 4. Validación mínima antes de subir (nueva, hoy no existe nada)
En los 3 lugares, antes de llamar al helper:
- **Tipo**: `image.content_type` debe empezar con `image/` (ej. `image/jpeg`, `image/png`, `image/webp`) → si no, 400 con un mensaje claro (`"El archivo debe ser una imagen."`).
- **Tamaño**: `image.size` no puede superar **10 MB** (`10 * 1024 * 1024` bytes) → 400 (`"La imagen no puede superar los 10 MB."`).

Hacelo una sola vez si podés (mismo helper de validación reusado en los 3 lugares), no 3 copias del mismo `if`.

### 5. Aplicalo en los 3 call sites
- `CategoryViewSet.upload_image` y `ProductViewSet.upload_image` → perfil `CATALOG_IMAGE_TRANSFORMATION`.
- `TenantViewSet.upload_logo` → perfil `LOGO_TRANSFORMATION`.

## Restricciones
- **No toques imágenes ya subidas.** Esto es solo para subidas nuevas — no escribas ningún script de backfill ni migración de datos.
- No toques el frontend — nada de esto necesita cambios ahí (la compresión es transparente).
- No agregues ninguna dependencia nueva (ni `Pillow` en código de la app, ni nada de npm) — Cloudinary hace el trabajo.
- No le cambies el comportamiento a nada más de esos 3 endpoints (permisos, respuesta, nombres de campo) — solo la subida en sí.

## Entregable / verificación
1. `python manage.py makemigrations --check --dry-run` → sin cambios (no toca modelos).
2. Subí una imagen grande real (buscá una de varios MB / >1500px de lado) a cada uno de los 3 endpoints y pegá:
   - La URL que devuelve la respuesta.
   - El tamaño en bytes de esa URL (`curl -sI <url> | grep -i content-length`, o similar) comparado contra el tamaño del archivo original.
   - Confirmación de que la imagen se ve bien (no pixelada/artefactos raros) — descargala y mirala, no asumas.
3. Subí una imagen chica (ej. 100×100px) → confirmá que NO se agrandó (mismo ancho/alto o menor, nunca mayor a 1000px pero tampoco estirada).
4. Probá subir un archivo no-imagen (ej. un `.txt` renombrado a `.jpg`, o directamente un PDF) → 400.
5. Probá un archivo de más de 10MB → 400.
6. Veredicto ✅ / 🔴.

**Doble actualización:** `el_vuelto_backend/CLAUDE.md` — documentar el helper compartido, los dos perfiles, y que esto es solo para subidas nuevas (no retroactivo).

> [!warning] Si algo no cuadra
> Pará y reportá con `archivo:línea`. Los nombres de parámetros de `transformation` los verifiqué leyendo el SDK instalado hoy (2026-08-09) — si tu `pip show cloudinary` da una versión distinta a 1.44.2, revisá vos el código antes de asumir que esto sigue siendo exacto.
