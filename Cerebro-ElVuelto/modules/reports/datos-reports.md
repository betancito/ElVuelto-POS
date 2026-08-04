---
tags: [modulo, datos]
status: vivo
module: reports
updated: 2026-08-02
---

# Reports — Datos y BD

> **`apps/reports` NO tiene modelos propios ni migraciones.** `migrations/` solo contiene `__init__.py` (confirmado: no hay archivos `0001_*`). Es un módulo **derivado**: lee y agrega datos de otras apps. Los modelos "de verdad" viven en `sales` y `tenants` — aquí se documenta **qué campos consume** y sus constraints reales, para que quien toque reports sepa de dónde salen los números.

## Modelos leídos (fuente de verdad = otras apps)

### `Sale` — `apps/sales/models.py:15-45` (hereda `TenantMixin`)
| campo | tipo | null/blank | notas |
|---|---|---|---|
| `id` | UUID PK | — | `default=uuid4`, no editable |
| `codigo` | CharField(10) | blank | `unique`, autogenerado 7 chars en `save()` (`models.py:35-42`), no editable |
| `tenant` | FK Tenant | — | de `TenantMixin` (`tenants/models.py:58-65`), `on_delete=CASCADE`, `related_name="sales_sale_set"` |
| `user` | FK User | — | `on_delete=PROTECT`, `related_name="sales"`. Reports lee `sale.user.nombre` → `cajero` |
| `total` | DecimalField(10,2) | — | reports lo suma y castea a `float` |
| `metodo_pago` | CharField(30) | — | choices `PaymentMethod` (`models.py:10-12`): `EFECTIVO`, `NEQUI_TRANSFERENCIA` |
| `monto_recibido` | DecimalField(10,2) | null, blank | solo EFECTIVO; export lo pasa como `float|null` |
| `cambio` | DecimalField(10,2) | null, blank | idem |
| `created_at` | DateTimeField | — | `auto_now_add`; **base de todos los filtros de fecha** (`created_at__date`, `ExtractHour`, `TruncDate`) |

`Meta`: `db_table="sales"`, `ordering=["-created_at"]`.

### `SaleItem` — `apps/sales/models.py:48-67` (modelo plano, **sin** `TenantMixin`)
| campo | tipo | notas |
|---|---|---|
| `id` | UUID PK | |
| `sale` | FK Sale | `on_delete=CASCADE`, `related_name="items"`. Reports filtra tenant vía `sale__tenant` |
| `product` | FK Product | `on_delete=PROTECT`, `related_name="sale_items"`. Reports agrupa por `product_id` |
| `product_nombre` | CharField(200) | **snapshot** del nombre al vender; reports muestra esto (sobrevive renombres) |
| `precio_unitario` | DecimalField(10,2) | export → float |
| `cantidad` | IntegerField | reports suma → `unidades`/`unidades_vendidas` |
| `subtotal` | DecimalField(10,2) | reports suma → `total` del ranking |

`Meta`: `db_table="sale_items"`. **No tiene `ordering`, ni índices explícitos, ni unique.** `SaleItem` no lleva `tenant` propio: el aislamiento por tenant en reports depende siempre de cruzar por `sale__tenant` (`views.py:27,83,192`).

### `Tenant` / `TenantDocument` — `apps/tenants/models.py` (solo en `sales-detail`)
- `Tenant.nombre` (`models.py:8`) → `tenant_nombre` en el export.
- `TenantDocument` (`models.py:26-55`): `related_name="documents"`, `document_type` choices = solo `LOGO="logo"` (`models.py:29-30`, **valor en minúscula**), `unique_together (tenant, document_type)`. `views.py:170-174` toma `documents.filter(document_type="logo").values_list("cloudinary_url").first()` → `tenant_logo_url` (puede ser `null`).

## Dónde vive cada "validación" de reports
- **No hay validación de negocio**: los params de fecha se toman crudos de `query_params` y se pasan a `filter(created_at__date=...)`. Un `fecha` mal formado dejaría que Django/psycopg lance el error (posible 500, no un 400 limpio). ❓ Ver [[preguntas-reports]] P-3.
- `limit` se castea con `int(...)` sin try/except (`views.py:190`): un `?limit=abc` reventaría con `ValueError` → 500. Riesgo menor de robustez.
- Agregados **sin** filtro de fecha = todo el histórico (no es "validación", es el default). Ver [[agregados-sin-fecha-todo-el-historico]].

## Índices / rendimiento
- No hay índices propios de reports. Los filtros se apoyan en `created_at` (sin índice explícito declarado en `Sale`) y en FKs. Con volumen alto, `created_at__date` + agregaciones podrían ser lentas. ❓ tema de performance, no confirmado como problema hoy.
- `sales-detail` usa `prefetch_related("items").select_related("user")` (`views.py:137-142`) → evita N+1 al armar el export.
