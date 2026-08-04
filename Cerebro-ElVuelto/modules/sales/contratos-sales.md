---
tags: [modulo, contratos, api]
status: vivo
module: sales
updated: 2026-08-02
---

# Sales — Contratos de API

Base montada en `elvuelto/urls.py:12` → `path("api/sales/", include("apps.sales.urls"))`. Router `DefaultRouter` registrado en `""` (`urls.py:5-8`), basename `sale`. **Ningún endpoint es `AllowAny`**: el default DRF es `IsAuthenticated` (`settings/base.py:97-99`) y `SaleViewSet.get_permissions` refina por acción.

**Filtrado por tenant:** manual en `views.py:29` (`Sale.objects.filter(tenant=self.request.tenant)`). `request.tenant` lo inyecta `TenantMiddleware` desde el `tenant_id` del JWT (`tenants/middleware.py:23-31`). En `create`, el tenant sale de `request.tenant` dentro del serializer (`serializers.py:108-109`). Ver [[tenant-filter-manual-y-superadmin]].

---

## POST `/api/sales/` — crear venta

- **Vista:** `SaleViewSet.create` (`views.py:60-65`) · serializer `SaleCreateSerializer` (`serializers.py:55-162`)
- **Permiso:** `IsCajero` (`views.py:24-25`) → CAJERO **+ ADMIN + SUPERADMIN** (`users/permissions.py:26-34`)
- **Request (JSON):**
  ```json
  {
    "items": [{ "product": "<uuid>", "cantidad": 2 }],
    "metodo_pago": "EFECTIVO",
    "monto_recibido": 50000
  }
  ```
  - `items`: `min_length=1` (`serializers.py:58`); cada item solo `product`(UUID) + `cantidad`(int ≥1) (`serializers.py:13-17`).
  - `metodo_pago`: choice `EFECTIVO` | `NEQUI_TRANSFERENCIA` (`serializers.py:59`).
  - `monto_recibido`: Decimal(10,2), `required=False`, `allow_null=True` (`serializers.py:60-65`). Obligatorio si `EFECTIVO` (`validate` :71-75).
  - ⚠️ El front manda además `precio_unitario` por item (`PosPage.tsx:264`) — **el serializer lo ignora** (no está declarado). El precio es autoritativo del servidor (`product.precio_venta`, `serializers.py:121`).
- **Response 201:** `SaleSerializer` (`views.py:64`) → `{ id, codigo, tenant, user, user_nombre, total(str), metodo_pago, monto_recibido(str|null), cambio(str|null), items[], created_at }`.
- **Efectos secundarios (atómicos):** por cada `CON_CODIGO` crea `InventoryMovement SALIDA_VENTA` (cantidad negativa) y descuenta `Product.stock_actual` con `F()` (`serializers.py:150-160`).
- **Errores:**
  - `400` `{"monto_recibido": "Requerido para pagos en EFECTIVO."}` (`serializers.py:73-74`).
  - `400` `{"items": ["Producto <id> no encontrado o inactivo.", "Stock insuficiente para '<nombre>': disponible X, solicitado Y."]}` (`serializers.py:91-100`).
  - `400` DRF por `items` vacío / `cantidad<1` / choice inválido.
  - `401` sin token; `403` si el rol no pasa `IsCajero`.
  - ⚠️ **No hay 400 por `monto_recibido < total`** → `cambio` negativo se persiste. Ver [[dinero-y-guard-monto]].

---

## GET `/api/sales/` — listar ventas

- **Vista:** `SaleViewSet.list` (mixin) · serializer `SaleSerializer`
- **Permiso:** `IsAdmin` (`views.py:26`) → ADMIN + SUPERADMIN. **CAJERO NO puede listar.**
- **Query params (todos opcionales, `views.py:33-51`):**
  - `fecha_inicio` (`created_at__date__gte`)
  - `fecha_fin` (`created_at__date__lte`)
  - `metodo_pago` (exacto)
  - `user` (FK `user_id`)
  - `search` → `Q(codigo__icontains) | Q(user__nombre__icontains)`
- **Response 200:** **paginada** por defecto (PageNumberPagination, PAGE_SIZE 50 — `settings/base.py:100-101`, sin override en la vista) → `{ count, next, previous, results: [SaleSerializer...] }`. El front (`salesApi.ts:44-45`) descarta todo menos `results` y **nunca pide `?page=`** → tope 50 ventas visibles. Ver [[paginacion-historial-tope-50]].
- **Errores:** `401`, `403` (CAJERO).

---

## GET `/api/sales/{id}/` — detalle de venta

- **Vista:** `SaleViewSet.retrieve` (mixin) · serializer `SaleSerializer`
- **Permiso:** `IsAdmin` (`views.py:26`). Pensado para "reimprimir recibo" (docstring `views.py:20`), pero solo accesible por ADMIN. El front no tiene página que lo consuma (`getSale` existe en `salesApi.ts:49` pero sin uso encontrado). ❓ ver [[preguntas-sales]] P-3.
- **Response 200:** `SaleSerializer` (misma forma que create).
- **Errores:** `401`, `403`, `404` (id ajeno al tenant → filtrado por `get_queryset`).

---

## Notas de contrato
- `total`, `monto_recibido`, `cambio`, `precio_unitario`, `subtotal` viajan como **string** (DRF serializa `DecimalField` a string). El front hace `parseFloat` para mostrar.
- `monto_recibido` y `cambio` pueden ser `null` en la respuesta (NEQUI, o cambio no calculado) aunque el tipo TS los declara `string` no-null (`salesApi.ts:18-19`).
- `createSale` invalida tags `Sale`, `InventoryMovement`, `Product` (`salesApi.ts:54`) → refresca stock y movimientos tras vender.
