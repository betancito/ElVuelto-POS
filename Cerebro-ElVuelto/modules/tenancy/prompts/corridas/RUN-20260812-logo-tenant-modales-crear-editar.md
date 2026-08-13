---
tags: [corrida, run, tenancy, superadmin, planner-implementa]
status: cerrado
module: tenancy
updated: 2026-08-12
---

# RUN 2026-08-12 — Logo del tenant en los modales de crear/editar + endpoint para quitarlo

**Quién:** el Planner, directo (pedido ad-hoc del owner en el chat, [[GOBERNANZA]] §10). Con análisis
previo: 2 agentes Explore en paralelo + modo plan aprobado por el owner (`ExitPlanMode`).
**Decisión:** [[ADR-TENANCY-20260812-logo-tenant-modales-crear-editar]] — supersede el punto 1 de
[[ADR-TENANCY-20260812-logo-tenant-superadmin-ui]].
**Veredicto:** ✅ cerrado. 15/15 casos contra servidor real + revisión adversarial (24 agentes) con
**1 bug real propio encontrado y arreglado**.

## Preguntas que se le hicieron al owner antes de implementar
1. *¿La subida en el modal de edición es inmediata o al guardar?* → **al guardar** (diferida).
2. *¿Incluir también quitar el logo?* (requiere backend nuevo) → **sí**.

## Qué se tocó

| Archivo | Qué |
|---|---|
| `elvuelto/cloudinary_uploads.py` | `destroy_image(public_id)` nuevo, best-effort |
| `apps/tenants/views.py` | acción `delete_logo` → `DELETE /api/tenants/{id}/logo/` |
| `src/utils/imageUpload.ts` | **nuevo** — `MAX_IMAGE_BYTES` + `validateImageFile` |
| `src/features/tenants/tenantsApi.ts` | mutation `deleteTenantLogo` |
| `.../super-admin/tenants/components/TenantLogoField.tsx` | **nuevo** — el control con su tri-estado |
| `.../super-admin/tenants/index.tsx` | los dos modales + los dos submit handlers |
| `.../super-admin/tenants/TenantDetailPage.tsx` | usa la constante compartida (3 líneas) |
| `.../super-admin/tenants/TenantsPage.module.css` | −66 líneas de CSS muerto de `e6eaac6` |
| `el_vuelto_backend/CLAUDE.md` · `el_vuelto_frontend/CLAUDE.md` | doble actualización |

## Verificación real (servidor propio en :8001, no el del owner)

`npm run typecheck` y `npm run build` limpios (build: 1853 módulos, 4.39s; el warning de chunk >500 kB
es preexistente). `manage.py check`: 0 issues. Las 4 rutas de `/api/tenants/` resuelven sin colisión.

**15/15 contra HTTP real, con Cloudinary real:**

| # | Caso | Resultado |
|---|---|---|
| 1 | el tenant nace `activo: true` (create en JSON) | ✅ |
| 2 | `POST upload_logo` | ✅ 200 + `logo_url` |
| 3 | fila `TenantDocument` creada | ✅ 1 |
| 4 | `DELETE` sin token | ✅ 401 |
| 5 | `DELETE` con token ADMIN (no superadmin) | ✅ 403 |
| 6 | el logo sobrevive intacto a los rechazos | ✅ 1 fila |
| 7 | `DELETE` sobre UUID inexistente | ✅ 404 |
| 8 | `DELETE /tenants/{id}/logo/` | ✅ 204, cuerpo vacío |
| 9 | fila `TenantDocument` borrada | ✅ 0 |
| 10 | `GET /tenants/{id}/` → `logo_url` | ✅ `null` |
| 11 | asset destruido en Cloudinary | ✅ (Admin API → `NotFound`) |
| 12 | `DELETE` otra vez → idempotente | ✅ 204 |
| 13 | re-subir tras borrar | ✅ 200 |
| 14 | la `logo_url` nueva trae `version` distinta | ✅ |
| 15 | subir un `.txt` | ✅ 400 `{"error":"El archivo debe ser una imagen."}` |

Ambiente devuelto como estaba: 3 tenants de prueba borrados, sus assets destruidos, servers propios
bajados, el server del owner en :8000 nunca se tocó.

## Revisión adversarial — workflow, 24 agentes

