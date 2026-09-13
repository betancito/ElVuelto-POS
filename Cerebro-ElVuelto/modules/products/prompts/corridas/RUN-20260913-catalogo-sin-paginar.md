---
tags: [corrida, run, products, produccion, incidente]
status: cerrado
module: products
updated: 2026-09-13
---

# RUN-20260913-catalogo-sin-paginar — arreglo en caliente del catálogo truncado

**Tarea:** [[PRODUCTS-20260913-listado-truncado-en-50]] · **Tipo:** incidente de producción ·
**Ejecutó:** el Planner directo ([[GOBERNANZA]] §10, pedido del owner en el chat).

## Cómo llegó
El owner reportó que un cliente real no veía algunos productos recién creados. Dos pistas suyas
orientaron todo: **las imágenes sí estaban en Cloudinary**, y después trajo la respuesta cruda del API
con `"count": 83` y 50 items. La primera descartó pérdida de datos (el upload va a
`POST /products/{id}/upload_image/` y necesita el UUID de un producto ya creado); la segunda cerró el
diagnóstico sin necesidad de entrar al servidor.

## Diagnóstico
Paginación global de DRF (`PAGE_SIZE = 50`) aplicándose al catálogo, con un frontend que lee `results`
e ignora `next` y sin ningún control de paginación en la UI. Corte **alfabético** (`order_by("nombre")`),
así que cada producto nuevo de nombre temprano empujaba a otro fuera de la vista. Detalle completo en
la ficha.

## Cambio
| archivo | qué |
|---|---|
| `el_vuelto_backend/apps/products/views.py` | `pagination_class = None` en `ProductViewSet` y `CategoryViewSet`, con el comentario del porqué y la advertencia de no hacer lo mismo en ventas/inventario |
| `el_vuelto_backend/CLAUDE.md` | gotcha nuevo bajo «DRF config»: el catálogo opta por salirse de la paginación y el front lo asume; qué listas **siguen** truncadas; `?page_size=` se ignora |
| `.gitignore` (raíz) | sección de material criptográfico (`*.pem`, `*.key`, `*.p12`, `*.pfx`, `id_rsa*`, `id_ed25519*`) — pedido del owner en el mismo mensaje, cierra la mitad estructural de [[INFRA-20260913-clave-ssh-de-la-vm-sin-ignorar]] |

**Frontend: cero cambios.** Su `transformResponse` ya aceptaba las dos formas
(`Array.isArray(r) ? r : r.results`).

## Verificación — contra el stack real
```
paginator de ProductViewSet  : None
paginator de CategoryViewSet : None

200  /api/products/             -> LISTA PLANA (5 items)   <- sin paginar
200  /api/products/categories/  -> LISTA PLANA (3 items)   <- sin paginar
200  /api/products/pos/         -> LISTA PLANA (5 items)   <- sin cambios
200  /api/sales/                -> PAGINADA count=14       <- intacta ✅
200  /api/inventory/movements/  -> PAGINADA count=18       <- intacta ✅
```

**Prueba de volumen** (la que de verdad prueba el arreglo), con 120 productos creados dentro de
`transaction.atomic()` y revertidos:
```
productos en BD durante la prueba : 125  (base 5 + 120)
GET /api/products/    devuelve    : 125 items
ANTES del arreglo habria devuelto : 50 (y 'next' a la pagina 2)
despues del rollback, en BD quedan: 5 productos  <- intacto
```

`makemigrations --check` → *No changes detected*, exit 0. `npx tsc --noEmit` → exit 0.

> [!info] Un 403 que salió a favor
> El primer intento usó `RefreshToken.for_user(admin)`, que **no** lleva el claim `tenant_id`, y los
> tres endpoints devolvieron **403**. No era un bug del arreglo: era `require_tenant` haciendo su
> trabajo. Se repitió con `CustomTokenObtainPairSerializer.get_token`, que es el camino real del login.

## Desviaciones de protocolo, anotadas ([[GOBERNANZA]] §10.2)
- **Sin revisión adversarial.** El cambio es de dos líneas y no toca dinero, permisos ni tenancy, y
  había un cliente afectado en vivo. Queda anotado, no escondido.
- **Sin verificación contra producción.** Se probó contra el backend local con la BD local (5
  productos + 120 simulados). La confirmación en el negocio real la hace el owner después del
  redespliegue: la pantalla de productos tiene que mostrar **83**.

## Lo que este incidente deja abierto
[[SALES-20260913-historial-truncado-sin-aviso]] — el mismo corte de 50 vive en el historial de ventas y
en los movimientos de inventario, y **ahí no se arregla igual**: esas tablas crecen sin techo.

## Enlaces
[[PRODUCTS-20260913-listado-truncado-en-50]] · [[SALES-20260913-historial-truncado-sin-aviso]] ·
[[INFRA-20260913-clave-ssh-de-la-vm-sin-ignorar]] · [[GOBERNANZA]]
