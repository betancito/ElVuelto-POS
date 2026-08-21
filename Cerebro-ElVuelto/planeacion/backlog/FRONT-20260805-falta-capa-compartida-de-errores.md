---
tags: [tarea, front, errores, diseno]
status: 🔴
prioridad: baja
updated: 2026-08-05
---

# FRONT-20260805-falta-capa-compartida-de-errores — Cada superficie reimplementa el banner y el lector de errores

**Tipo:** deuda de diseño · **Descubierto:** review de [[RUN-20260805-cuatro-400-invisibles]]

Dos piezas compartidas que **faltan**, así que cada pantalla nueva las reinventa. Ninguna es un bug: son el motivo por el que el próximo 400 volverá a quedar mal presentado.

## 1. No existe una clase `ta-*` de alerta
`tenant-admin.css` tiene `ta-badge--error` (`:297`) y el token `--error-container` (definido en `src/styles/globals.css:148`), pero **ningún banner de alerta**. Resultado: ya hay dos implementaciones del mismo componente visual —
- `pos-error-banner` (CSS propio del POS, `PosPage.tsx:397` + `pos.css:813`),
- estilos **inline** en `ReportsPage.tsx` (banner de `queryError`),

ambas con los mismos tokens. La regla del proyecto ([[patron-diseno-ta]]) es usar clases `ta-*` y no crear `.module.css` por página — se respetó la parte dura, pero faltaba la clase que debía usarse.

**Propuesta:** `ta-alert` + `ta-alert--error` / `--warning` / `--info` en `tenant-admin.css`, y migrar los dos sitios.

## 2. `getServerErrorMessage` está cableado a las claves de ventas
`getServerErrorMessage` (`applyServerErrors.ts:92-110`) busca en orden: `items` → `monto_recibido` → `non_field_errors` → `detail` → `error`. Cualquier 400 con otra clave cae al fallback genérico y **esconde el mensaje real del backend**.

Por eso `ReportsPage` tuvo que escribir un `reportErrorMessage()` local que lee `fecha_inicio`/`fecha_fin`/`fecha`/`limit` antes de delegar. Fue la decisión correcta bajo la restricción de aquel prompt (no tocar el helper), pero no escala: cada endpoint nuevo con claves propias necesitará su wrapper.

**Propuesta:** que `getServerErrorMessage` acepte una lista opcional de claves prioritarias y, si ninguna coincide, caiga al **primer valor string del body** en vez del fallback. Con eso `ReportsPage` borra su wrapper y el POS conserva su prioridad (`items` primero, que sí es específica y deseada).

## Criterio de aceptación
1. Existe `ta-alert` y los dos banners lo usan; ninguno lleva estilos inline ni CSS propio.
2. `getServerErrorMessage` muestra el mensaje real de un 400 con claves que no estén en su lista; `ReportsPage` ya no necesita `reportErrorMessage`.
3. No se rompe la prioridad del POS (`items` unidos con ` · ` primero).

## Notas para el Dev
- Al tocar `applyServerErrors.ts`, revisá **todos** sus consumidores (`grep` por ambos exports): POS, `InventoryEntryPanel`, los forms admin y `ReportsPage`.
- Ver [[patron-errores-drf-rtk]] y [[patron-diseno-ta]].
