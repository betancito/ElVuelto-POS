---
tags: [modulo, riesgo, ux, formularios]
status: abierto
module: products
severidad: medio
updated: 2026-08-02
---

# Riesgo — Errores 400 del servidor se tragan en los formularios

**Ancla:** `features/products/ProductsPage.tsx:204-206` (producto) y `ProductsPage.tsx:622-624` (categoría).

## Qué pasa
Ambos `onSubmit` capturan el error de la mutation RTK Query con:
```
} catch (err) {
  console.error(err)
}
```
No hay `setError` por campo, ni `non_field_errors` mapeado, ni toast, ni banner. En el `finally` se hace `setSubmitting(false)` y el modal queda abierto tal cual, como si el submit no hubiera ocurrido.

## Por qué es un riesgo
El backend puede devolver errores por campo perfectamente accionables que el usuario nunca ve:
- `serializers.py:47-52` — CON_CODIGO incompleto: `{barcode/precio_costo/proveedor: "Requerido..."}`.
- `serializers.py:62` — categoría de otro tenant.
- Unicidad `(tenant,nombre)` / `unique_tenant_barcode` (400 o 500, ver P-3 en [[preguntas-products]]).

El usuario ve el botón volver de "Guardando..." a normal sin explicación → percibe un bug, reintenta, o crea duplicados/inconsistencias.

## Escenario de fallo
Admin activa el toggle "Con código", deja `proveedor` vacío y guarda. Zod pasa (proveedor es opcional en el front). Backend responde 400 `{proveedor:"Requerido para productos CON_CODIGO."}`. El front hace `console.error` y no muestra nada. El admin no entiende por qué "no guarda".

## Fix sugerido (Dev)
Mapear el `error.data` (400) de RTK Query a `setError(campo, ...)` y renderizar `non_field_errors`; o al menos un toast con el mensaje del back. Complementa [[validacion-con-codigo-solo-serializer]].
