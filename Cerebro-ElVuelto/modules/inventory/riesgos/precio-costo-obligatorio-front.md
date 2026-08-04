---
tags: [modulo, riesgo, divergencia]
status: abierto
module: inventory
severity: medio
updated: 2026-08-02
---

# Riesgo — precio_costo obligatorio en el front, opcional en el back (y sin formato)

**Anclas:** front `InventoryPage.tsx:29`, `:372-379` · back `apps/inventory/models.py:30`, `serializers.py` (sin regla sobre `precio_costo`)

## Divergencia
- **Front:** `precio_costo: z.string().min(1, 'Requerido')` (`InventoryPage.tsx:29`) → **obligatorio** para TODO movimiento, incluido `AJUSTE`.
- **Back:** `precio_costo = DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)` (`models.py:30`); el serializer no lo exige. → **opcional**.

Consecuencia funcional: no se puede registrar un `AJUSTE` (corrección de conteo) sin inventar un costo, aunque el modelo lo permitiría vacío. Semánticamente el costo solo tiene sentido en `ENTRADA` (compra a proveedor).

## Sub-riesgo de formato (Decimal)
El input de costo es texto crudo, `inputMode="numeric"`, **sin** limpieza de separadores:
```
value={watch('precio_costo')}
onChange={(e) => setValue('precio_costo', e.target.value, { shouldValidate: true })}
```
A diferencia de `ProductsPage` (que hace strip de dot-thousands antes de enviar), aquí el valor se envía literal. Si el usuario teclea `"$1.234"` o `"1.234,50"`, el `DecimalField` no lo parsea → **400**. Y ese 400 se **traga** en el `catch {}` vacío → ver [[errores-servidor-silenciados]]. El único alivio es el pre-llenado desde `selectedProduct.precio_costo` (`:243-247`), que ya viene numérico limpio ("1234.00") — pero solo si el producto tiene costo y el usuario no lo edita.

## Impacto
- Fricción real en `AJUSTE`; posible dato inventado en `precio_costo` de ajustes.
- 400 de formato invisibles al combinar con el submit que traga errores.
- Severidad **media**.

## Sugerencia (backlog)
- Hacer `precio_costo` requerido solo cuando `tipo_movimiento === 'ENTRADA'` (condicional en Zod).
- Formatear/limpiar el input como en ProductsPage (strip a dígitos antes de enviar).

Relacionado: [[preguntas-inventory]] P-3 · [[formularios-inventory]] (divergencia 2) · [[errores-servidor-silenciados]].
