---
tags: [tarea, frontend, products, ux]
status: 🔴
prioridad: baja
updated: 2026-08-15
---

# FRONT-20260815-productspage-paste-sin-validar-y-en-form — el pegado de imagen de productos tiene dos huecos

**Tipo:** robustez / UX · **Encontrado en:** al implementar
[[ADR-TENANCY-20260815-pegar-logo-portapapeles]], leyendo el patrón previo del repo para replicarlo ·
**Relacionado:** [[RUN-20260815-pegar-logo-portapapeles]]

## El problema
`el_vuelto_frontend/src/features/products/ProductsPage.tsx` ya permite pegar una imagen con `Ctrl+V`
—`handlePaste` en `:166-169` (producto) y `:597-600` (categoría)— pero con dos huecos que el logo de
tenant **sí** resolvió y que quedaron sin tocar acá a propósito (evitar scope creep):

1. **No valida.** `handlePaste` llama directo a `handleImageFile(imageItem.getAsFile())`, que setea el
   `File` sin pasar por `validateImageFile` (`src/utils/imageUpload.ts`). El path del file-picker
   tampoco valida en esta página. Una imagen pegada de 30 MB viaja entera al servidor para volver como
   400. El mensaje que igual llega es el correcto — se verificó el 2026-08-15 que el backend responde
   `{"error":"La imagen no puede superar los 10 MB."}`, **verbatim** el mismo string de
   `validateImageFile` — así que esto es desperdicio de red y de tiempo, no un error mal mostrado.

2. **`onPaste` está en el `<form>`** (`:402` producto, `:737` categoría). Un evento `paste` apunta al
   elemento con **foco**, así que ese handler no dispara hasta que algo dentro del formulario ya lo
   tiene. Recién abierto el modal el foco no está adentro, y el gesto natural —abrir y pegar— no
   funciona. Hay que clickear un campo primero.

## Criterio de aceptación
- El pegado corre `validateImageFile` antes de aceptar el archivo, con `toast.error` si falla.
- Pegar funciona **sin** haber clickeado antes dentro del modal.
- Un pegado consumido se anuncia (mismo razonamiento que el logo: el paste se come la tecla y es el
  único camino que carga un archivo que el usuario nunca vio).

## Notas para el Dev
- **La referencia ya existe:** `usePastedLogo` + `draftFromFile` en
  `src/features/super-admin/tenants/components/TenantLogoField.tsx`. Incluye la regla imagen-vs-texto
  (no robarle el ⌘V a quien está escribiendo) y el `toast.success` del anuncio.
- Ojo: productos y categorías tienen **dos** `handlePaste` distintos, uno por modal. Los dos.
- Doble actualización: `el_vuelto_frontend/CLAUDE.md` dice *"Image upload supports clipboard paste via
  `Ctrl+V`"* en la sección de `ProductsPage` — si el atajo pasa a ser sensible a plataforma, esa línea
  cambia.
