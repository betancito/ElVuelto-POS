---
tags: [prompt, products, inventory, sales, dinero, stock, fix]
status: 🔴
module: products
updated: 2026-08-05
---

# 🔒 Prompt DEV — Ponerle piso al dinero y al stock

**Tarea backlog:** [[PRODUCTS-20260805-valores-negativos-dinero-y-stock]]
**Alcance:** una invariante en 2 módulos del backend. No git. No tocar el front.

## La invariante

> **El dinero no es negativo y el stock no baja de cero.**

Los campos numéricos no tienen validadores de mínimo: `precio_venta` solo lleva el `DecimalValidator` que Django agrega por `max_digits`/`decimal_places`. Verificado por el Planner de punta a punta.

## 1. 🔒 Un precio negativo hace que la caja **entregue** plata

```
POST /api/products/  {"precio_venta": "-50000.00", "tipo": "CON_CODIGO", ...}   → 201 CREADO
POST /api/sales/     {"monto_recibido": "0.00", "items": [ese producto ×1]}
   → 201 | total: -50000.00 | cambio: 50000.00
```

El servidor acepta la venta y le dice al cajero que **entregue $50.000** por algo que no cobró. El guard de [[SALES-20260802-guard-monto-recibido]] se cumple sin despeinarse: `0 >= -50000`.

No hace falta un atacante: **un `-` de más al cargar un producto** y la caja empieza a regalar plata.

## 2. Un `AJUSTE` deja el stock bajo cero

```
producto con stock_actual = 5
POST /api/inventory/movements/  {"tipo_movimiento": "AJUSTE", "cantidad": -99}  → 201
stock_actual quedó en: -94
```

[[RUN-20260804-items-duplicados-sobreventa]] cerró la sobreventa **por el camino de ventas** (y aguantó todo, incluidas dos ventas concurrentes reales). Inventory tiene su propia puerta y no valida el resultado.

## Qué hacer

### Precios
Piso en `precio_venta` y `precio_costo`. **Defensa en profundidad**: en el serializer (400 por campo, mensaje en español) **y** en el modelo (`MinValueValidator`), porque los comandos de management y el `/admin/` no pasan por DRF — es la lección de [[auditoria-adversarial-20260805]].

Decidí y justificá: ¿el mínimo es `0` o algo mayor? Un producto de precio 0 puede ser legítimo (una promoción, un combo); uno negativo nunca.

### Stock
Que un movimiento no pueda dejar `stock_actual` bajo cero → **400** con un mensaje que diga cuánto hay disponible (como hace el error de venta).

⚠️ **La regla es sobre el resultado, no sobre el signo.** Un `AJUSTE` negativo es legítimo (corregir una merma); lo que no puede es dejar el stock negativo. No prohíbas cantidades negativas.

⚠️ Hacelo dentro de la transacción y con el mismo cuidado de concurrencia que ya usa la venta (`select_for_update`), o dos ajustes simultáneos se saltan el chequeo.

### ⚠️ Antes de tocar migraciones
**Mirá si hay filas que ya violan la regla.** Un `CheckConstraint` que falle a mitad de una migración en producción es peor que el bug. Si las hay, decidí (limpiarlas, o quedarte en validadores sin constraint) y **decilo en el reporte**. `MinValueValidator` en el modelo **no** genera constraint de BD — solo valida en `full_clean()`/forms — así que es la opción de bajo riesgo.

## Restricciones
- Solo `apps/products/` y `apps/inventory/`. **Nada de front.** No toques `apps/sales/`: el fix del precio corta el problema en origen.
- ⚠️ **No rompas** lo entregado: agregación de stock por producto en ventas, guards de tenancy, `User.clean()`, PUT deshabilitado, throttling, params de fecha.
- Claves de error en español.

## Entregable / verificación
1. `makemigrations` / `makemigrations --check` — pegá la salida. Si generaste migración, decí cuántas filas existentes toca.
2. Pegá request/respuesta:

| # | Caso | Esperado |
|---|---|---|
| 1 | `POST /api/products/` con `precio_venta: "-50000.00"` | **400** `{"precio_venta": …}` |
| 2 | `PATCH` de un producto poniéndole precio negativo | **400** |
| 3 | Crear un producto por el **shell** (`Product.objects.create(precio_venta=-999)`) + `full_clean()` | **rechazado** |
| 4 | `AJUSTE` de `-99` sobre stock 5 | **400**, stock **sigue en 5** |
| 5 | `AJUSTE` de `-3` sobre stock 5 | **201**, stock queda en **2** (los negativos legítimos siguen) |
| 6 | `ENTRADA` de `+10` | **201** (regresión) |
| 7 | **`POST /api/products/` con precio `0`** | lo que hayas decidido — **decilo** |
| 8 | **Venta normal de un producto con precio positivo** | **201**, total y cambio correctos (regresión) |
| 9 | **Venta con el mismo producto repetido, suma > stock** | **400** (regresión de la sobreventa) |
| 10 | **`POST /api/sales/` como CAJERO** | **201** (regresión: el POS vende) |

3. Decí qué mínimo elegiste para los precios y por qué, y si generaste constraint de BD o te quedaste en validadores.
4. Veredicto ✅ / 🔴.

**Doble actualización:** `el_vuelto_backend/CLAUDE.md` — los pisos de precio y stock, y que la validación vive en serializer **y** modelo (con el porqué).

> [!warning] Si algo no cuadra
> Pará y reportá con `archivo:línea`. Todo lo de arriba se verificó ejecutando el 2026-08-05, pero el código manda.
