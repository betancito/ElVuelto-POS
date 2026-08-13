---
tags: [corrida, cloudinary, performance, feature]
status: 🟢 corrido-ok
module: _transversal
updated: 2026-08-10
---

# RUN 2026-08-09 (revisado 2026-08-10) — Compresión estándar en las 3 subidas a Cloudinary

**Prompt:** [[PROMPT-FEAT-TRANSVERSAL-20260809-compresion-cloudinary]]
**Tarea:** [[BACKEND-20260809-compresion-estandar-imagenes]]
**Decisión:** [[ADR-G-20260809-compresion-estandar-cloudinary]]
**Veredicto:** ✅ **PASÓ** — verificado con subidas reales contra la cuenta de Cloudinary real (no simuladas), incluyendo un escenario que yo mismo agregué (re-subida al mismo `public_id`) para confirmar de forma independiente el hallazgo más importante del Dev.

## Qué se entregó
- `elvuelto/cloudinary_uploads.py` (nuevo) — `validate_image_upload`, `upload_optimized_image`, `image_delivery_url`, dos perfiles (`LOGO_TRANSFORMATION`, `CATALOG_IMAGE_TRANSFORMATION`).
- Los 3 call sites (`CategoryViewSet.upload_image`, `ProductViewSet.upload_image`, `TenantViewSet.upload_logo`) migrados al helper.
- Doble actualización completa en `el_vuelto_backend/CLAUDE.md`.

## 👏 Dos bugs que el Dev encontró y arregló, que mi prompt no anticipaba
1. **`fetch_format` como transformación de subida no hace nada.** Mi prompt pedía meter `fetch_format: "auto"` dentro del `transformation` que se le pasa a `upload()`. El Dev probó una subida real, miró la URL que devuelve Cloudinary, y confirmó que no trae ningún segmento de formato — `fetch_format` es una característica de **entrega**, no de ingesta. Lo corrigieron construyendo `image_delivery_url()` aparte, con `cloudinary.utils.cloudinary_url(...)`, que sí aplica `f_auto` en la URL que efectivamente se guarda y se sirve.
2. **Bug de caché/staleness que solo aparece al re-subir.** Como el `public_id` es determinístico (`product_<uuid>`), reemplazar la foto de un producto pisa la misma ruta. Sin el segmento `version` en la URL, la URL queda byte-idéntica antes y después, y el CDN sigue sirviendo la imagen vieja. El Dev lo encontró probando el caso real (subir dos imágenes distintas al mismo producto) y lo arregló pasando `version=upload_result.get("version")`.

El segundo es el que más importa: sin ese fix, **cada vez que un admin reemplaza la foto de un producto, todo el mundo seguiría viendo la foto vieja** — un bug silencioso, invisible en la primera subida, que solo aparece en el caso de uso más común (reemplazar una imagen).

## Verificación — la mía, independiente de la del Dev, contra la cuenta de Cloudinary real
```
1) POST /products/{id}/upload_image/ con una imagen sintética 3000×2000 (94.630 B)
   → 200, URL con "f_auto,q_auto:good"
   → bajé la URL de verdad: dimensiones reales 1000×667, 2.356 B servidos

2) POST del mismo endpoint, MISMO producto, imagen 100×100 distinta
   → 200, dimensiones reales 100×100 (NO agrandada)
   → url1 != url2 (versión distinta) Y el contenido bajado cambió de tamaño
     → CONFIRMADO de forma independiente: no quedó sirviendo la imagen vieja

3) Archivo de texto plano disfrazado de .jpg
   → 400 "No se pudo procesar la imagen: Invalid image file"
     (lo rechazó Cloudinary, la segunda capa — el content_type que mandó el
     test client alcanzó a pasar la primera; exactamente el caso que el
     propio docstring del Dev anticipa: "content_type is what the client
     claims, not proof")

4) Archivo de 11 MB con content_type image/jpeg
   → 400 "La imagen no puede superar los 10 MB." (la primera capa, antes de
     gastar la llamada a Cloudinary)

5) POST /products/categories/{id}/upload_image/ con 2400×1600
   → 200, dimensiones reales 1000×667

6) POST /tenants/{id}/upload_logo/ con 2000×800
   → 200, dimensiones reales 1000×400 (proporción mantenida)
   → TenantDocument.cloudinary_url coincide exactamente con la URL devuelta
```
Los 3 endpoints, los 6 casos del criterio de aceptación, todos ejecutados contra la cuenta real de Cloudinary (no mockeada) — es un servicio externo, no había forma de verificarlo de otro modo.

`makemigrations --check --dry-run` → sin cambios (no toca modelos).

## Nota operativa
Las subidas de esta verificación (y las del propio Dev, documentadas en el docstring del módulo con números reales medidos) quedaron como assets reales en la cuenta de Cloudinary de desarrollo — no hay rollback posible para eso, a diferencia de la BD. Bajo impacto (cuenta de dev), no se limpiaron.

## Checklist de trampas
**#7 errores**: 400 con mensaje claro en los 3 casos de rechazo, nunca un 500. **#9 migraciones**: confirmado sin cambios. **#10 doble actualización**: ✅, con los números reales medidos, no supuestos. **#11**: sin git, sin scope creep — no se tocó nada retroactivo ni el frontend, tal como se pidió.

## Cierra
[[BACKEND-20260809-compresion-estandar-imagenes]] → 🟢.
