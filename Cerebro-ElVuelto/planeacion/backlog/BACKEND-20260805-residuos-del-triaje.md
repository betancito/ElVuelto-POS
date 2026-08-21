---
tags: [tarea, backend, front, robustez]
status: 🔴
prioridad: media
updated: 2026-08-20
---

# BACKEND-20260805-residuos-del-triaje — Los 4 hallazgos menores confirmados

**Tipo:** robustez / UX · **Triados desde** [[auditoria-adversarial-20260805]] el 2026-08-05
**Ninguno bloquea el paso a features** (ver [[CRITERIO-CIERRE-ESTABILIZACION]]). Se agrupan porque son chicos e independientes; se pueden tomar de a uno.

## 1. (media) Dos query params de UUID siguen dando 500
`apps/sales/views.py:43,52` (`?user=`) y `apps/inventory/views.py:50` + `:56` (`?product=`) meten el string crudo en `filter(user_id=...)` / `filter(product_id=...)`. Si no parsea como UUID, `UUIDField.to_python()` lanza `django.core.exceptions.ValidationError` — que DRF **no** mapea → **500 en HTML**, así que `applyServerErrors` no puede mostrar nada.

Verificado: `GET /api/inventory/movements/?product=basura` → **500** · `GET /api/sales/?user=basura` → **500**.
Quedaron fuera del helper de [[BACKEND-20260804-params-fecha-sin-validar]]. El fix es un `parse_uuid_param()` en `apps/tenants/date_params.py` y usarlo en los dos `get_queryset`.

> **Tres casos del reporte original NO reproducen:** `?metodo_pago=basura` → 200 (lista vacía), `?activo=basura` → 200 (se interpreta como False), y un pk no-UUID en detail routes → **404 JSON correcto** (DRF ya lo cubre). Los dos primeros son ruido de UX, no 500.

## 2. (media) Un duplicado de `barcode` o de nombre de categoría da 500, no 400
Hallazgo colateral del triaje: `POST /api/products/` con un `barcode` repetido y `POST /api/products/categories/` con un `nombre` repetido revientan con `IntegrityError` de psycopg2 (`unique_tenant_barcode`, `product_categories_tenant_id_nombre_..._uniq`) → **500**.

Es un error que el admin encuentra en el uso normal (cargar dos veces el mismo producto). El patrón correcto ya existe en el proyecto: `UserCreateSerializer` hace el chequeo de unicidad a mano y devuelve 400 por campo.

## 3. (baja) `applyServerErrors` marca `surfaced=true` para claves que nadie pinta
Confirmado leyendo y **ejecutando el módulo real**: el bucle hace `setError(field)` y `surfaced = true` sin condición, así que una clave sin `<span>` suprime el toast de fallback y el error se pierde.

**El caso que lo motivó ya está cerrado** (el cambio del 2026-08-05 en `UsersPage` manda solo la credencial del rol activo).

**Re-verificado en el PASO 0 del 2026-08-13:** el ejemplo que quedaba —`POST /products/{id}/upload_image/` sin la parte `image` → `{"error": "No image provided."}`— **ya no aplica**: `applyServerErrors.ts:68` trata `error` explícitamente (junto a `non_field_errors` y `detail`) y lo manda a `toast.error`, y ese es justo el shape que levanta `validate_image_upload` (`elvuelto/cloudinary_uploads.py:74,78,83`). O sea: hoy este punto **no tiene ni un caso reproducible conocido** — es un agujero puramente estructural (`surfaced = true` en `applyServerErrors.ts:73` sin allowlist), un contrato abierto.

Fix barato (~5 líneas): contar `surfaced` solo si la clave está en una allowlist de campos que el form sabe pintar, y mandar el resto a `toast.error`. → se suma a [[FRONT-20260805-falta-capa-compartida-de-errores]].

