---
tags: [tarea, frontend, tenancy, superadmin, feature]
status: 🟢
prioridad: feature
updated: 2026-08-12
---

# SUPERADMIN-20260812-logo-tenant-desde-panel — subir logo del tenant desde `TenantDetailPage`

**Tipo:** feature (nueva), pedida directo por el owner · **Decisión:**
[[ADR-TENANCY-20260812-logo-tenant-superadmin-ui]] · **Corrida:**
[[RUN-20260812-logo-tenant-superadmin-ui]]

## Qué se pidió
Poder agregarle un logo a un tenant desde el panel de super-admin, para una experiencia más
personalizada del negocio.

## Qué se entregó
El backend (`POST /api/tenants/{id}/upload_logo/`) y el hook del frontend
(`useUploadTenantLogoMutation`) ya existían — solo faltaba la pantalla. Se agregó un control tipo
avatar clickeable en el header de `TenantDetailPage.tsx`: click abre el selector de archivos, sube de
inmediato, overlay con ícono/spinner en hover o mientras sube. Guard cliente de 10MB antes de llamar
al backend. Nuevas clases `ta-avatar-upload`/`ta-avatar-upload__overlay` en `tenant-admin.css`.
Efecto lateral arreglado: `getServerErrorMessage` no reconocía la clave `"error"` que usa la
validación de imágenes del backend, así que un archivo inválido mostraba siempre el mensaje genérico
en vez del real — agregada a la lista de claves reconocidas.

## Estado
🟢 cerrado. Verificado con servidor real (no solo lectura de código): login superadmin real, tenant
de prueba creado y borrado, subida real contra la cuenta de Cloudinary de dev (confirmada accesible
por HTTP), re-subida confirma upsert (1 sola fila en `TenantDocument`) y versión de Cloudinary
cambiada (cache-busting). Guard de permiso confirmado en vivo: 403 con token ADMIN, 401 sin token.
Validación de archivo confirmada en vivo: 400 con archivo no-imagen, 400 con archivo >10MB, 400 sin
archivo. `npm run typecheck` y `npm run build` limpios. Revisión adversarial (workflow, 3 lentes)
corrida: 3 hallazgos reales, los 3 arreglados y re-verificados — control inalcanzable por teclado
(fix: input real cubre el avatar en vez de `label`+`hidden`), un bug preexistente de silencio total en
el manejo de errores de subida de imagen en `ProductsPage.tsx` expuesto y arreglado en el helper
compartido, y un `border-radius` inline redundante. Ver [[RUN-20260812-logo-tenant-superadmin-ui]]
para el detalle completo.
