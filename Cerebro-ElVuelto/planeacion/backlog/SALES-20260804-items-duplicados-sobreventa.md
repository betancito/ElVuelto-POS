---
tags: [tarea, sales, bug, dinero, stock]
status: 🟢
prioridad: alta
updated: 2026-08-16
---

> [!warning] Parcialmente REVERTIDO el 2026-08-16 — leer antes de confiar en el cierre 🟢 de abajo
> Este ítem tenía **dos** correcciones: (a) rechazar la venta comparando contra la **suma** por producto,
> y (b) que dos líneas del mismo producto no descontaran dos veces.
>
> **(a) se retiró a propósito** por [[ADR-SALES-20260816-stock-negativo-permitido]]: una venta ya no se
> rechaza por falta de stock, así que la suma dejó de tener a quién decirle que no. **(b) dejó de ser un
> defecto**: descontar por línea es hoy el resultado correcto — dos líneas de 3 sobre un stock de 5 dan
> −1, y ese −1 es la deuda que el negocio quiere ver.
>
> La agregación misma (el `defaultdict` de sumas) quedó sin lector y se reemplazó por un `set` ordenado
> de ids en `apps/sales/serializers.py`. Lo que **sí** sigue vivo de la idea original: el servidor no
> confía en la forma del payload, y el recibo sigue escribiendo un `SaleItem` por línea enviada.
>
> El 🟢 sigue siendo correcto **para su época**; simplemente ya no describe la regla vigente.

> [!done] Cerrado 2026-08-04 — ✅ [[RUN-20260804-items-duplicados-sobreventa]]
> `_resolve_products` agrega las cantidades por `product_id` con un `defaultdict(int)` **antes** de comparar contra `stock_actual`, y el 400 reporta la cantidad total solicitada. Verificado 12/12: con stock 5, dos líneas de 3 dan **400** y el stock queda intacto; 2+3 pasa y deja el stock en 0. Las líneas duplicadas **no** se consolidan (decisión deliberada: fusionarlas cambiaría el contrato del recibo) — documentado en `backend/CLAUDE.md:388-389`.

# SALES-20260804-items-duplicados-sobreventa — El mismo producto repetido en el payload evade el chequeo de stock

**Tipo:** bug (stock negativo / sobreventa) · **Descubierto:** PASO 0 del 2026-08-04 · **Verificado a mano por el Planner**

## Problema
El chequeo de stock recorre `items_data` y compara **cada ítem por separado** contra `product.stock_actual` (`apps/sales/serializers.py:89-102`):

```python
for item in items_data:
    ...
    if product.tipo == ProductType.CON_CODIGO:
        if product.stock_actual < item["cantidad"]:
            errors.append(f"Stock insuficiente para '{product.nombre}'…")
```

Nunca agrega las cantidades del mismo `product`. Con `stock_actual = 5` y un payload que trae el producto **dos veces con cantidad 3**, ambas comparaciones pasan (`3 <= 5`), y luego el descuento se aplica **una vez por ítem** (`serializers.py:170-172`):

```python
Product.objects.filter(pk=product.pk).update(stock_actual=F("stock_actual") - item["cantidad"])
```

Resultado: `stock_actual = -1`. Se vendió más de lo que había.

## Por qué importa
Es exactamente la misma clase de defecto que [[SALES-20260802-guard-monto-recibido]] (ya cerrado): **el servidor confía en la forma del payload del cliente**. El POS actual probablemente consolida el carrito por producto, así que hoy no se dispara desde la UI — pero la regla dura del proyecto es que el servidor no confía en el front (ver [[dinero-y-guard-monto]]). El `select_for_update()` (`:85`) toma el lock correcto, así que el arreglo es de lógica, no de concurrencia.

## Criterio de aceptación
Un `POST /api/sales/` con el mismo `product` repetido, cuya **suma** de cantidades excede el stock, responde **400** `{"items": [...]}` y no escribe nada. `stock_actual` nunca queda negativo.

## Notas para el Dev
- Agrega las cantidades por `product_id` **antes** de comparar contra `stock_actual`.
- Decide y documenta si además se consolidan los `SaleItem` duplicados en uno solo (afecta el recibo) — si cambias eso, avisa: toca [[patron-impresion-recibos]].
- El total lo sigue recalculando el servidor desde `product.precio_venta` (`Decimal`) — no toques eso.
- Doble actualización: `el_vuelto_backend/CLAUDE.md` (Sales).
