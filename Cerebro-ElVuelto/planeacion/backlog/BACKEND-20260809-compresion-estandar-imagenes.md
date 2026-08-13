---
tags: [tarea, backend, cloudinary, performance, feature]
status: 🟢
prioridad: feature
updated: 2026-08-10
---

> [!info] Cerrada 2026-08-10
> Verificado con subidas reales contra la cuenta de Cloudinary (6/6 casos). El Dev encontró y arregló dos problemas que el prompt no anticipaba: `fetch_format` no funciona como transformación de subida (hay que construir la URL de entrega aparte), y sin el segmento `version` en la URL, reemplazar una imagen dejaba sirviendo la vieja por caché de CDN — verificado y confirmado de forma independiente por el Planner. Ver [[RUN-20260809-compresion-cloudinary]].

# BACKEND-20260809-compresion-estandar-imagenes — Comprimir toda imagen que sube a Cloudinary

**Tipo:** feature (nueva) · **Decisión:** [[ADR-G-20260809-compresion-estandar-cloudinary]]

## Qué se pide
Que las 3 imágenes que la app sube a Cloudinary (producto, categoría, logo de tenant) se compriman/redimensionen automáticamente al subir, sin verse feas, para que ocupen menos espacio y carguen más rápido en el navegador — sin importar qué tamaño/formato mande el usuario.

## Por qué hoy no pasa
Verificado (research 2026-08-09): los 3 `cloudinary.uploader.upload()` (`apps/products/views.py:31-37,66-72`; `apps/tenants/views.py:90-96`) no pasan `transformation`, `quality` ni `format` — suben la imagen tal cual. Tampoco hay validación de tamaño/tipo antes de eso.

## Criterio de aceptación
1. Subir una imagen grande (ej. 4000×3000px, varios MB) a cualquiera de los 3 endpoints → la URL que devuelve Cloudinary y la que queda guardada en la BD corresponde a una versión redimensionada (≤1000px por lado) y con calidad optimizada — verificable pidiendo esa URL y mirando el tamaño de archivo real.
2. Una imagen ya chica (ej. 200×200px) no se agranda ni se degrada — `crop=limit` se encarga de esto.
3. Subir un archivo que no sea imagen (ej. un PDF con extensión cambiada a .jpg, o cualquier `content_type` no-imagen) → 400, no llega a gastar una llamada a Cloudinary.
4. Un archivo absurdamente grande (>10MB) → 400 antes de subir.
5. Los 3 endpoints usan el mismo helper/parámetros — no 3 copias del mismo diccionario.
6. Nada de esto toca imágenes ya existentes en Cloudinary (alcance decidido: solo subidas nuevas).

## Notas para el Dev
- Prompt ya escrito: [[PROMPT-FEAT-TRANSVERSAL-20260809-compresion-cloudinary]] — investigación del SDK instalado (`cloudinary==1.44.2`) ya hecha y verificada, con los nombres exactos de parámetros confirmados contra el código fuente del paquete.
- No hace falta tocar el frontend para esto — la compresión es transparente, ocurre del lado de Cloudinary al momento de subir.
