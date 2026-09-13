---
tags: [tarea, products, frontend, backend, produccion, incidente]
status: 🟢
prioridad: 🔒 alta
updated: 2026-09-13
---

# PRODUCTS-20260913-listado-truncado-en-50 — el catálogo del admin mostraba 50 de 83, y parecía pérdida de datos

> [!danger] Incidente de producción, reportado por un cliente real
> El dueño de un negocio avisó que *"después de crear un montón de productos, algunos no aparecen"*.
> No se perdió nada: **el listado del admin estaba cortado en 50**.

## La cadena
1. `elvuelto/settings/base.py:110-111` — paginación global de DRF, `PAGE_SIZE = 50`.
2. `apps/products/views.py` — `ProductViewSet` es `ModelViewSet`, así que `list` paginaba: devolvía
   `{count, next, previous, results}` con los **primeros 50**.
3. El mismo `get_queryset()` ordena por **`nombre`**, así que el corte era **alfabético**, no por fecha.
4. `el_vuelto_frontend/src/features/products/productsApi.ts:55-56` —
   `transformResponse: (r) => Array.isArray(r) ? r : r.results` — agarra `results` y **nunca sigue
   `next`**. Ninguna pantalla tiene control de paginación.
5. `ProductsPage.tsx:213-214` — el buscador filtra **en el cliente** sobre lo que llegó. Buscar un
   producto invisible devolvía *"No hay resultados"*, que se lee igual que *"nunca se creó"*.

> [!warning] Por qué parecía pérdida de datos y no un corte
> Como el orden es alfabético, **cada producto nuevo con nombre temprano empujaba a otro fuera de los
> 50 visibles**. El conjunto de "desaparecidos" cambiaba solo cada vez que cargaban uno. Eso es lo que
> hizo que el dueño concluyera que la app estaba borrando cosas.

## La evidencia que lo cerró
La trajo el propio owner: `GET https://elvuelto.online/api/products/` →
```
"count": 83,  "next": ".../api/products/?page=2",  results: [ ...50 items... ]
```
83 en la base, 50 entregados, 33 inalcanzables desde la UI. El último de la página 1 era
*"Kola roman pet 400"*: **todo lo que empezaba con L–Z estaba invisible**.

## El arreglo
`pagination_class = None` en `ProductViewSet` y `CategoryViewSet` (`apps/products/views.py`), con el
comentario que explica por qué. **No hace falta tocar el frontend**: su `transformResponse` ya acepta
las dos formas.

> [!decision] Ventas e inventario NO se tocaron, a propósito
> `SaleViewSet` e `InventoryMovementViewSet` **conservan** su paginación: esas tablas crecen sin techo y
> ahí la solución correcta es un control de paginación real en la UI (o una ventana de fechas
> obligatoria), no quitar el límite. El catálogo es distinto: tiene cientos de filas, no millones, y la
> acción `pos` **ya lo servía entero** para la pantalla del cajero — o sea que servirlo completo ya era
> la forma establecida de la lectura más caliente de la app.

## Verificación (contra el stack real, no lectura de código)
| prueba | resultado |
|---|---|
| `ProductViewSet().paginator` / `CategoryViewSet().paginator` | `None` / `None` |
| `GET /api/products/` con JWT real de admin | **lista plana**, sin `count`/`next` |
| `GET /api/products/categories/` | lista plana |
| `GET /api/sales/` · `/api/inventory/movements/` | **siguen paginadas** ✅ (no se tocaron) |
| **prueba de volumen**: 120 productos creados dentro de `transaction.atomic()` | `GET /api/products/` devolvió **125 de 125** (antes: 50). Rollback → la BD quedó en 5, intacta |
| `makemigrations --check` | *No changes detected*, exit 0 |
| `npx tsc --noEmit` | exit 0 |

El 403 del primer intento —con un token de `RefreshToken.for_user()`, que no lleva el claim
`tenant_id`— confirmó de paso que el guard de tenancy funciona.

## Lo que queda abierto (no es este ítem)
El mismo patrón trunca en 50 **el historial de ventas y los movimientos de inventario**, sin ninguna
señal en pantalla. Un negocio con más de 50 ventas en el rango que filtre ve su historial cortado.
Los **reportes no mienten** (son `APIView` sin paginar: los totales y las gráficas están bien); lo
truncado es el detalle. Ficha aparte: [[SALES-20260913-historial-truncado-sin-aviso]].

## Enlaces
[[RUN-20260913-catalogo-sin-paginar]] · [[SALES-20260913-historial-truncado-sin-aviso]] ·
[[INFRA-20260913-el-deploy-a-azure-ya-corrio]] · [[2026-09-13-planner-paso0-resync]]
