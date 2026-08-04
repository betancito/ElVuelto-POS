# ElVuelto Backend — CLAUDE.md

Django 5.1 + DRF backend for a multi-tenant SaaS POS system targeting Colombian businesses.

---

## Quick Commands

```bash
# Activate virtualenv (always required first)
source .venv/bin/activate

# Run dev server
DJANGO_SETTINGS_MODULE=elvuelto.settings.local python manage.py runserver

# Migrations
python manage.py migrate
python manage.py makemigrations

# Seed dev data (superuser + sample tenant + admin + cashier)
python manage.py seed_dev_data

# Django shell
python manage.py shell
```

---

## Project Layout

```
el_vuelto_backend/
├── manage.py
├── requirements.txt
├── elvuelto/                    # Project config
│   ├── urls.py                  # Root URL router
│   ├── wsgi.py
│   ├── version.py               # v1.0
│   └── settings/
│       ├── base.py              # Shared settings
│       ├── local.py             # DEBUG=True, SQL logging
│       └── production.py        # DEBUG=False, env-based
└── apps/
    ├── tenants/                 # Multi-tenancy core
    ├── users/                   # Auth, roles, JWT
    ├── products/                # Product catalog + categories
    ├── inventory/               # Stock movements
    ├── sales/                   # POS transactions
    └── reports/                 # Analytics
```

---

## Multi-Tenancy

**Core rule: never manually filter by tenant in views.** The system enforces isolation automatically.

### How it works

1. **TenantMiddleware** (`apps/tenants/middleware.py`) — runs on every request, extracts `tenant_id` from the JWT payload, injects `request.tenant` as a `SimpleLazyObject`. Returns `None` if no valid token or no `tenant_id` in payload (superadmin flows).

2. **TenantMixin** (`apps/tenants/models.py`) — abstract model mixin that adds a `tenant` FK to any model. Applied to: `Category`, `Product`, `InventoryMovement`, `Sale`.

3. **TenantModelViewSet** (`apps/tenants/viewsets.py`) — base ViewSet class used by all tenant-scoped resources. Overrides `get_queryset()` to auto-filter by `request.tenant` and `perform_create()` to auto-set `tenant=request.tenant`.

Superadmin users have `tenant=None` and bypass tenant filtering via `IsSuperAdmin` permission checks.

---

## Authentication

### Login flows

| Flow | Endpoint | Who uses it |
|---|---|---|
| Email + password | `POST /api/auth/login/` | Tenant admins, superadmin |
| Cedula + tenant_id + password | `POST /api/auth/login/cashier/` | Cashiers (POS) |
| Token refresh | `POST /api/auth/refresh/` | All |
| Current user | `GET /api/auth/me/` | All authenticated |

**Cédula login requires `tenant_id`.** Cédula is unique only *per tenant* (DB constraint `unique(tenant, cedula)`), so `CashierLoginSerializer` makes `tenant_id` **required** and always filters `User.objects.filter(cedula=..., tenant_id=...)` — a missing `tenant_id` returns **400**. This prevents a cédula repeated across businesses from authenticating the wrong account. The cédula branch of `CustomTokenObtainPairSerializer` (`/api/auth/login/`) enforces the same guard defensively, though the frontend only sends `cedula` to `/api/auth/login/cashier/` (it sends only `correo` to `/api/auth/login/`).

### JWT payload extras

`CustomTokenObtainPairSerializer` adds to every token: `tenant_id`, `rol`, `nombre`, `cedula`.

### Token lifetimes

- Access: **8 hours**
- Refresh: **7 days**
- `ROTATE_REFRESH_TOKENS = False`

---

## Roles & Permissions

Defined in `apps/users/models.py` (TextChoices) and `apps/users/permissions.py`.

| Role | Value | Access |
|---|---|---|
| `SUPERADMIN` | SaaS platform admin | All tenants, system-wide |
| `ADMIN` | Tenant admin | Own tenant only |
| `CAJERO` | Cashier | POS endpoints only |

### Permission classes

```python
IsSuperAdmin  # rol == SUPERADMIN only
IsAdmin       # rol in [ADMIN, SUPERADMIN]
IsCajero      # rol in [CAJERO, ADMIN, SUPERADMIN]
```

