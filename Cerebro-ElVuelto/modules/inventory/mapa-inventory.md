---
tags: [modulo, mapa]
status: vivo
module: inventory
updated: 2026-08-02
---

# Inventory — Mapa de código

Rutas absolutas base: back `el_vuelto_backend/apps/inventory/`, front `el_vuelto_frontend/src/features/inventory/`.

## Backend

| archivo:línea | qué hace | notas |
|---|---|---|
| `models.py:8-11` | `MovementType(TextChoices)`: `ENTRADA`, `SALIDA_VENTA`, `AJUSTE` | labels en español |
| `models.py:14-42` | `InventoryMovement(TenantMixin)` | UUID PK, ver [[datos-inventory]] |
| `models.py:35-39` | `Meta`: `db_table="inventory_movements"`, `ordering=["-created_at"]` | sin constraints propios |
| `models.py:41-42` | `__str__` = `"{tipo} \| {product} \| {cantidad}"` | |
| `serializers.py:9-65` | `InventoryMovementSerializer(ModelSerializer)` | el corazón de la validación |
| `serializers.py:10-11` | `product_nombre`/`user_nombre` = `CharField(source=..., read_only)` | denormalizados en la respuesta |
| `serializers.py:29` | `read_only_fields = [id, tenant, user, created_at]` | `product`, `tipo_movimiento`, `cantidad`, `precio_costo`, `proveedor`, `nota` son escribibles |
| `serializers.py:31-36` | `validate_tipo_movimiento` | RECHAZA `SALIDA_VENTA` manual |
| `serializers.py:38-50` | `validate` | `ENTRADA` exige `cantidad>0`; `AJUSTE` exige `cantidad!=0` |
| `serializers.py:52-57` | `validate_product` | producto debe ser del mismo tenant (`request.tenant`) |
| `serializers.py:59-65` | `create` | crea movimiento y actualiza `Product.stock_actual += cantidad` con `F()` |
| `serializers.py:68-90` | `StockSerializer(ModelSerializer)` sobre `Product` | solo lectura |
| `serializers.py:89-90` | `get_bajo_minimo` = `stock_actual < stock_minimo` | `SerializerMethodField` |
| `views.py:15-61` | `InventoryMovementViewSet` (Create + List, NO ModelViewSet completo) | NO hereda `TenantModelViewSet` |
| `views.py:27-30` | `get_permissions`: create→`IsCajero`, resto→`IsAdmin` | |
| `views.py:32-40` | `create` override: si rol `CAJERO` exige `lead_cashier` y `tipo==ENTRADA` (si no `PermissionDenied`) | ADMIN/SUPERADMIN saltan el gate |
| `views.py:42-58` | `get_queryset`: filtra `tenant` + query params `product`, `fecha_inicio`, `fecha_fin` | `select_related(product,user)` |
| `views.py:60-61` | `perform_create`: `save(tenant=request.tenant, user=request.user)` | sin guard `tenant=None` |
| `views.py:64-76` | `StockView(APIView)`, `IsAdmin` | `Product` filtrado `CON_CODIGO` + `activo=True`, `order_by("nombre")` |
| `urls.py:6-11` | router `movements/` + path `stock/` | prefijo `/api/inventory/` (`elvuelto/urls.py:11`) |
| `admin.py:6-11` | Django admin de `InventoryMovement` | list_filter incluye tenant |
| `migrations/0001_initial.py` | crea `InventoryMovement` + FK product/tenant | |
| `migrations/0002_initial.py` | agrega FK `user` (PROTECT, related_name `inventory_movements`) | separada por dependencia AUTH_USER_MODEL |

## Frontend

| archivo:línea | qué hace | notas |
|---|---|---|
| `inventoryApi.ts:3-14` | interface TS `InventoryMovement` | ⚠️ omite `proveedor`; `precio_costo: string` (no null) |
| `inventoryApi.ts:16-28` | interface TS `StockItem` | espeja `StockSerializer` |
| `inventoryApi.ts:32-37` | `listMovements` query → `GET /inventory/movements/` | normaliza array vs `{results}`; tag `InventoryMovement` |
| `inventoryApi.ts:38-41` | `createMovement` mutation → `POST /inventory/movements/` | invalida `InventoryMovement` + `Product` |
| `inventoryApi.ts:42-47` | `getStock` query → `GET /inventory/stock/` | provee tags `InventoryMovement` + `Product` |
| `InventoryPage.tsx:25-35` | `schema` Zod del movimiento | enum solo `ENTRADA`/`AJUSTE` |
| `InventoryPage.tsx:38-47` | `TIPO_LABEL` / `TIPO_BADGE` mapas de presentación | incluye `SALIDA_VENTA→Venta` (para el historial) |
| `InventoryPage.tsx:69-215` | `ProductPicker` | dropdown buscable sobre `stock` |
| `InventoryPage.tsx:224-415` | `MovementModal` | el formulario, ver [[formularios-inventory]] |
| `InventoryPage.tsx:243-247` | `useEffect` pre-llena `precio_costo` desde el producto | dep `[selectedId]` |
| `InventoryPage.tsx:249-255` | `onSubmit` → `createMovement(...).unwrap()` | ⚠️ `catch {}` traga errores |
| `InventoryPage.tsx:418-467` | `MovementsTable` (pestaña Historial) | signo/color por `cantidad` |
| `InventoryPage.tsx:470-527` | `StockCard` (grilla de stock) | click abre modal pre-cargado |
| `InventoryPage.tsx:530-795` | `InventoryPage` (contenedor) | KPIs, tabs, escáner global |
| `InventoryPage.tsx:564-603` | escáner HID global (buffer 300ms, `Enter` flush) | busca por `s.barcode===code` |
| `InventoryPage.tsx:616-621` | KPIs: totalProductos, valorTotal, alertas | cálculo en cliente |
| `InventoryPage.module.css` | ⚠️ archivo existe pero la página usa clases `ta-*` inline | ver [[preguntas-inventory]] P-2 |
| `app/router.tsx:97` | ruta `/inventory` dentro del bloque `allowedRoles={['ADMIN']}` | solo ADMIN |
