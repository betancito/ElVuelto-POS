---
tags: [adr, decision, sales, inventory, products, negocio]
status: aceptada
module: sales
updated: 2026-08-16
---

# ADR-SALES-20260816-stock-negativo-permitido — una venta puede dejar el stock en negativo

**Fecha:** 2026-08-16 · **Estado:** ✅ aceptada e implementada · **Pedido directo del owner**, con modo
plan aprobado ([[GOBERNANZA]] §10) · **Corrida:** [[RUN-20260816-stock-negativo-permitido]]

## Contexto
Hasta hoy, `POST /api/sales/` devolvía **400 "Stock insuficiente"** cuando un producto `CON_CODIGO` no
tenía unidades registradas. Eso ata la caja al inventario: si llegaron 30 gaseosas y nadie alcanzó a
registrarlas —porque el negocio estaba lleno, que es justo cuando pasa— el cajero **no puede vender**.

Palabras del owner: *"para no limitar un negocio a que siempre tiene que estar llenando el inventario
para poder vender… si tengo 20 gaseosas y vendí 30 porque me llegó un pedido pero no tuve tiempo de
registrarlo, vamos a permitir que el inventario quede en números negativos"*.

## Decisión

1. **Una venta NUNCA se rechaza por falta de stock.** El negativo no es un error de datos: es el
   registro fiel de que la mercancía salió y la **entrada está pendiente**. La deuda es el recordatorio.

2. **El negativo tiene que verse, en tres lugares distintos**, o sería un agujero silencioso:
   - **Al cajero, en el momento**: `POST /api/sales/` devuelve `stock_negativo` (los productos *de esa
     venta* que quedaron bajo cero) y el `SuccessModal` lo muestra. No frena ni pide confirmar — el
     owner eligió "vende y avisa" sobre "pide confirmar", porque el paso extra pega justo en el momento
     ajetreado que la feature quiere desbloquear.
   - **Al admin/líder, en Inventario**: KPI **"En negativo"** propio, badge *"Falta registrar entrada"* y
     un chip de filtro. **Disjunto de "bajo mínimo"**: un -10 no es un nivel bajo que reponer, es una
     deuda que saldar; mezclarlos escondía el caso urgente entre los ordinarios.
   - **En las otras pantallas que pintan stock** (`ProductsPage`, el panel de entrada del POS), en rojo
     y con texto de acción, no con el gris de un número sano.

3. **El guard de inventario pasó a ser DIRECCIONAL** — `if cantidad < 0 and resultante < 0`. Es el
   cambio menos obvio y el más importante: la regla vieja miraba solo el resultado, así que con el stock
   en −10 una **ENTRADA parcial de +5** daba −5 y quedaba **rechazada**. Se podía caer al hueco pero solo
   salir de un salto que cubriera toda la deuda. Un movimiento que suma siempre entra; un AJUSTE negativo
   sigue sin poder cavar más hondo (una venta es un hecho, un ajuste manual es alguien tecleando).

4. **`Product.stock_actual` pierde su `MinValueValidator(0)`** — se mantiene en `stock_minimo` y en los
   precios. No protegía este camino (las ventas escriben con `F()` + `.update()`, que nunca llaman
   `full_clean()`); solo haría mentir al modelo y dejaría a un admin sin poder guardar nada en `/admin/`
   sobre un producto en −10. Migración `products/0004`: `AlterField` sin cambio en la BD — la columna ya
   era `IntegerField` sin `CHECK`.

5. **Como consecuencia obligada del punto 4, `stock_actual` pasó a `read_only` en `ProductSerializer`.**
   DRF deriva el `min_value` de un campo desde los validators del modelo, así que quitarlo abrió
   `PATCH {"stock_actual": -9999}` → 200 donde antes era 400. El arreglo correcto no era devolver el
   piso sino cerrar la escritura: **el stock solo se mueve por `InventoryMovement`**, el único camino con
   `F()`, lock de fila y rastro de auditoría. El front nunca mandó el campo.

6. **`cantidad` se acota a 10.000 por línea.** El chequeo de stock era, de rebote, el único techo: sin
   él una cantidad disparatada desborda `Sale.total` (`numeric(10,2)`) y sale como 500 en vez de 400.

## Qué sobrevive de las decisiones anteriores, y qué no
- [[SALES-20260804-items-duplicados-sobreventa]] — su corrección era **doble**: (a) rechazar por la suma,
  (b) no descontar dos veces. **(a) se retira a propósito**; (b) ya no aplica, porque descontar por línea
  es ahora el resultado correcto. La suma por producto quedó sin lector y se reemplazó por un `set` de
  ids: mantener el `defaultdict` era aritmética muerta disfrazada de red de seguridad.
- [[PRODUCTS-20260805-valores-negativos-dinero-y-stock]] — **el dinero conserva su piso intacto**
  (`precio_venta`, `precio_costo`) y `stock_minimo` también. Lo único que se retira es el piso de
  `stock_actual`, y a cambio ese campo dejó de ser escribible por API, que es una superficie **más
  cerrada** que antes.

## Alternativas descartadas
- **Pedir confirmación al cajero** antes de vender en negativo: frena el error de escaneo, pero mete un
  toque extra justo en el momento que la feature existe para destrabar. Descartada por el owner.
- **Un límite al negativo** (no bajar de −N): arbitrario, y volvería a bloquear la caja en el caso que
  motivó todo.
- **Devolverle el piso a `stock_actual` en el serializer** en vez de hacerlo `read_only`: mantendría
  abierta una escritura de stock sin `F()`, sin lock y sin auditoría, que es un problema aparte del signo.

## Pendiente (el owner lo dejó explícito para después)
*"Ya veremos cómo recordarle al cajero líder o al administrador que se encargue de registrar lo que
llegó"* — el recordatorio **activo** (notificación, tarea, correo) no se hizo. Lo que hay hoy es
**pasivo**: hay que entrar a Inventario para verlo. Ver [[INVENTORY-20260816-recordatorio-activo-stock-negativo]].