Default DRF permission: `IsAuthenticated` (set in base settings).

---

## Models

### `apps/tenants/`

**Tenant**
```
id (UUID PK), nombre, nit (unique), ciudad, correo (unique),
activo (bool), created_at, updated_at
db_table: "tenants"
```

**TenantDocument** (Cloudinary image storage)
```
id (UUID PK), tenant (FK), document_type (choices: LOGO),
cloudinary_public_id, cloudinary_url
unique_together: (tenant, document_type)
db_table: "tenant_documents"
```

---

### `apps/users/`

**User** (custom `AbstractBaseUser`)
```
id (UUID PK), tenant (FK nullable — null for superadmin),
nombre, correo (unique, USERNAME_FIELD), cedula,
rol (choices: SUPERADMIN|ADMIN|CAJERO, default: CAJERO),
activo (bool), is_staff, created_at, updated_at
DB constraint: unique(tenant, cedula) when cedula is not null
```

---

### `apps/products/`

**Category** (TenantMixin)
```
id (UUID PK), nombre, imagen_url, imagen_public_id, created_at
unique_together: (tenant, nombre)
```

**Product** (TenantMixin)
```
id (UUID PK), category (FK → Category, nullable),
nombre, tipo (SIN_CODIGO|CON_CODIGO),
precio_venta, precio_costo (optional),
barcode (optional), proveedor (optional),
stock_actual (int, default 0), stock_minimo (int, default 0),
imagen_url, imagen_public_id, activo, created_at, updated_at
DB constraint: unique(tenant, barcode) when barcode is not null
```

**ProductType:**
- `SIN_CODIGO` — no barcode, stock not tracked
- `CON_CODIGO` — barcode required, stock tracked via InventoryMovement

---

### `apps/inventory/`

**InventoryMovement** (TenantMixin)
```
id (UUID PK), product (FK → Product, PROTECT),
user (FK → User, PROTECT), tipo_movimiento (ENTRADA|SALIDA_VENTA|AJUSTE),
cantidad (int — positive for ENTRADA, negative for SALIDA/AJUSTE),
precio_costo (optional), proveedor (optional), nota, created_at
db_table: "inventory_movements"
ordering: ["-created_at"]
```

**MovementType:**
- `ENTRADA` — manual stock entry (admin only)
- `SALIDA_VENTA` — auto-created by `SaleCreateSerializer` (cannot be created manually)
- `AJUSTE` — manual adjustment (admin only)

Stock is updated atomically via Django `F()` expressions.

---

### `apps/sales/`

**Sale** (TenantMixin)
```
id (UUID PK), codigo (7-char alphanumeric, auto-generated, unique),
user (FK → User, PROTECT), total, metodo_pago (EFECTIVO|NEQUI_TRANSFERENCIA),
monto_recibido (optional), cambio (optional), created_at
ordering: ["-created_at"]
```

**SaleItem**
```
id (UUID PK), sale (FK → Sale, CASCADE),
product (FK → Product, PROTECT), product_nombre (snapshot),
precio_unitario, cantidad, subtotal
db_table: "sale_items"
```

`product_nombre` is stored as a snapshot so sale history is preserved if a product is renamed.

---

## API Endpoints

### Auth — `/api/`

```
POST /api/auth/login/                  CustomTokenObtainPairView   AllowAny
POST /api/auth/login/cashier/          CashierLoginView            AllowAny
POST /api/auth/refresh/                TokenRefreshView            AllowAny
GET  /api/auth/me/                     MeView                      IsAuthenticated
```

### Users — `/api/users/`

```
GET    /api/users/                     list                IsAdmin
POST   /api/users/                     create              IsAdmin
GET    /api/users/{id}/                retrieve            IsAdmin
PATCH  /api/users/{id}/                partial_update      IsAdmin
DELETE /api/users/{id}/                destroy             IsAdmin
POST   /api/users/{id}/toggle_active/  toggle_active       IsAdmin
POST   /api/users/{id}/reset_password/ reset_password      IsAdmin  → returns new plain-text password
```

