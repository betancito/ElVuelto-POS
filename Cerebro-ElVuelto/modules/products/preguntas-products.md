---
tags: [modulo, preguntas]
status: vivo
module: products
updated: 2026-08-02
---

# Products — Preguntas (append-only)

Formato GOBERNANZA §6. No se reordena. Cada respuesta con fecha; si cambia diseño → ADR.

---

P-1 [products] ¿Es intencional que un CAJERO (o cualquier autenticado) pueda crear/editar/borrar productos y categorías vía la API?
   Evidencia: `apps/products/views.py:13` y `:39` — los viewsets NO declaran `permission_classes`; default `IsAuthenticated` (`settings/base.py:97-99`). Solo `pos` fuerza `IsCajero` (`:70`). El front solo protege la ruta con `ProtectedRoute allowedRoles={['ADMIN']}` (`router.tsx:90`).
   Mi hipótesis: es un bug — el CLAUDE.md del backend documenta `IsAdmin` para estos endpoints, así que la intención era restringir a ADMIN pero falta el `permission_classes` en los viewsets.
   Si no contestas: asumo bug de seguridad y lo dejo como riesgo ALTO [[permisos-viewsets-sin-isadmin]], marcado ❓ en cuanto a intención.
   Impacto: alto

---

P-2 [products] ¿Cómo se supone que el admin elimina o desactiva un producto/categoría desde la UI?
   Evidencia: `ProductsPage.tsx:118`/`:555` declaran `deletingId` pero `setDeletingId` nunca se invoca con un id (solo se resetea a null en el `ConfirmModal`, `:378-379`/`:712-713`). El card `onClick` es `openEdit`. El campo `activo` tampoco se edita en el form. Las mutations `deleteProduct`/`deleteCategory` existen pero quedan inalcanzables.
   Mi hipótesis: el flujo de borrado/desactivación quedó a medio implementar (falta el botón que dispare `setDeletingId`).
   Si no contestas: lo documento como feature incompleta / código muerto [[delete-inalcanzable-en-ui]], sin asumir que es por diseño.
   Impacto: medio

---

P-3 [products] Al crear una categoría con `nombre` duplicado o un producto con `barcode` duplicado dentro del mismo tenant, ¿el backend responde 400 limpio o 500 IntegrityError?
   Evidencia: `Category.unique_together (tenant,nombre)` (`models.py:24`) y `Product.unique_tenant_barcode` (`:57-63`) están en BD. En los serializers `tenant` es `read_only` (`serializers.py:10`,`:36`), así que DRF no puede aplicar automáticamente un `UniqueTogetherValidator` que incluya `tenant`; podría escapar hasta la BD como IntegrityError → 500.
   Mi hipótesis: sale 500 IntegrityError (no 400), porque la unicidad depende de `tenant` que el serializer no expone.
   Si no contestas: marco ❓ en [[contratos-products]] y asumo que el front debe manejar tanto 400 como 500 (hoy los traga igual, ver [[errores-400-swallowed-en-forms]]).
   Impacto: medio

---

P-4 [products] ¿Debe el Zod del front exigir `barcode`/`precio_costo`/`proveedor` cuando `tipo=CON_CODIGO`, para dar paridad con `ProductSerializer.validate`?
   Evidencia: `productSchema` los deja `.optional()` (`ProductsPage.tsx:40-42`); el serializer los exige (`serializers.py:47-52`). Hoy el usuario envía CON_CODIGO incompleto, recibe 400 y el error se traga.
   Mi hipótesis: sí, falta un `superRefine`/`refine` condicional en el schema.
   Si no contestas: lo documento como divergencia en [[formularios-products]] y [[validacion-con-codigo-solo-serializer]]; no toco código.
   Impacto: medio

## Respuestas del owner (2026-08-02)
> [!decision] P-1 — RESUELTA: el CAJERO **no** debe modificar productos/categorías. En el POS solo los toca en el panel táctil y van al carrito (solo-lectura, consume `GET /products/pos/`). Es bug de permisos → `IsAdmin` en los viewsets. Ver [[ADR-G-20260802-modelo-de-acceso-por-rol]] y [[PRODUCTS-20260802-viewsets-sin-permiso]]. (P-2, P-3, P-4 siguen abiertas.)
