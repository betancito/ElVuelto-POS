---
tags: [tarea, frontend, accesibilidad, superadmin]
status: 🔴
prioridad: media
updated: 2026-08-12
---

# FRONT-20260812-role-button-en-tr-rompe-tabla — `role="button"` sobre `<tr>` esconde las celdas

**Tipo:** accesibilidad · **Encontrado en:** revisión adversarial de
[[ADR-TENANCY-20260812-logo-tenant-modales-crear-editar]] (lente frontend-recursos, workflow) —
**confirmado** por el refutador contra el archivo, no refutable como preexistente-commiteado.

## El problema
`TenantsTable.tsx:34-49` pone `role="button"` + `aria-label={\`Ver detalle de ${t.nombre}\`}` sobre el
`<tr>` para hacerlo clickeable. Consecuencias por spec ARIA, no por rareza de un navegador:

1. `role="button"` es rol explícito y gana sobre el `row` implícito del `<tr>`. `button` está en el
   conjunto **"Children Presentational: True"**, así que los `<td>` descendientes se podan del árbol de
   accesibilidad (salvo los focusables).
2. `aria-label` gana el cómputo de nombre accesible sobre el contenido, así que lo único que un lector
   de pantalla expone de esa fila es *"Ver detalle de X"*: **NIT, ciudad, correo y estado desaparecen**.
3. `<tbody>` mapea a `rowgroup`, cuyo required owned element es `row`; los `<td>` quedan sin fila
   propietaria y pierden la asociación con sus `<th>`. Es el par `aria-required-parent` /
   `aria-required-children` de axe-core.

Mismo patrón replicado en `TenantDetailPage.tsx:272-286` (`role="button"` + `aria-label` sobre el `<tr>`
de la tabla de usuarios). Un `grep` de `role="button"` en todo `src/` da exactamente esos dos lugares.

## Por qué no se arregló en la corrida donde se encontró
**No lo introdujo esa corrida.** Viene del trabajo del 2026-08-09 (página de detalle de negocio). La
tarea del owner ese día era el logo en los modales; arreglar la semántica de dos tablas es otro alcance
y es decisión suya, no del Planner ampliando solo.

> [!info] Corregido en el PASO 0 del 2026-08-13
> Esta sección decía "sigue sin commitear — `git show HEAD:...TenantsTable.tsx` tiene un `<tr>` pelado".
> **Ya es falso:** el owner commiteó todo en `9727c03` (2026-08-12 22:21) y `git show
> HEAD:...TenantsTable.tsx` trae `role="button"` en su línea 40. Es **deuda en `main`**, no trabajo sin
> commitear. Ver [[2026-08-13-planner-paso0-resync]].

## Criterio de aceptación
Las celdas vuelven a exponerse: la fila conserva su rol `row` y sus `<td>`/`<th>` su asociación,
manteniendo el click y la paridad de teclado. Camino probable: quitar `role="button"` + `aria-label`
del `<tr>` y mover la acción a un control real dentro de una celda (o dejar el `<tr>` clickeable solo
como atajo de mouse, con el botón interno como la ruta accesible). Verificar con axe-core o con un
lector de pantalla que NIT/ciudad/correo/estado se anuncien.

## Notas
- Ojo con el botón "Editar negocio" anidado: hoy es un `<button>` real dentro del `role="button"`, con
  `e.stopPropagation()`. Un control interactivo dentro de otro también es inválido.