Password generation rules:
- CAJERO → 4 random digits
- ADMIN → 10-char mixed (upper, lower, digits, special)

### Tenants — `/api/tenants/`

```
GET    /api/tenants/check-by-slug/<slug>/   TenantBySlugView      AllowAny  → {exists, id, nombre, logo_url}
GET    /api/tenants/                        list                  IsSuperAdmin
POST   /api/tenants/                        create                IsSuperAdmin  → also creates initial ADMIN user
GET    /api/tenants/{id}/                   retrieve              IsSuperAdmin
PATCH  /api/tenants/{id}/                   partial_update        IsSuperAdmin
DELETE /api/tenants/{id}/                   destroy               IsSuperAdmin
POST   /api/tenants/{id}/upload_logo/       upload_logo           IsSuperAdmin  → Cloudinary upload
```

Creating a tenant (`POST /api/tenants/`) also requires `admin_nombre` + `admin_correo` fields and auto-creates the initial ADMIN user. Returns `initial_admin_password` in the response. The tenant + admin are created inside a single `transaction.atomic()` block, so a failure creating the admin rolls the tenant back (no orphan). Because `User.correo` is globally unique, a duplicate `admin_correo` is pre-validated and returns **400** `{"admin_correo": ...}` (never a 500).

### Products — `/api/products/`

```
GET    /api/products/categories/                    list             IsCajero  (cashier reads catalog for POS)
POST   /api/products/categories/                    create           IsAdmin
GET    /api/products/categories/{id}/               retrieve         IsCajero
PATCH  /api/products/categories/{id}/               partial_update   IsAdmin
DELETE /api/products/categories/{id}/               destroy          IsAdmin
POST   /api/products/categories/{id}/upload_image/  upload_image     IsAdmin  → Cloudinary

GET    /api/products/                               list             IsAdmin  (?activo=true/false filter)
POST   /api/products/                               create           IsAdmin
GET    /api/products/{id}/                          retrieve         IsAdmin
PATCH  /api/products/{id}/                          partial_update   IsAdmin
DELETE /api/products/{id}/                          destroy          IsAdmin
POST   /api/products/{id}/upload_image/             upload_image     IsAdmin  → Cloudinary
GET    /api/products/pos/                           pos              IsCajero  → ProductPOSSerializer (minimal)
```

`GET /api/products/pos/` returns only: `id, nombre, tipo, precio_venta, barcode, category (name), stock_actual, imagen_url`.

### Inventory — `/api/inventory/`

```
GET    /api/inventory/movements/     list     IsAdmin  (?product_id, ?fecha_inicio, ?fecha_fin)
POST   /api/inventory/movements/     create   IsAdmin  (SALIDA_VENTA cannot be created manually)
GET    /api/inventory/stock/         stock    IsAdmin  → StockSerializer for all CON_CODIGO products
```

`StockSerializer` includes `bajo_minimo` boolean (true when `stock_actual < stock_minimo`).

### Sales — `/api/sales/`

```
GET    /api/sales/        list       IsAdmin  (?fecha_inicio, ?fecha_fin, ?metodo_pago, ?user_id, ?search)
POST   /api/sales/        create     IsCajero (atomic transaction)
GET    /api/sales/{id}/   retrieve   IsAdmin
```

Sale creation input:
```json
{
  "items": [{"product": "<uuid>", "cantidad": 2}],
  "metodo_pago": "EFECTIVO",
  "monto_recibido": 50000
}
```

The `create` action:
1. Locks all products with `select_for_update()`
2. Validates stock for `CON_CODIGO` items
3. Calculates totals
4. Creates `Sale` + `SaleItem` records
5. Creates `SALIDA_VENTA` movements for `CON_CODIGO` items
6. Updates `product.stock_actual` with `F()` expressions
All in one `@transaction.atomic` block.

### Reports — `/api/reports/`

