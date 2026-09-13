---
tags: [tarea, sales, inventory, frontend, produccion]
status: 🔴
prioridad: alta
updated: 2026-09-13
---

# SALES-20260913-historial-truncado-sin-aviso — ventas y movimientos también se cortan en 50

Hermana de [[PRODUCTS-20260913-listado-truncado-en-50]], separada a propósito **porque el arreglo es
otro**. En el catálogo se pudo quitar la paginación; acá **no se debe**.

## El problema
Mismo mecanismo: `PAGE_SIZE = 50` global (`settings/base.py:110-111`), el front lee `results` e ignora
`next` (`salesApi.ts:49-50`, `inventoryApi.ts:34-35,44-45`), y **ninguna pantalla tiene control de
paginación**. Resultado: `SalesHistoryPage` e `InventoryPage` muestran **50 filas como máximo**, sin
ninguna señal de que falte algo.

El orden acá es `-created_at` (`sales/models.py:33`), así que lo que se pierde son **las más viejas**
del rango filtrado — menos visible que en el catálogo, y por eso nadie lo reportó todavía.

> [!info] Los reportes NO están afectados
> Los 5 endpoints de `/api/reports/` son `APIView`, no paginan. Totales, gráficas y `sales-detail`
> devuelven el rango completo. Lo truncado es el **listado** de la pantalla de historial, no la plata.

## Por qué NO se arregla como el catálogo
Un catálogo tiene cientos de filas y un techo natural. **Las ventas crecen para siempre**: un negocio
con dos años de operación tiene decenas de miles. Servirlas enteras sería cambiar un bug por un
problema de memoria y de tiempo de respuesta que empeora cada día.

## Opciones (decisión pendiente)
| opción | qué implica |
|---|---|
| **A. Paginación real en la UI** | control de páginas en `SalesHistoryPage` e `InventoryPage`, leyendo `count`/`next`. Es la correcta y la más cara |
| **B. Ventana de fechas obligatoria** | la pantalla siempre filtra por rango (hoy / semana / mes) y se avisa si el rango excede lo que entra en una página |
| **C. Subir `PAGE_SIZE` y avisar** | parche: sigue truncando, solo que más tarde. Solo sirve como mitigación temporal si se acompaña de un cartel visible |

Mínimo aceptable mientras no se decida: que la pantalla **diga** que está mostrando 50 de N, en vez de
mentir por omisión.

## Criterio de aceptación
Con más de 50 ventas en el rango filtrado, el usuario puede llegar a todas **o** la pantalla dice
explícitamente cuántas está mostrando de cuántas.

## Enlaces
[[PRODUCTS-20260913-listado-truncado-en-50]] · [[RUN-20260913-catalogo-sin-paginar]]