4 lentes independientes (lógica de la máquina de estados · seguridad/permisos/tenancy ·
recursos-RTK-a11y del frontend · regresión), y **cada hallazgo pasado por un refutador** con la
consigna de que ante la duda refute. **20 veredictos: 2 confirmados, 18 refutados.**

### 🔴 Confirmado 1 — bug real, introducido por esta corrida, ARREGLADO

**`destroy_image` no cumplía su propio contrato de "never raises".** `except
cloudinary.exceptions.Error` **no** es total: `uploader.call_api` llama `utils.sign_request`
(`uploader.py:882`) y `utils.cloudinary_api_url` (`:892`) **antes** de abrir su propio `try:` (`:902`),
y ambas levantan un **`ValueError`** pelado ("Must supply api_key"/"api_secret"/"cloud_name",
`utils.py:619,622,910`) que no hereda de `Error`.

Camino de fallo concreto: `settings/base.py` lee las tres credenciales con `default=""`, así que un
entorno que perdió su `.env` **arranca normal** y solo se rompe acá. El `ValueError` se escapaba, DRF
no lo mapea → **500**, y como `doc.delete()` corre *después*, **la fila sobrevivía**: el logo quedaba
imposible de quitar desde ninguna pantalla. Exactamente el modo de fallo que "best effort" existía
para evitar.

Lo reprodujo el refutador y lo **volví a reproducir yo** antes de tocar nada (3/3 permutaciones de
credenciales escapaban). **Fix:** `except Exception` en `destroy_image` — es best-effort por decisión
explícita, no hay razón para dejar un tipo afuera. Verificado end-to-end levantando un segundo server
con `CLOUDINARY_*` vacías: el `DELETE` pasó de 500-con-fila-viva a **204 + fila borrada + warning en el
log** (`Cloudinary destroy failed for ...: Must supply api_key`).

**Efecto colateral honesto:** mi docstring **y** el `CLAUDE.md` que yo mismo había escrito afirmaban
como verificado que el `except` era total. Era falso. Ambos corregidos, con el contraejemplo anotado
para que nadie lo "simplifique" de vuelta.

### 🟡 Confirmado 2 — real, pero NO lo introdujo esta corrida → va a backlog

`role="button"` + `aria-label` sobre un `<tr>` poda del árbol de accesibilidad el contenido de los
`<td>` (regla ARIA "Children Presentational" + `aria-required-children` de `rowgroup`). Un lector de
pantalla oye solo "Ver detalle de X" y pierde NIT, ciudad, correo y estado. Está en
`TenantsTable.tsx:34-49` y replicado en `TenantDetailPage.tsx:273-285` — ambos del trabajo del
2026-08-09, sin commitear, **no tocados hoy**. Registrado en
[[FRONT-20260812-role-button-en-tr-rompe-tabla]]. No lo arreglé: está fuera del alcance de lo que pidió
el owner y prefiero que él decida, no ampliar solo.

### Hallazgo que resultó NO ser defecto (verificado a mano)

Un revisor planteó que un `pk` no-UUID en las rutas detail del `TenantViewSet` daría **500**. **Falso:**
probado contra el servidor real, `GET /api/tenants/no-es-uuid/` → **404** `{"detail":"No encontrado."}`
(el `get_object_or_404` de DRF atrapa `TypeError`/`ValueError`/`ValidationError`). No se registró como
defecto.

## Error de la primera corrida de verificación (vale documentarlo)

La primera pasada dio **14/15**: el caso "asset destruido en Cloudinary" falló porque pedí la URL de
entrega y devolvió 200. **El código estaba bien; la prueba estaba mal.** `invalidate=True` es una
solicitud, no una garantía: el origen ya estaba borrado (`cloudinary.api.resource` → `NotFound`)
mientras el borde del CDN seguía sirviendo la copia cacheada. Regla que quedó en el `CLAUDE.md`: para
comprobar un borrado se consulta la Admin API, nunca la URL de entrega.

## Pendiente

🟡 **Verificación visual en navegador** — no hay Chrome conectado en este entorno (mismo bloqueo que
arrastra `TenantDetailPage` desde el 2026-08-09). Lo que sí se comprobó: Vite sirve y transforma los
3 módulos nuevos sin error, y el build de producción pasa.