```
GET /api/reports/summary/          IsAdmin  ?fecha=YYYY-MM-DD
    → {total_ventas, num_transacciones, unidades_vendidas, porcentaje_efectivo, porcentaje_nequi}

GET /api/reports/ventas-por-hora/  IsAdmin  ?fecha=YYYY-MM-DD (required)
    → [{hora: 0-23, total: float, transacciones: int}, ...]

GET /api/reports/top-productos/    IsAdmin  ?fecha=YYYY-MM-DD, ?limit=10 (max 100)
    → [{product_id, nombre, unidades, total}, ...]
```

All report views use `America/Bogota` timezone for hour extraction.

---

## Serializers — Key Behaviors

**`UserCreateSerializer`** validation rules:
- SUPERADMIN role cannot be assigned via API
- CAJERO requires `cedula`
- ADMIN requires `correo`
- Enforces global uniqueness on `correo`, per-tenant uniqueness on `cedula`

**`ProductSerializer`** validation:
- `tipo=CON_CODIGO` requires `barcode`, `precio_costo`, `proveedor`
- `category` must belong to the same tenant as the request

**`SaleCreateSerializer`**:
- `EFECTIVO` requires `monto_recibido`
- `items` must have at least 1 entry
- Stock check only applies to `CON_CODIGO` products

---

## Settings Reference

### Key installed apps order
```python
INSTALLED_APPS = [
    # django core...
    "rest_framework",
    "corsheaders",
    "apps.tenants",
    "apps.users",
    "apps.products",
    "apps.inventory",
    "apps.sales",
    "apps.reports",
]
```

### Middleware order (position matters)
```
SecurityMiddleware → CorsMiddleware → SessionMiddleware → CommonMiddleware →
CsrfViewMiddleware → AuthenticationMiddleware → TenantMiddleware →
MessageMiddleware → XFrameOptionsMiddleware
```

TenantMiddleware must come after AuthenticationMiddleware so `request.user` is available.

### DRF config
```python
DEFAULT_AUTHENTICATION_CLASSES: [JWTAuthentication]
DEFAULT_PERMISSION_CLASSES: [IsAuthenticated]
DEFAULT_PAGINATION_CLASS: PageNumberPagination
PAGE_SIZE: 50
```

---

## Environment Variables

**`el_vuelto_backend/.env`:**
```
DJANGO_SECRET_KEY=
DJANGO_SETTINGS_MODULE=elvuelto.settings.local
DB_NAME=elvuelto
DB_USER=
DB_PASSWORD=
DB_HOST=localhost
DB_PORT=5432
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

---

## Dependencies

```
Django==5.1.4
djangorestframework==3.15.2
djangorestframework-simplejwt==5.3.1
django-cors-headers==4.6.0
python-decouple==3.8
Pillow==11.1.0
python-escpos==3.1            # Thermal receipt printing
psycopg2-binary==2.9.10       # PostgreSQL
cloudinary==1.44.2            # Image storage
```

---

## Dev Seed Data

`python manage.py seed_dev_data` creates:

| What | Value |
|---|---|
| Superuser email | admin@elvuelto.com |
| Superuser password | admin123 |
| Sample tenant | Panadería La Esperanza (NIT 900123456) |
| Tenant admin | juan@laesperanza.com / admin123 |
| Cashier | cedula=12345678 / cajero123 |

---

## Design Patterns & Gotchas

- **Always use `F()` for stock updates** — `SaleCreateSerializer` and `InventoryMovementSerializer` both use `F()` to prevent race conditions on concurrent sales.
- **`select_for_update()` on products during sale creation** — locks product rows for the duration of the transaction.
- **`product_nombre` is a snapshot on SaleItem** — do not try to derive it from the product FK; it exists so history survives product renames.
- **`Sale.codigo` is auto-generated** — 7-char alphanumeric in `Sale.save()`. Never set it manually.
- **Cloudinary stores `public_id` in DB** — needed for deletion/replacement. Always save both `cloudinary_url` and `cloudinary_public_id`.
- **`SALIDA_VENTA` movements are system-only** — `InventoryMovementSerializer.validate()` rejects them if submitted manually.
- **`TenantModelViewSet.get_queryset()` raises `PermissionDenied`** (not 404) when `request.tenant` is None and the user isn't superadmin — this is intentional.
- **No test framework configured** — neither backend nor frontend has tests set up yet.
