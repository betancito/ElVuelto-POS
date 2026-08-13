---
tags: [adr, tenancy, superadmin, ui]
status: activo
updated: 2026-08-12
---

# ADR-TENANCY-20260812 — UI para subir el logo del tenant, solo en `TenantDetailPage`

**Contexto:** el owner pidió poder ponerle logo a un negocio desde el panel de super-admin, para una
experiencia más personalizada. La investigación (2 agentes Explore, backend + frontend) encontró que
el backend y el hook del frontend ya existían — documentado como gap conocido en
[[riesgo-logo-tenant-sin-ui]] (severidad baja, 2026-08-02): `upload_logo`
(`apps/tenants/views.py:87-114`) y `useUploadTenantLogoMutation` (`tenantsApi.ts:95-102`) estaban
completos y correctos, pero **ningún componente invocaba el hook**. Faltaba solo la pantalla.

**Decisión:**
1. **La UI vive únicamente en `TenantDetailPage.tsx`** (header, control tipo avatar clickeable),
   no en el modal de crear/editar de `super-admin/tenants/index.tsx`. Razón: el backend no tiene (ni
   necesita) un path de creación con logo incluido en el mismo payload —
   `TenantCreateSerializer` no toca `TenantDocument` — así que subir el logo siempre requiere el `id`
   del tenant ya creado. `TenantDetailPage` es la pantalla de "detalle de este negocio" a la que un
   super-admin llega después de crearlo, ya usa el sistema `ta-*` puro, y ya mostraba el logo (solo
   lectura). `index.tsx`/`TenantsTable.tsx` no se tocaron.
2. **Patrón de interacción: click-to-upload tipo "foto de perfil"**, subida inmediata al seleccionar
   el archivo — no el dropzone grande de `ProductsPage.tsx` (`ImageUploadField`, componente local no
   compartido, ya duplicado 2 veces para productos/categorías, con preview-antes-de-enviar pensado
   para un formulario grande). Acá no hay formulario: una sola imagen, un solo campo. Nuevas clases
   `ta-avatar-upload`/`ta-avatar-upload__input`/`ta-avatar-upload__overlay` en `tenant-admin.css` en
   vez de reusar o extraer `ImageUploadField` — extraerlo habría sido refactorizar otra feature, no
   pedido. **Implementación accesible:** el `<input type="file">` real cubre todo el avatar
   (`position:absolute;inset:0;opacity:0`), no un `<label>` envolviendo un input `hidden` — la primera
   versión dejaba el control fuera del tab order y sin nombre accesible (hallazgo real del review
   adversarial de esta misma corrida, ver RUN); el overlay decorativo es `aria-hidden` con
   `pointer-events:none` para no bloquear los clicks al input real.
3. **Validación de tamaño en el cliente** (`MAX_LOGO_BYTES = 10MB`, espejo de `MAX_IMAGE_BYTES` en
   `elvuelto/cloudinary_uploads.py`) antes de llamar al backend — evita una subida desperdiciada, el
   backend sigue siendo la autoridad real (`validate_image_upload`).
4. **Efecto lateral, arreglado en el mismo cambio:** ni `getServerErrorMessage` ni `applyServerErrors`
   (`src/utils/applyServerErrors.ts`) reconocían la clave `"error"` que usa `validate_image_upload`
   para sus 400 (`{"error": "El archivo debe ser una imagen."}` / `{"error": "La imagen no puede
   superar los 10 MB."}`). En `getServerErrorMessage` esto caía al mensaje genérico de fallback; en
   `applyServerErrors` era peor — el review adversarial encontró que caía al branch genérico
   `setError('error', ...)`, un campo que ningún formulario registra, así que el mensaje no se pintaba
   en ningún lado, y `surfaced=true` además suprimía el toast de fallback: la subida de imagen de
   producto/categoría en `ProductsPage.tsx` (que usa `applyServerErrors`, no `getServerErrorMessage`)
   fallaba **en completo silencio** ante un archivo inválido — bug preexistente, no introducido por
   esta corrida, pero expuesto y arreglado en el mismo helper compartido. Se agregó `'error'` a ambas
   funciones. Es un helper compartido (también lo usan `PosPage`, `ReportsPage`, y el propio
   `handleReset` de esta página) — el review verificó explícitamente que ninguna otra respuesta 400
   del backend usa hoy una clave `"error"` con otro significado que pudiera quedar mal enrutada.

**No tocado:** backend (ya estaba completo y correcto), `tenantsApi.ts` (el mutation ya era correcto),
`TenantsTable.tsx`/`index.tsx` (decisión de alcance del punto 1), `ProductsPage.tsx` (el fix del punto
4 vive en el helper compartido, no en este archivo).

**Implementación y verificación real:** [[RUN-20260812-logo-tenant-superadmin-ui]].
