---
tags: [corrida, products, inventory, dinero, stock]
status: 🟢 corrido-ok
module: products
updated: 2026-08-05
---

# 🔒 RUN 2026-08-05 — Piso al dinero y al stock

**Prompt:** [[PROMPT-FIX-PRODUCTS-20260805-valores-negativos]] · **Tarea:** [[PRODUCTS-20260805-valores-negativos-dinero-y-stock]]
**Veredicto:** ✅ PASÓ — **10/10**, verificado ejecutando.

## Diff entregado
`apps/products/{models,serializers}.py`, `apps/inventory/serializers.py` + migración `products/0003` (**aplicada**). `makemigrations --check` → `No changes detected`. Front intacto.

## Las tres advertencias del prompt, atendidas
1. **Sin `CheckConstraint`** — solo `MinValueValidator` en el modelo, que es la opción de bajo riesgo que le señalé: no genera constraint de BD, así que ninguna migración puede fallar a mitad por filas preexistentes. Y como `ModelSerializer` copia los validadores del modelo, DRF los hereda gratis; el `min_value` explícito del serializer existe solo para adueñarse del mensaje en español.
2. **La regla del stock es sobre el resultado, no sobre el signo** — un `AJUSTE` de −3 sigue funcionando; lo que se bloquea es dejar el stock bajo cero.
3. **Concurrencia** — `@transaction.atomic` + `select_for_update()` sobre la fila del producto **antes** de comprobar (`inventory/serializers.py:70-90`), igual que la venta. Sin eso, dos ajustes simultáneos se saltaban el chequeo.

**Decisión reportada:** el mínimo es **0**, no algo mayor — un producto a $0 es legítimo (promo, combo, muestra); lo que rompe la invariante es el negativo. De acuerdo.

## Verificación (10/10)

| # | Caso | Resultado |
|---|---|---|
| 1 | `POST /products/` con `precio_venta: -50000` | **400** `El precio de venta no puede ser negativo.` |
| 2 | `PATCH` a precio negativo | **400** |
| 3 | **Shell**: `Product(precio_venta=-999).full_clean()` | **rechazado** ← la defensa en profundidad funciona |
| 4 | `AJUSTE` −99 sobre stock 10 | **400** · stock sigue en 10 · *"dejaría el stock en -89. Disponible de 'P': 10."* |
| 5 | `AJUSTE` −3 (legítimo) | **201** · stock → 7 |
| 6 | `ENTRADA` +10 | **201** · stock → 17 |
| 7 | `POST` con precio `0` | **201** (decisión documentada) |
| 8 | Venta normal | **201** · total 2000 · cambio 3000 |
| 9 | Duplicado que excede el stock | **400** (regresión de la sobreventa) |
| 10 | `POST /sales/` como CAJERO | **201** — el POS vende |

El caso 3 es el que valida el diseño: el `/admin/`, el shell y los comandos de management no pasan por DRF, y ahí el validador del modelo es la única red.
El mensaje del caso 4 dice el disponible, que era el pedido explícito para que el admin entienda el rechazo.

## Doble actualización
`el_vuelto_backend/CLAUDE.md`: las dos capas y por qué son dos, que el cero se permite a propósito, el ejemplo concreto del total negativo con `cambio` positivo, y que la regla del stock es sobre el resultado.

## Cierre de la familia "el servidor no confía en el payload"
Con esto quedan cerrados los tres agujeros de dinero/stock encontrados: [[SALES-20260802-guard-monto-recibido]] (monto insuficiente), [[SALES-20260804-items-duplicados-sobreventa]] (ítems repetidos) y este (valores negativos por producto y por ajuste).