## 4. (baja) `esc()` del recibo no escapa comillas — bomba desactivada
Confirmado ejecutando la función real: `esc()` (`generateReceipt.ts:56-57`) escapa `&`, `<`, `>` pero **no** `"` ni `'`, y `tenant.logoUrl` es el único campo que va a **contexto de atributo** (`<img src="${esc(...)}">`). Un payload de 33 caracteres rompe el atributo y produce un `onerror` ejecutable, en una ventana `window.open('','_blank')` que hereda el origen — donde redux-persist guarda el JWT.

**Explotabilidad hoy: nula.** Se rastreó el origen: `logo_url` es `SerializerMethodField` **read-only**, y la columna tiene un único escritor (`upload_logo`, `IsSuperAdmin`, que guarda el `secure_url` de Cloudinary con `public_id` fijo). Se probó PATCH con `logo_url`, con `cloudinary_url` y con `documents`: los tres ignoran el valor.

**No se cierra como falso positivo** porque el fusible es una sola decisión de producto: el día que se acepte "logo por URL" pegando un link, esto es XSS con robo de JWT. El arreglo es una línea en `esc()`.
Nota: `ReportsPage.tsx:608-609` interpola `tenant_logo_url` y `tenant_nombre` **sin ningún escape**; mitiga que ese HTML se entrega como Blob descargable que se abre desde `file://`.

> [!info] Re-verificado en el PASO 0 del 2026-08-15 — los 4 siguen vivos, anclas exactas
> Ni uno se tocó, y los números de línea de la nota cuadran hoy sin corrimiento (`sales/views.py:42,51`,
> `inventory/views.py:50,56`, `applyServerErrors.ts:68,73`, `cloudinary_uploads.py:74,78,83`,
> `generateReceipt.ts:56`, `ReportsPage.tsx:608-609`). Dos precisiones:
> 1. **Punto 4 subcontaba el alcance:** son **tres** interpolaciones sin escapar en `ReportsPage.tsx`, no
>    dos — `:609` (`tenant_logo_url` en atributo `src`), `:610` (`tenant_nombre` en un `<span>`) y `:773`
>    (`tenant_nombre` dentro del `<title>` del documento exportado). La mitigación (Blob → `file://`,
>    `:902`) cubre a las tres, pero el día que ese HTML se abra con origen hay que arreglar **tres**.
> 2. **Punto 2, nombre de constraint:** `unique_tenant_barcode` sí está escrito en el código
>    (`products/models.py:87`). El de categorías, `product_categories_tenant_id_nombre_..._uniq`, **no
>    existe escrito en ningún archivo del repo**: es un `unique_together` (`products/models.py:26`) cuyo
>    nombre lo genera Django/Postgres con un hash. El hecho de fondo (duplicado → `IntegrityError` → 500)
>    es correcto; el nombre no es verificable leyendo código.
>
> Se confirmó además el mecanismo del punto 2 leyendo la fuente de DRF: `get_unique_together_validators()`
> salta la constraint porque `tenant` es `read_only` sin default y no entra en `field_sources`, así que
> DRF **no** genera un `UniqueTogetherValidator` automático y nada frena el duplicado antes del INSERT.

> [!info] Re-verificado el 2026-08-20 — los 4 siguen vivos; **2 anclas se corrieron** por la feature del 08-16
> [[SALES-20260816-stock-negativo-permitido]] tocó `sales/views.py` y `products/models.py`, así que:
> `sales/views.py:42,51 → :43,52` (punto 1) y `products/models.py:78 → :87` (`unique_tenant_barcode`,
> punto 2). **Sin corrimiento:** `inventory/views.py:50,56`, `products/models.py:26`
> (`unique_together`), `applyServerErrors.ts:68,73`, `generateReceipt.ts:56`,
> `ReportsPage.tsx:609,610,773`. Ninguno de los 4 se arregló de paso.
> Detalle: [[2026-08-20-planner-paso0-resync]].

## Criterio de aceptación
Cada punto es independiente. Un param inválido da 400; un duplicado da 400 por campo; `esc()` escapa comillas; `applyServerErrors` no da por mostrado lo que no se ve.
