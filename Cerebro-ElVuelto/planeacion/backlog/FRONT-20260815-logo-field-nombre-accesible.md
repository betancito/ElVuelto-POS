---
tags: [tarea, frontend, tenancy, a11y]
status: 🔴
prioridad: baja
updated: 2026-08-15
---

# FRONT-20260815-logo-field-nombre-accesible — el control de logo se anuncia como "logo de el negocio"

**Tipo:** a11y (preexistente) · **Encontrado en:** revisión adversarial de
[[ADR-TENANCY-20260815-pegar-logo-portapapeles]], lente de a11y · **No es regresión** de ese cambio ·
**Relacionado:** [[RUN-20260815-pegar-logo-portapapeles]] · [[FRONT-20260812-role-button-en-tr-rompe-tabla]]

## El problema
`el_vuelto_frontend/src/features/super-admin/tenants/components/TenantLogoField.tsx` arma el nombre
accesible del `<input type="file">` como `Seleccionar logo de ${subject}`, donde
`subject = nombre.trim() || 'el negocio'`.

En el **modal de editar** llega bien (`index.tsx` pasa `nombre={editingTenant?.nombre ?? ''}`), pero en
el **modal de crear** la prop `nombre` **nunca se pasa**, así que el default `''` gana y el lector de
pantalla anuncia literalmente **"Seleccionar logo de el negocio"** — gramaticalmente mal en español
("de el" en vez de "del") y sin decir de qué negocio se trata.

Es preexistente: viene del trabajo del 2026-08-12
([[ADR-TENANCY-20260812-logo-tenant-modales-crear-editar]]), ya commiteado en `9727c03`.

## Criterio de aceptación
El nombre accesible es gramatical en los dos modales. En el de crear, donde el negocio todavía no tiene
nombre, algo como *"Seleccionar logo del negocio"* (sin `subject` interpolado); en el de editar sigue
diciendo el nombre real.

## Notas para el Dev
- Es una sola cadena. La trampa está en el fallback: `'el negocio'` se concatena después de `"logo de "`,
  de ahí el "de el". Se arregla en el default o en la plantilla, no en las dos.
- Mismo `subject` alimenta el `alt` de la `<img>` del preview (`Logo de ${subject}`) — revisá que la
  corrección aplique a los dos.
- **No hay framework de tests**: verificalo con el inspector de accesibilidad del navegador y anotá lo
  que muestra.
