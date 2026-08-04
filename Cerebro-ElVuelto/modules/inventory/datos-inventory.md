---
tags: [modulo, datos, modelo]
status: vivo
module: inventory
updated: 2026-08-02
---

# Inventory — Modelos y BD

Único modelo del módulo: `InventoryMovement` (`apps/inventory/models.py:14-42`). El "stock" NO es un modelo: es el campo `Product.stock_actual` que este módulo mueve. Ver [[products--inventory]].

## `InventoryMovement` (hereda `TenantMixin`)

Tabla: `inventory_movements` · `ordering = ["-created_at"]` · `verbose_name = "Movimiento de inventario"`.

| campo | tipo | null/blank | default | notas |
|---|---|---|---|---|
| `id` | `UUIDField` PK | — | `uuid.uuid4` | `editable=False` (`:15`) |
| `tenant` | FK → `tenants.Tenant` | NOT NULL | — | de `TenantMixin`; `on_delete=CASCADE`; `related_name="inventory_inventorymovement_set"` (`tenants/models.py:58-65`) |
| `product` | FK → `products.Product` | NOT NULL | — | `on_delete=PROTECT`, `related_name="movements"` (`:16-20`) |
| `user` | FK → `users.User` | NOT NULL | — | `on_delete=PROTECT`, `related_name="inventory_movements"` (`:21-25`); agregado en migración 0002 |
| `tipo_movimiento` | `CharField(max_length=20)` | NOT NULL | — | `choices=MovementType` (`:26`) |
| `cantidad` | `IntegerField` | NOT NULL | — | help_text: "Positive for ENTRADA, negative for SALIDA/AJUSTE." (`:27-29`) — **el signo lo pone el negocio, la BD no lo valida** |
| `precio_costo` | `DecimalField(10,2)` | null=True, blank=True | — | (`:30`) opcional |
| `proveedor` | `CharField(max_length=200)` | null=True, blank=True | — | (`:31`) opcional; ⚠️ el form nunca lo llena |
| `nota` | `TextField` | blank=True (NOT NULL) | `""` | (`:32`) — nótese: **no** `null=True`, en BD guarda cadena vacía |
| `created_at` | `DateTimeField` | — | `auto_now_add=True` | (`:33`) sin `updated_at` |

### `MovementType` (`models.py:8-11`, TextChoices)
- `ENTRADA` = "Entrada de inventario" — ingreso manual (cantidad > 0).
- `SALIDA_VENTA` = "Salida por venta" — **automática**, la crea [[sales]] con `cantidad` negativa; prohibida por API manual.
- `AJUSTE` = "Ajuste de inventario" — corrección manual (cantidad != 0, puede ser negativa).

## Constraints, índices, unicidad
- **Sin** `UniqueConstraint`/`unique_together`.
- **Sin** índices explícitos más allá de los FK (`tenant`, `product`, `user` generan índice automático en Postgres).
- **Sin** check constraint de signo de `cantidad` ni de piso de stock. Todo el control de coherencia vive en el **serializer**, no en la BD ni en el modelo.

## Dónde vive cada validación
| regla | dónde | ancla |
|---|---|---|
| `SALIDA_VENTA` no manual | serializer | `serializers.py:31-36` |
| `ENTRADA` cantidad>0 | serializer | `serializers.py:42-45` |
| `AJUSTE` cantidad!=0 | serializer | `serializers.py:46-49` |
| producto del mismo tenant | serializer | `serializers.py:52-57` |
| gate lead_cashier / tipo CAJERO | vista `create` | `views.py:34-39` |
| actualización de `stock_actual` | serializer `create` con `F()` | `serializers.py:59-65` |
| ❌ stock ≥ 0 (piso) | **en ninguna parte** | ver [[ajuste-stock-negativo]] |
| ❌ `cantidad` signo en BD | **en ninguna parte** (solo help_text) | `models.py:27-29` |
| ❌ `clean()` de modelo | **no existe** | `models.py` solo tiene `__str__` |

## Migraciones clave
- `0001_initial.py` (2026-04-12): crea `InventoryMovement` con FK `product` (PROTECT) y `tenant` (CASCADE, `related_name="%(app_label)s_%(class)s_set"`). db_table, ordering.
- `0002_initial.py` (2026-04-12): agrega FK `user` (PROTECT, `related_name="inventory_movements"`) — separada por `swappable_dependency(AUTH_USER_MODEL)`.

## Relaciones salientes / conexiones
- `product` → `Product` (PROTECT): no se puede borrar un producto con movimientos. `stock_actual`/`stock_minimo`/`precio_costo`/`barcode`/`proveedor`/`activo`/`tipo` viven en `Product` (`products/models.py:40-49`). Ver [[products--inventory]].
- `user` → `User` (PROTECT): quién registró el movimiento. `lead_cashier` (`users/models.py:46`) habilita a un CAJERO a crear `ENTRADA`. Ver [[users--inventory]].
- `SALIDA_VENTA` la escribe `sales/serializers.py:151-160` (crea el movimiento con `cantidad=-item.cantidad` y decrementa stock con `F()` en paralelo, **saltándose** `InventoryMovementSerializer.create`). Ver [[sales--inventory]].

## StockSerializer (no es modelo, es vista de `Product`)
`serializers.py:68-90` — proyección de solo lectura de `Product` para `/stock/`. Campo calculado `bajo_minimo` (`stock_actual < stock_minimo`, `:89-90`). Ver forma completa en [[contratos-inventory]].
