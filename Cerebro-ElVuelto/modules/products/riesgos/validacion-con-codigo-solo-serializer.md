---
tags: [modulo, riesgo, validacion]
status: abierto
module: products
severidad: medio
updated: 2026-08-02
---

# Riesgo — Regla CON_CODIGO vive solo en el serializer

**Ancla:** `apps/products/serializers.py:38-55` (`ProductSerializer.validate`).

## Qué pasa
La regla "producto `CON_CODIGO` requiere `barcode` + `precio_costo` + `proveedor`" existe ÚNICAMENTE en `ProductSerializer.validate`. No está en:
- el modelo: `barcode`/`precio_costo`/`proveedor` son `null=True, blank=True` (`models.py:42-44`), y `Product` no define `clean()`;
- la BD: no hay CHECK constraint condicional por `tipo`;
- el front: `productSchema` los deja `.optional()` (`ProductsPage.tsx:40-42`), sin `refine` por `tipo`.

## Por qué es un riesgo
- **Cualquier ruta que no pase por el serializer crea productos CON_CODIGO inconsistentes**: Django admin (`admin.py` usa ModelForm, no el serializer), `manage.py shell`, `seed_dev_data`, o un futuro endpoint. Un `CON_CODIGO` sin barcode rompe el escaneo en POS/inventario.
- La divergencia con el Zod del front hace que el usuario legítimo choque contra un 400 que además se traga ([[errores-400-swallowed-en-forms]]).
- Triple fuente de verdad desalineada (front opcional / serializer requerido / modelo opcional) = fragilidad ante cualquier cambio.

## Escenario de fallo
Admin en Django admin crea Product `tipo=CON_CODIGO` sin `barcode` → se guarda. Luego el cajero escanea y ese producto nunca aparece por barcode; o en inventario queda un `CON_CODIGO` sin código que no se puede reponer por escaneo.

## Fix sugerido (Dev)
Elevar la regla a `Product.clean()` (o CheckConstraint) para que sea invariante del dominio, y/o añadir `superRefine` en `productSchema` para paridad de UX. Ver P-4 en [[preguntas-products]].
