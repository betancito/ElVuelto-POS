---
tags: [adr, global, cloudinary, performance, feature]
status: aceptado
updated: 2026-08-09
---

# ADR-G-20260809 — Compresión estándar en las 3 subidas a Cloudinary

## Contexto

Investigado el 2026-08-09 (research-only): hay exactamente **3** puntos de subida a Cloudinary en todo el backend — producto (`apps/products/views.py:66-72`), categoría (`apps/products/views.py:31-37`) y logo de tenant (`apps/tenants/views.py:90-96`). **Ninguno** pasa `transformation`, `quality`, `format` ni límite de tamaño — la imagen sube tal cual la mande el cliente. Tampoco hay validación de tipo/tamaño antes de llegar a Cloudinary (ni backend ni front: el `accept="image/*"` del input y el texto "máx. 2 MB" en `ProductsPage.tsx` son decorativos, nada los hace cumplir).

Medidos los contextos de renderizado reales (research 2026-08-09): el logo del tenant nunca se ve a más de ~160px en pantalla, y el contexto más grande de todos es el PDF de credenciales (~85×19mm, ≈1000px de ancho a 300dpi). Productos/categorías topan alrededor de 220-240px en las grillas de admin.

## Decisión

Owner: humano (jeronimobeta90), 2026-08-09.

1. **Compresión en Cloudinary, al momento de subir** (no en el cliente, no en Django) — vía el parámetro `transformation` del propio `cloudinary.uploader.upload()`, verificado contra el SDK instalado (`cloudinary==1.44.2`): acepta `width`/`height`/`crop`/`quality`/`fetch_format` como dict.
2. **Un solo helper compartido**, no 3 copias del mismo diccionario de transformación — es el punto central del pedido ("estandarizar").
3. **Dos perfiles**, por si en el futuro conviene afinarlos distinto:
   - `LOGO`: `width=1000, height=1000, crop=limit` — con margen generoso sobre el uso real (160px en pantalla) para no verse mal en el PDF impreso a 300dpi.
   - `CATALOG_IMAGE` (producto y categoría): `width=1000, height=1000, crop=limit` — margen retina sobre los ~240px reales de la grilla.
   - Ambos con `quality="auto:good"` (prioriza que no se vea feo sobre el tamaño mínimo posible) y `fetch_format="auto"` (Cloudinary sirve WebP/AVIF al navegador que lo soporte).
   - `crop=limit` es clave: solo **reduce** si la imagen es más grande que el límite — nunca agranda una imagen chica, así que no hay pérdida de calidad en imágenes ya pequeñas.
4. **Alcance: solo subidas nuevas.** Las imágenes ya existentes en Cloudinary quedan como están. Recomprimirlas es un trabajo aparte, no incluido acá.
5. **Validación mínima agregada de paso**, porque hoy no existe ninguna: rechazar (400) un `content_type` que no sea imagen, y un tamaño de archivo absurdo (ej. > 10 MB) antes de gastar la subida a Cloudinary — no es lo que se pidió explícitamente, pero es la contraparte obvia de "no gastar espacio de más" y hoy el hueco es total.

## Estado
Aceptado. Implementación: [[PROMPT-FEAT-TRANSVERSAL-20260809-compresion-cloudinary]].

## Consecuencias
- **Positivas:** una sola fuente de verdad para "cómo comprimimos"; los 3 endpoints quedan consistentes; cero dependencias nuevas (ni backend ni frontend) porque Cloudinary hace el trabajo pesado.
- **No garantizado:** si esto reduce el *storage* facturado de Cloudinary (no solo el bandwidth de entrega) depende de la configuración de "original backup" de la cuenta de Cloudinary — eso vive en el dashboard de Cloudinary, no en este repo, y no lo pude verificar. Lo que sí se garantiza: la URL que queda guardada en la BD y que se sirve en todos lados es la versión ya redimensionada/comprimida.
- **Deuda:** las imágenes ya subidas no se tocan (decisión explícita del owner). El logo de tenant además no tiene UI de subida hoy (`useUploadTenantLogoMutation` existe, nadie la llama) — no forma parte de este ADR, queda anotado para quien lo necesite.

## Tareas derivadas
- [[BACKEND-20260809-compresion-estandar-imagenes]]

## Enlaces
`apps/products/views.py:31-37,66-72` · `apps/tenants/views.py:90-96` · `apps/tenants/views.py` (logo, sin UI de subida)
