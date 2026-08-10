---
tags: [prompt, sales, fix, backend, stock, dinero]
status: 🔴
module: sales
updated: 2026-08-04
---

# Prompt DEV — El mismo producto repetido en una venta evade el chequeo de stock

**Tarea backlog:** [[SALES-20260804-items-duplicados-sobreventa]] (alta)
**Alcance:** UNA cosa, un archivo del backend. No git. No tocar el front.

## El bug

`_resolve_products` (`apps/sales/serializers.py:78-104`) valida el stock recorriendo `items_data` y comparando **cada ítem por separado** contra `product.stock_actual`:

```python
for item in items_data:
    ...
    if product.tipo == ProductType.CON_CODIGO:
        if product.stock_actual < item["cantidad"]:
            errors.append(f"Stock insuficiente para '{product.nombre}': …")
```

Nunca suma las cantidades del **mismo** producto. Con `stock_actual = 5` y un payload que trae el producto **dos veces con cantidad 3**:
- ítem 1: `3 <= 5` ✅ pasa
- ítem 2: `3 <= 5` ✅ pasa (mira el mismo `stock_actual`, que aún no se descontó)

y después el descuento se aplica **una vez por ítem** (`:170-172`):
```python
Product.objects.filter(pk=product.pk).update(stock_actual=F("stock_actual") - item["cantidad"])
```
⇒ `stock_actual = -1`. **Se vendió más de lo que había.**

## Por qué importa
Es la misma clase de defecto que ya cerraste en [[SALES-20260802-guard-monto-recibido]]: **el servidor confía en la forma del payload del cliente**. El POS de hoy probablemente consolida el carrito por producto, así que no se dispara desde la UI — pero la regla dura del proyecto es que el servidor no confía en el front (ver [[dinero-y-guard-monto]]). El `select_for_update()` (`:84`) ya toma el lock correcto: **esto es lógica, no concurrencia.**

## Qué hacer

1. En `_resolve_products`, **agregá las cantidades por `product_id` antes de comparar** contra `stock_actual`. El mensaje de error debe seguir mostrando la cantidad **total solicitada** de ese producto, no la de un ítem suelto — si no, el cajero no entiende por qué falla.
2. Mantené el resto del contrato intacto: sigue devolviendo el dict `{str(id): product}`, sigue acumulando **todos** los errores en la lista y levantando un solo `ValidationError({"items": [...]})` al final (el POS los muestra unidos con `·`, ver [[patron-errores-drf-rtk]]).
3. El chequeo sigue aplicando **solo** a `CON_CODIGO` (los `SIN_CODIGO` no llevan stock).

## Decisión que tenés que tomar y reportar
¿Los `SaleItem` duplicados se **consolidan** en una sola fila o se guardan como vinieron?
- **Recomendado: dejarlos como vienen** (dos líneas de 3) — es el alcance mínimo y no toca el recibo.
- Si los consolidás, cambia lo que imprime el recibo (`printReceipt.ts` / `generateReceipt.ts`) → eso sería scope creep. **Si te inclinás por consolidar, no lo hagas: reportalo y que lo decida el Planner.**

En cualquier caso el `total` no cambia: se recalcula sumando `precio_venta * cantidad` de cada ítem (`:120-123`).

## Restricciones
- Solo `apps/sales/serializers.py`. Sin front, sin migraciones.
- **No toques** lo que se acaba de entregar: el `require_tenant(request)` de `create` (`:112`) ni el guard de `monto_recibido` (`:126-135`).
- Los montos siguen siendo `Decimal`; el stock sigue mutándose con `F()` dentro del `@transaction.atomic`.
- Claves de error en español, bajo `items`.

## Entregable / verificación
Reporte con **salida real** de estos casos (`stock_actual = 5`, producto `CON_CODIGO`):

| # | Payload | Esperado |
|---|---|---|
| 1 | mismo producto ×2, cantidad 3 y 3 (suma 6 > 5) | **400** `{"items": [...]}` · **nada escrito** · `stock_actual` sigue en **5** |
| 2 | mismo producto ×2, cantidad 2 y 3 (suma 5 = 5) | **201** · `stock_actual` queda en **0** |
| 3 | mismo producto ×3, cantidad 1/1/1 (suma 3 < 5) | **201** · `stock_actual` queda en **2** |
| 4 | un solo ítem, cantidad 6 (> 5) | **400** (la regresión: el caso simple sigue funcionando) |
| 5 | un solo ítem, cantidad 2 | **201** · `stock_actual` = 3 |
| 6 | dos productos **distintos**, ambos con stock suficiente | **201** · cada `stock_actual` bien descontado |
| 7 | producto `SIN_CODIGO` repetido | **201** · no se valida stock |

Pegá también, para el caso 1, el `stock_actual` **antes y después** — la prueba de que el rollback funcionó.
Y `python manage.py makemigrations --check --dry-run` → sin cambios.

Veredicto ✅ / 🔴.

> [!warning] Si algo no cuadra
> Pará y reportá con `archivo:línea`. Las anclas se verificaron el 2026-08-04 **después** del fix de tenancy (`require_tenant` ya está en `create`), pero el código manda.
