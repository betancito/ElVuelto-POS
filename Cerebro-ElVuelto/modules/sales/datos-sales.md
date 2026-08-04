---
tags: [modulo, datos, modelos]
status: vivo
module: sales
updated: 2026-08-02
---

# Sales — Datos y BD

Dos modelos en `apps/sales/models.py`. Migraciones: `0001_initial` (crea tablas), `0002_initial` (FKs user/product/sale), `0003_sale_codigo` (añade `codigo`).

---

## `Sale` — `models.py:15-45` · `db_table = "sales"`

Hereda `TenantMixin` (`tenants/models.py:58-68`) → añade FK `tenant` (CASCADE, `related_name="sales_sale_set"`). **`TenantMixin` NO auto-filtra**: es solo un FK abstracto.

| campo | tipo | null/blank | default | notas |
|---|---|---|---|---|
| `id` | UUIDField PK | — | `uuid4` | `editable=False` |
| `codigo` | CharField(10) | blank=True | (autogenerado) | `unique=True`, `editable=False`; generado en `save()` |
| `tenant` | FK → tenants.Tenant | — | — | CASCADE (del mixin) |
| `user` | FK → users.User | — | — | **PROTECT**, `related_name="sales"` |
| `total` | DecimalField(10,2) | no | — | recalculado server-side |
| `metodo_pago` | CharField(30) | no | — | choices `PaymentMethod` |
| `monto_recibido` | DecimalField(10,2) | null=True blank=True | — | solo se usa en EFECTIVO |
| `cambio` | DecimalField(10,2) | null=True blank=True | — | `= monto_recibido - total` (EFECTIVO) |
| `created_at` | DateTimeField | — | `auto_now_add` | |

- **Meta:** `ordering = ["-created_at"]` (`models.py:33`), verbose "Venta"/"Ventas".
- **`codigo`** (`models.py:35-42`): 7 chars `[A-Z0-9]`, loop `while` con `filter(codigo=code).exists()` hasta que sea único, luego `super().save()`. ⚠️ Check-then-save **sin lock** → carrera teórica; el `unique=True` en BD la atraparía con `IntegrityError` (no manejado → 500). Espacio 36^7 ≈ 78 mil millones → riesgo práctico despreciable. Ver [[preguntas-sales]] P-4.
- **`PaymentMethod`** (`models.py:10-12`): `EFECTIVO`, `NEQUI_TRANSFERENCIA`. Solo 2 valores; front espeja exactamente (`posSlice.ts:14`, `salesApi.ts:17`).

---

## `SaleItem` — `models.py:48-67` · `db_table = "sale_items"`

**NO hereda `TenantMixin`** (es `models.Model`, `models.py:48`). Su aislamiento por tenant depende del FK `sale`. No hay endpoint que exponga `SaleItem` directamente.

| campo | tipo | null/blank | notas |
|---|---|---|---|
| `id` | UUIDField PK | — | `uuid4`, `editable=False` |
| `sale` | FK → Sale | — | **CASCADE**, `related_name="items"` |
| `product` | FK → products.Product | — | **PROTECT**, `related_name="sale_items"` |
| `product_nombre` | CharField(200) | no | **snapshot** del nombre al vender |
| `precio_unitario` | DecimalField(10,2) | no | snapshot de `product.precio_venta` |
| `cantidad` | IntegerField | no | sin validador a nivel modelo (>=1 solo en serializer input) |
| `subtotal` | DecimalField(10,2) | no | `= precio_unitario * cantidad` |

- `product_nombre` y `precio_unitario` son **snapshots**: sobreviven al renombrado/re-precio del producto. No derivarlos del FK.
- No hay `UniqueConstraint` ni índice extra; sin `ordering` propio.

---

## Índices y constraints reales
- `sales.codigo` → índice único (de `unique=True`, migración 0003 paso 3).
- `sales.tenant_id`, `sales.user_id` → índices FK estándar de Django.
- `sale_items.sale_id`, `sale_items.product_id` → índices FK.
- **No** hay `unique_together` ni `UniqueConstraint` en estos modelos.

---

## Dónde vive cada validación

| regla | ¿dónde? | ancla |
|---|---|---|
| `cantidad >= 1` | Serializer input (no BD, no modelo) | `serializers.py:17` |
| `items` ≥ 1 elemento | Serializer (`min_length=1`) | `serializers.py:58` |
| `monto_recibido` requerido si EFECTIVO | `SaleCreateSerializer.validate` | `serializers.py:71-75` |
| `monto_recibido >= total` | ❌ **EN NINGUNA PARTE (backend)**; solo front | `PosPage.tsx:277`, [[dinero-y-guard-monto]] |
| stock suficiente (solo `CON_CODIGO`) | `_resolve_products` | `serializers.py:95-100` |
| producto existe/activo/mismo tenant | `_resolve_products` (`filter(tenant, activo=True)`) | `serializers.py:83-92` |
| `total`/`subtotal`/`cambio` | Calculados en `create` con `Decimal` | `serializers.py:118-138` |
| `codigo` único | BD (`unique=True`) + loop en `save()` | `models.py:37-41` |
| `metodo_pago` ∈ choices | `ChoiceField` serializer + `choices` modelo | `serializers.py:59`, `models.py:24` |

Sin `clean()` ni validadores a nivel de modelo en ninguno de los dos.

---

## Concurrencia (correcto — no es riesgo)
`create()` es `@transaction.atomic` (`serializers.py:106`); `_resolve_products` bloquea filas con `select_for_update()` (`serializers.py:85`) y el stock se descuenta con `F()` (`serializers.py:158-160`), evitando carreras de sobreventa entre cajas concurrentes.
