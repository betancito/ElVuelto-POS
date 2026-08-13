---
tags: [corrida, tenancy, superadmin, feature]
status: activo
updated: 2026-08-12
---

# RUN-20260812 — Subir logo del tenant desde el panel de super-admin

> [!info] Desviación de protocolo, reconocida
> El owner pidió esto directamente al Planner en el chat ("agregarle un logo al tenant... desde el
> panel de superadmin"), explícitamente pidiendo análisis y planeación primero. No hubo handoff
> Planner→Dev previo — el Planner investigó (modo plan: 2 agentes Explore en paralelo, backend +
> frontend, más lectura directa de los archivos críticos), escribió un plan y lo hizo aprobar por el
> owner (`ExitPlanMode`), implementó el código directamente, lo probó con servidor real, y se
> auto-revisó con un workflow adversarial de 3 lentes en vez de un review humano-a-diff independiente.
> Mismo patrón que [[RUN-20260811-docs-swagger-key-gate]]. Ver
> [[ADR-TENANCY-20260812-logo-tenant-superadmin-ui]] para la decisión.

## Qué se encontró en la investigación
El backend (`POST /api/tenants/{id}/upload_logo/`, `apps/tenants/views.py:87-114`) y el hook del
frontend (`useUploadTenantLogoMutation`, `tenantsApi.ts:95-102`) ya estaban completos y correctos —
documentado como gap conocido en [[riesgo-logo-tenant-sin-ui]] (severidad baja, 2026-08-02): **ningún
componente invocaba el hook**. Solo faltaba la pantalla.

## Qué se implementó
Solo frontend, 3 archivos:
- `el_vuelto_frontend/src/features/super-admin/tenants/TenantDetailPage.tsx` — control tipo avatar en
  el header: click sube de inmediato, guard cliente de 10MB (`MAX_LOGO_BYTES`, espejo de
  `MAX_IMAGE_BYTES` del backend), `try/catch` + `toast.error(getServerErrorMessage(...))` /
  `toast.success(...)`, mismo idioma que `handleReset` ya existente en el archivo.
- `el_vuelto_frontend/src/styles/tenant-admin.css` — clases nuevas `ta-avatar-upload` /
  `ta-avatar-upload__input` / `ta-avatar-upload__overlay`.
- `el_vuelto_frontend/src/utils/applyServerErrors.ts` — agregada la clave `"error"` a
  `getServerErrorMessage` (y, tras el review, también a `applyServerErrors`, ver abajo).

Backend: **sin cambios**, ya estaba completo. `tenantsApi.ts`, `TenantsTable.tsx`,
`super-admin/tenants/index.tsx`: **sin cambios** (decisión de alcance, ver ADR).

## Verificación real ejecutada (servidor real corriendo, no solo lectura de código)
- `npm run typecheck` y `npm run build`: limpios, dos veces (antes y después de los fixes del review).
- Login SUPERADMIN real (`admin@elvuelto.com`) contra el backend ya corriendo en `:8000`, tenant de
  prueba creado vía `POST /api/tenants/` real.
- Subida real de una imagen PNG generada con Pillow → **200**, `logo_url` persistido y confirmado
  accesible por HTTP directo contra Cloudinary (200, `content-type: image/png`).
- Re-subida (reemplazo) → la URL cambia de versión (`v1786585963` → `v1786586050`, cache-busting
  confirmado) y `TenantDocument.objects.filter(tenant=...)` sigue en **1 sola fila** (upsert
  confirmado por consulta directa a la BD, no solo por el 200 de la respuesta).
- Guard de permiso: token de un ADMIN de tenant (no superadmin) → **403** real
  (`"Usted no tiene permiso para realizar esta acción."`); sin token → **401** real.
- Validación de archivo: `.txt` con `type=text/plain` → **400** `{"error":"El archivo debe ser una
  imagen."}`; archivo de 11MB → **400** `{"error":"La imagen no puede superar los 10 MB."}`; sin
  campo `logo` → **400** `{"error":"No image provided."}`. Los 3 contra el endpoint real.
- Tenant de prueba borrado al terminar (`DELETE /api/tenants/{id}/` → 204) — no quedó dato de prueba
  en la BD de dev.
- **No ejecutada:** verificación visual en navegador — `claude-in-chrome` no está conectado en este
  entorno (mismo estado que dejó pendiente [[RUN-20260809-frontend-tenant-detail-page]]). Pendiente
  de que el humano lo confirme a ojo.

## Revisión adversarial (workflow, 3 lentes, 9 agentes, ~325s, 493k tokens)
Lentes: tenancy/permisos, correctness/error-handling, UI/accesibilidad/CSS. 3 hallazgos candidatos →
**3 confirmados** tras verificación independiente (cada uno con su propio agente intentando
refutarlo, leyendo el archivo real):

1. **🔴 Real, arreglado — control de logo inalcanzable por teclado.** El `<input type="file" hidden>`
   envuelto en un `<label>` sin `tabIndex`/manejo de teclado quedaba fuera del tab order y del árbol
   de accesibilidad (`hidden` = `display:none`), así que el `aria-label` nunca se anunciaba y
   `.ta-avatar-upload:focus-within` era CSS muerto. Solo funcionaba con mouse. **Fix:** patrón estándar
   de "input invisible pero encima" — el `<input>` ahora cubre todo el avatar
   (`position:absolute;inset:0;opacity:0`), sin `hidden`, foco/activación por teclado nativos del
   input; el overlay decorativo pasa a `aria-hidden="true"` con `pointer-events:none` (ya estaba) para
   no bloquear los clicks. `label` → `div` (ya no hace falta el forwarding de label).
2. **🔴 Real, arreglado — mismo bug preexistía en `ProductsPage.tsx`, peor.** El review notó que
   agregar `"error"` solo a `getServerErrorMessage` no alcanza: `ProductsPage.tsx` sube imágenes de
   producto/categoría a través de `applyServerErrors` (el mapeador de formularios), no
   `getServerErrorMessage`. `applyServerErrors` no trataba `"error"` como especial, así que caía al
   branch genérico `setError('error', ...)` — ningún formulario tiene un campo llamado `error`, el
   mensaje no se pintaba en ningún lado, y como `setError` sí corrió, `surfaced=true` **también
   suprimía el toast de fallback**. Una imagen de producto/categoría inválida fallaba **en completo
   silencio**, sin ningún feedback. Preexistente (no introducido por esta corrida), pero directamente
   relacionado con el mismo cambio — **arreglado en la misma corrida**: `"error"` agregado también al
   branch de toast de `applyServerErrors`, mismo archivo. No se tocó `ProductsPage.tsx` — el fix está
   en el helper compartido, así que corrige ambos call sites (logo y producto/categoría) a la vez.
3. **🟡 Real, arreglado — `border-radius` redundante.** El `<img>`/`<div>` placeholder tenían su
   propio `border-radius:12px` inline, duplicando el del padre `.ta-avatar-upload` (que ya recorta
   con `overflow:hidden`). Sin defecto visual, pero riesgo de mantenimiento (podían desincronizarse).
   Quitado al reescribir el bloque para el fix de accesibilidad.

Tras los 3 fixes: `npm run typecheck` y `npm run build` vueltos a correr, limpios.

## Veredicto
✅ Pasó. Backend sin cambios (ya estaba completo). Frontend: 3 archivos, verificado con servidor real
(permiso 403/401, validación 400×3, upsert+versionado de Cloudinary por consulta directa a la BD).
Revisión adversarial encontró 3 hallazgos reales — los 3 arreglados en la misma corrida y
re-verificados (typecheck+build limpios tras el fix). Uno de los 3 era un bug preexistente en
`ProductsPage.tsx` que este cambio expuso por tocar el mismo helper compartido; se arregló ahí también
en vez de dejarlo a medias. Doble actualización: `CLAUDE.md` frontend ✅ (sección `TenantDetailPage` +
sección de `getServerErrorMessage`/`applyServerErrors`), cerebro ✅ (este archivo + ADR + backlog +
riesgo cerrado + registro + 00-INDEX + 00-planeacion + 00-global).

Pendiente para el humano: confirmación visual en navegador (sin Chrome conectado en este entorno,
mismo estado que la feature de detalle de negocio del 2026-08-09).
