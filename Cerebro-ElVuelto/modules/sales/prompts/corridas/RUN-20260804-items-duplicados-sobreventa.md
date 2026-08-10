---
tags: [corrida, sales, fix, backend, stock]
status: 🟢 corrido-ok
module: sales
updated: 2026-08-04
---

# RUN 2026-08-04 — Ítems duplicados evadían el chequeo de stock (sales)

**Prompt:** [[PROMPT-FIX-SALES-20260804-items-duplicados-sobreventa]] · **Tarea:** [[SALES-20260804-items-duplicados-sobreventa]]
**Veredicto:** ✅ PASÓ

> [!info] Verificación ejecutada por el Planner
> `makemigrations --check` + los **7 casos** del criterio + **5 adversariales** propios (incluida la regresión de las dos corridas anteriores sobre este mismo archivo). **12/12.**

## Diff entregado
`apps/sales/serializers.py` + `el_vuelto_backend/CLAUDE.md`. Nada más (verificado por mtime: 21:40/21:41, y `find -newermt` no encontró ningún otro archivo tocado). Sin front, sin migraciones.

## Qué hizo
`_resolve_products` agrega las cantidades por producto **antes** de comparar:

```python
requested = defaultdict(int)
for item in items_data:
    requested[str(item["product"])] += item["cantidad"]
...
for pid, cantidad_total in requested.items():
    if product.stock_actual < cantidad_total:
```

Tres detalles que hizo bien sin que se los pidiera explícitamente:
- La query pasa a `id__in=list(requested)` — usa las claves ya deduplicadas en vez de la lista con repetidos.
- El error de "producto no encontrado" ahora sale **una vez por producto**, no una por línea repetida.
- El docstring explica el bug con el ejemplo numérico (stock 5, dos líneas de 3), que es lo que hace que no se reintroduzca.

## Verificación (12/12)

`makemigrations --check --dry-run` → `No changes detected`

**Criterio de aceptación (7/7)** — producto `CON_CODIGO`, `stock_actual = 5`:
| # | Payload | Resultado |
|---|---|---|
| 1 | mismo prod ×2 (3+3=6) | **400** `disponible 5, solicitado 6` · stock **sigue en 5** ← el bug |
| 2 | mismo prod ×2 (2+3=5) | **201** · stock → **0** |
| 3 | mismo prod ×3 (1+1+1=3) | **201** · stock → **2** |
| 4 | un ítem, cantidad 6 | **400** (regresión del caso simple) |
| 5 | un ítem, cantidad 2 | **201** · stock → **3** |
| 6 | dos productos distintos | **201** · cada stock bien descontado (2 y 4) |
| 7 | `SIN_CODIGO` repetido | **201** · no valida stock |

El mensaje reporta la cantidad **agregada** (`solicitado 6`), no la de una línea suelta — que era el pedido explícito para que el cajero entienda el rechazo.

**Adversariales del Planner (5/5):**
| # | Caso | Resultado |
|---|---|---|
| A | duplicado 2+3 aceptado | **201** · **2** `SaleItem`, **2** movimientos, total **5000.00**, stock 10→5 |
| B | regresión `monto_recibido` insuficiente | **400** `El monto recibido (100.00) es menor que el total (1000.00).` |
| C | regresión `require_tenant` (superadmin) | **403** |
| D | producto de **otro tenant** | **400** `no encontrado o inactivo` |
| E | duplicado 6+6=12 sobre stock 5 | **400** `solicitado 12` · stock intacto |

El caso A confirma la decisión de alcance: **no consolidó** las líneas duplicadas (2 `SaleItem`, 2 movimientos), y el total es correcto porque se recalcula por línea. B y C confirman que no rompió [[RUN-20260803-guard-monto-recibido]] ni [[RUN-20260804-guard-tenant-none-y-doc]], que tocaron este mismo archivo.

## Decisión de alcance: la tomó bien
El prompt le pedía decidir si consolidar los `SaleItem` duplicados y **reportar en vez de hacerlo** si se inclinaba por consolidar. Eligió **no consolidar** (alcance mínimo, no toca el recibo) y lo dejó documentado en el `CLAUDE.md` con la razón y con el contrato que rompería. Correcto.

## Doble actualización
`el_vuelto_backend/CLAUDE.md`: el paso 2 del flujo de venta (`:339`) ahora dice "against the **sum of quantities per product**", y hay dos gotchas nuevos (`:388-389`) — uno con el bug y su ejemplo numérico, otro explicitando que **no** se fusionan las líneas y por qué. Nota: **este prompt no incluyó la línea de doble actualización** (omisión mía al escribirlo); el Dev la hizo igual, por la Definition of Done de [[GOBERNANZA]] §5.

## Checklist de trampas
**#2 dinero** ✅ el total se sigue recalculando en el servidor con `Decimal`; el guard de `monto_recibido` intacto · **#1 tenancy** ✅ `require_tenant` intacto, producto ajeno rechazado · **#9 stock** ✅ sigue mutándose con `F()` dentro del `@transaction.atomic`; migraciones limpias · **#10 doble actualización** ✅ · **#11** ✅ sin git, sin scope creep.

## Residual
Ninguno nuevo.
