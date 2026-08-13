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

# Create a platform SUPERADMIN (interactive: prompts correo/nombre/password)
python manage.py create_superadmin
# Deploy / CI (non-interactive): flags or SUPERADMIN_CORREO/NOMBRE/PASSWORD env vars
python manage.py create_superadmin --noinput --correo you@co.com --nombre "You" --password "***"

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

**Core rule: isolation is NOT automatic — every view MUST filter by `request.tenant`.** `TenantMixin` only adds the FK; it does **not** filter QuerySets. Extend `TenantModelViewSet` for `ModelViewSet`s (it filters in `get_queryset()` + sets `tenant` on create); plain `APIView`s filter by hand and guard with `require_tenant(request)`. Forgetting to filter leaks data across tenants — there is no DB-level safety net (no Postgres RLS yet).

### How it works

1. **TenantMiddleware** (`apps/tenants/middleware.py`) — runs on every request, extracts `tenant_id` from the JWT payload, injects `request.tenant` as a `SimpleLazyObject`. Returns `None` if no valid token or no `tenant_id` in payload (superadmin flows).

2. **TenantMixin** (`apps/tenants/models.py`) — abstract model mixin that adds a `tenant` FK to any model. Applied to: `Category`, `Product`, `InventoryMovement`, `Sale`.

3. **TenantModelViewSet** (`apps/tenants/viewsets.py`) — base class for the tenant-scoped `ModelViewSet`s that inherit it (today only `CategoryViewSet` and `ProductViewSet`); it overrides `get_queryset()` to filter by `_get_tenant()` and `perform_create()` to set that same tenant. **Inheriting it is not enough** — a subclass that overrides `get_queryset()` without calling `super()` (as `ProductViewSet` does) drops the guard and must call `self._get_tenant()` itself. **Most other views do NOT inherit it and filter by hand** — `reports` (5 `APIView`s), `SaleViewSet`, `StockView`/`InventoryMovementViewSet` and `UserViewSet`; every one of them now resolves the tenant through `require_tenant` first (see the gotchas at the end).

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

### The `user` object in every login response

All three login paths (both branches of `CustomTokenObtainPairSerializer.validate` and `CashierLoginSerializer.validate`) return the **same** dict, built by `_user_payload(user)` in `apps/users/serializers.py`:

```
id, nombre, correo, cedula, rol, activo,
tenant_id, tenant_nombre, tenant_slug, tenant_logo_url,
tenant_email, tenant_support_phone, lead_cashier
```

It is a single helper because the frontend maps this exact shape into `AuthUser` no matter which endpoint answered — the dict used to be written out three times, and adding a key to only some copies breaks whichever flow was missed (`tenant_slug` matters precisely on the cashier path: it is what "Cerrar Turno" redirects to). `tenant_*` keys are `None` for a superadmin (no tenant).


### Refreshing checks the user is still usable

`POST /api/auth/refresh/` uses `ActiveUserTokenRefreshSerializer` (and `ThrottledTokenRefreshView`), not simplejwt's defaults. The base `TokenRefreshSerializer` **never loads the `User`** — it only verifies the refresh token's signature and expiry — so a deactivated cashier still got **200** with a brand-new access token. That token was already useless (every endpoint rejects it, `is_active` is False), but handing it out is what kept the frontend's auto-logout unreachable: `baseQueryWithReauth` only calls `logout()` when the refresh **fails**, so a cashier deactivated mid-shift stayed on a UI that looked logged in while silently failing every request. Now the refresh returns **401 `{"detail": "Esta cuenta está desactivada."}`** and the session ends.

The serializer rejects **two** cases, both for that same reason: the user is deactivated, or **the password changed after the token was issued** (`code: "password_changed"`). See the section below.

Cost: one extra query and one extra token parse per refresh — irrelevant, access tokens live 8 hours.

### Changing a password revokes every token issued before it

`SIMPLE_JWT["CHECK_REVOKE_TOKEN"] = True` (`elvuelto/settings/base.py`). **`reset_password` and `toggle_active` now both end the live session**, not just future logins.

How it works, in simplejwt 5.3.1 (read from the installed package, not the docs):

| Step | Where | What happens |
|---|---|---|
| Issue | `Token.for_user()` (`tokens.py:197`) | Stamps a `hash_password` claim = MD5 of `user.password` **at issue time**. All three login paths reach it via `CustomTokenObtainPairSerializer.get_token`. |
| Every request | `JWTAuthentication.get_user()` (`authentication.py:137`) | Compares the claim against the **current** hash → mismatch = **401 `password_changed`**. |
| Refresh | `RefreshToken.access_token` (`tokens.py:335`) | Copies every claim (`hash_password` is **not** in `no_copy_claims`), so a refresh token issued before the change mints access tokens that are born rejected. |
| Refresh (ours) | `ActiveUserTokenRefreshSerializer` | Runs the same comparison one step earlier so the refresh itself **401s** instead of handing out a dead token (see below). |

**Why the refresh needed its own check.** With only the setting, `/auth/refresh/` still answered **200**: the frontend read that as "session is fine", stored the new access token, retried, got 401, refreshed again — never reaching `logout()`. A cashier whose PIN was just reset sat on a UI that looked alive while every request failed. That is the exact failure mode the `is_active` check exists to prevent, so `password_changed` gets the same treatment. The check is guarded by `if api_settings.CHECK_REVOKE_TOKEN`, so flipping the setting off restores the old behaviour instead of rejecting every refresh (tokens issued without the flag carry no claim at all).

**Cost: zero extra queries.** Measured with `CaptureQueriesContext` on `GET /api/products/pos/`: 3 queries with the flag on, 3 with it off. `get_user()` already loads the `User` on every authenticated request — that is how `is_active` is checked — so this adds an in-memory MD5 over an object already in hand.

**Scope.** This is session revocation, not a blacklist: it keys on the password hash, so it fires on **any** password change (`reset_password`, `PATCH /auth/me/update/`, a promotion that rotates the credential) and on nothing else. A token belonging to a user whose password did not change stays valid until it expires. Blacklisting via `token_blacklist` + `ROTATE_REFRESH_TOKENS` remains a separate, undecided task.

> [!warning] Deploying this invalidates every live session, once
> No token issued before the deploy carries the `hash_password` claim, so each one fails on its **next** request (and its refresh 401s, so the frontend logs the user out). Everyone signs in again, one time. Deploy it outside register hours or warn the tenants first.


### JWT payload extras

`CustomTokenObtainPairSerializer` adds to every token: `tenant_id`, `rol`, `nombre`, `cedula`.

### Token lifetimes

- Access: **8 hours**
- Refresh: **7 days**
- `ROTATE_REFRESH_TOKENS = False`

### Rate limiting — only on the auth endpoints

The POS login is brute-forceable by design of its parts: `check-by-slug` is public and returns the tenant UUID, a cédula is not a secret, and the PIN is 4 digits (deliberate — touch screen, do not change it). That is 10.000 combinations, and an audit walked the whole space in ~18 minutes at ~9 req/s. The answer is a limit on attempts, not a longer PIN.

| Scope | Applies to | Key | Rate |
|---|---|---|---|
| `login_identity_burst` | `/auth/login/` + `/auth/login/cashier/` | `correo`/`cedula`+`tenant_id` from the body | **10/min** |
| `login_identity_daily` | same | same | **50/day** |
| `login_ip` | same | client IP | **60/min** |
| `token_refresh_ip` | `/auth/refresh/` | client IP | **30/min** |
| `tenant_slug_ip` | `check-by-slug` | client IP | **30/min** |

Classes live in `apps/users/throttles.py`; rates in `REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"]`. **There is no `DEFAULT_THROTTLE_CLASSES`** — throttling is opt-in per view, because a global limit would hit the POS, which is the busiest screen (verified: 40 consecutive `/products/pos/` + 40 `/sales/` never throttle).

**Why keyed by identity and not only by IP:** every till in a shop shares one NAT, so a per-IP login limit lets one cashier with clumsy fingers lock out the whole store. The identity key limits the credential actually under attack. The per-IP ceiling still exists underneath so one machine cannot fan out over many identities. Both login endpoints share the identity scope on purpose — the cédula branch also exists on `/auth/login/`, and separate counters would mean "switch endpoint, double your budget". Known trade-off: an attacker can burn a specific cashier's quota to keep them out, which is why the limit is a recovering rate and not a lockout.

> **Gotcha — throttling counts in the cache.** `CACHES` is now explicit in `settings/base.py` because the default is `LocMemCache`, which is **per process**: under gunicorn with N workers each keeps its own count and every rate above is effectively multiplied by N. Dev is fine (single process). In production set **`REDIS_URL`** and all workers share one counter — the Redis backend ships with Django but needs the `redis` package, which is deliberately *not* in `requirements.txt` so the app runs without it.

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

### `is_staff` / the Django admin — NOT a tenant administration channel

`rol` is the app's authorization model; **`is_staff` is a different axis**: it is what Django checks to let someone into `/admin/`, which is mounted in `elvuelto/urls.py` and **bypasses DRF entirely** — no serializer, no `require_tenant`, no per-role rule.

- **`is_staff` belongs to SUPERADMIN and nobody else.** It is the flag Django checks at `/admin/`, so granting it to a tenant admin hands them a door into every tenant's data with none of the API's rules. `_create_initial_admin` (`apps/tenants/serializers.py`) and `seed_dev_data` both used to set it on tenant admins; both were fixed, and migration **`users.0005_clear_is_staff_on_tenant_admins`** cleared it retroactively on every existing `rol=ADMIN` row (the code fix only covered admins created afterwards). SUPERADMIN rows are untouched — they need it. Platform staff is created **only** with `manage.py create_superadmin`. Invariant to keep: `User.objects.filter(rol=ADMIN, is_staff=True).count() == 0`.
- **The per-role rule is on the model**, not only in DRF: `User.clean()` enforces "ADMIN needs `correo`, CAJERO needs `cedula`" (SUPERADMIN exempt) with the same Spanish messages as `UserCreateSerializer`. `ModelForm._post_clean()` calls `full_clean()`, so the admin site — and any future `ModelForm` — inherits it for free. Before this, `/admin/` could create a cashier with **no cédula** (who can never log into the POS, since that flow authenticates by cédula) or blank an ADMIN's `correo` (a lockout: it is `USERNAME_FIELD`).
- `clean()` deliberately does **not** run on a plain `.save()` — Django never calls `full_clean()` there — so management commands and DRF are unaffected; each layer enforces the rule itself.
- `cedula` must stay in `UserAdmin.fieldsets` **and** `add_fieldsets`. Without it the field cannot be filled (making a valid cashier impossible) and `clean()`'s error would be bound to a field the form does not render, which Django turns into a `ValueError`.
- No DB `CheckConstraint` yet: it would need an audit of every existing row in every environment first. The two write paths that exist today (DRF and `/admin/`) are both covered.

---

## Models

### `apps/tenants/`

**Tenant**
```
id (UUID PK), nombre, slug (unique, editable=False — see below), nit (unique), ciudad, correo (unique),
support_number (nullable — support phone shown to the tenant's staff),
activo (bool), created_at, updated_at
db_table: "tenants"
```

**`Tenant.slug` is persisted and generated exactly once.** `Tenant.save()` fills it only when empty, from `nombre`, via `apps/tenants/slugs.py` (NFD → strip diacritics → lowercase → non-alphanumerics to `-`): `"Café Bogotá"` → `cafe-bogota`. On collision (`nombre` is **not** unique) it appends `-2`, `-3`, … A **rename does not move the slug** — it is the public identity of the business (`/login/<slug>`), and links already handed to cashiers must keep working. It is read-only in `TenantSerializer` and `editable=False` on the model: nobody, client or admin, types it.

This replaced three incompatible "nombre → slug" functions computed on the fly (backend view, POS logout, users page). The backend dropped accents while the frontend transliterated them, so every business with a tilde or `ñ` sent its cashier to a slug the backend could not resolve → "Sucursal no encontrada". `TenantBySlugView` now does an indexed `filter(slug=..., activo=True)` instead of scanning every active tenant in Python and keeping the first match (a "winner" that was not even stable between requests). Backfill for existing rows: `tenants/migrations/0004_tenant_slug.py` (ordered by `created_at`, so the oldest keeps the clean slug — deterministic across environments).

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
activo (bool), lead_cashier (bool, default False — "cajero líder"; lets a CAJERO register ENTRADA inventory movements), is_staff, created_at, updated_at
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
GET   /api/auth/me/                    MeView                      IsAuthenticated
PATCH /api/auth/me/update/             UpdateMeView                IsAuthenticated  → update own nombre/correo/password
```

**`PATCH /api/auth/me/update/` never lets you delete your own way in.** `correo` is `USERNAME_FIELD`, and the **only** login flow that does not use it is the cashier one, which needs `cedula` **and** `tenant_id` (`CashierLoginSerializer`). So clearing `correo` is a **400** when either (a) the rol is ADMIN or SUPERADMIN — the per-role invariant, same rule as `UserCreateSerializer` / `User.clean()`; a SUPERADMIN has no tenant, so its correo is its single credential — or (b) the user lacks `cedula`+`tenant_id`, whatever the rol (`"No puedes quedarte sin correo: es tu única forma de iniciar sesión."`). Only a cashier with both may clear it.

The value is **normalised before anything is decided**: `(data["correo"] or "").strip() or None`. `"   "` is truthy, so the earlier `data["correo"].strip() if data["correo"] else None` stored an empty string instead of NULL — and since `correo` is `unique`, the *second* user to do it hit `IntegrityError`, which DRF does not map → **500**. Blank now means NULL, everywhere.

**`PATCH /api/auth/me/update/` enforces the ADMIN-needs-`correo` invariant.** `correo` is `USERNAME_FIELD`, so an ADMIN left without one can never log in again — and the frontend's `ProfilePage` sends `correo: data.correo ?? ''` on **every** save, so an empty field used to nullify it. The view now returns **400** `{"correo": "El correo es obligatorio para administradores."}` (message verbatim from `UserCreateSerializer.validate`) when `rol == ADMIN` and the resulting `correo` is empty/None. It also **validates the format** server-side with `django.core.validators.validate_email` → **400** `{"correo": "Correo inválido."}`; without it, `EmailField`'s validators never run on this path (the view uses `setattr` + `save()`, not a serializer or `full_clean()`), so garbage would land in a `unique` column. Both checks run **before** `user.save()`, so a rejected request persists nothing (`nombre` included).

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

### Password policy — per role, one source of truth

`apps/users/password_policy.py` is the **only** place the policy lives. It is deliberately **not flat**: the CAJERO's 4-digit PIN is intentional (the POS runs on a touch screen with no keyboard), so the rule is coherent *per role* instead of one global minimum.

| Role | Minimum / generated | Alphabet |
|---|---|---|
| `CAJERO` | **4 digits** (`PIN_LENGTH`) | digits only |
| `ADMIN` / `SUPERADMIN` | **12 chars** (`ADMIN_PASSWORD_LENGTH`), one upper + one lower + one digit + one symbol guaranteed | letters + digits + `!@#$%&*` (`ADMIN_SYMBOLS`) |

The module exposes `min_length_for(rol)`, `length_error_for(rol)` (Spanish 400 message) and `generate_password(rol)`. Every consumer routes through it:

- `UserCreateSerializer` — the `password` field has **no fixed `min_length`** (it cannot see the `rol`); the check runs in `validate()` against the resolved rol → 400 `{"password": "Mínimo 12 caracteres."}` / `{"password": "El PIN debe tener 4 dígitos."}`. A `PATCH` that omits `password` validates nothing.
- **A promotion rotates the credential.** If a `PATCH` changes `rol` so the password floor **rises** (CAJERO → ADMIN) and sends no `password`, `update()` generates one for the new rol and returns it in **`new_password`** (same shape as `reset_password`; `null` on every other create/update). Without this, promoting through the edit modal — which sends `rol` + `correo` and has no password field — left the account on its **4-digit PIN**: a secret typed in public, by design only good enough for a cashier, now guarding the tenant's highest role, and still usable through the public `/auth/login/cashier/` endpoint because the `cedula` survives the promotion. It was also a silent bypass: the same end state a `POST` rejects with 400 was reachable with a 200. Rotating (rather than demanding a password) means the operation never fails — the admin does not lose the ability to promote — while the old PIN dies the moment the rol changes. A **demotion** does not rotate: the floor drops, so the existing password still satisfies it.
- `UpdateMeView` (own password change) — same minimum, keyed off `user.rol`.
- `UserViewSet.reset_password` — `generate_new_password(rol)` is now a thin alias over `generate_password(rol)` (kept because `views.py` imports that name).
- `CashierLoginSerializer.password` — floors at `PIN_LENGTH`.
- Generation uses **`secrets`**, not `random`: these strings are handed to a human as their real credential, so the generator must not be predictable.

The frontend mirrors the numbers in `src/utils/generatePassword.ts` (`PIN_LENGTH`, `ADMIN_PASSWORD_LENGTH`) and `ProfilePage.tsx` builds its Zod minimum from the logged-in user's rol, with messages verbatim from `length_error_for`.

> **`AUTH_PASSWORD_VALIDATORS` is declared but NOT wired.** It sits in `settings/base.py` and looks authoritative, but nothing ever calls `validate_password()` (grep it — zero hits), so it has **no effect** on any flow. Do not wire it without a decision from the owner: `MinimumLengthValidator` (8) and `NumericPasswordValidator` would both reject the 4-digit cashier PIN and break POS login. The policy in force is `password_policy.py`.

Password generation rules (via `generate_password`):
- CAJERO → 4 random digits
- ADMIN → 12-char mixed (upper, lower, digits, `!@#$%&*`)

### Tenants — `/api/tenants/`

```
GET    /api/tenants/check-by-slug/<slug>/   TenantBySlugView      AllowAny  → {exists, id, nombre, logo_url}
GET    /api/tenants/                        list                  IsSuperAdmin
POST   /api/tenants/                        create                IsSuperAdmin  → also creates initial ADMIN user
GET    /api/tenants/{id}/                   retrieve              IsSuperAdmin
PATCH  /api/tenants/{id}/                   partial_update        IsSuperAdmin
DELETE /api/tenants/{id}/                   destroy               IsSuperAdmin
POST   /api/tenants/{id}/upload_logo/       upload_logo           IsSuperAdmin  → Cloudinary upload
DELETE /api/tenants/{id}/logo/              delete_logo           IsSuperAdmin  → 204, removes asset + row

# SUPERADMIN support surface, scoped to ONE tenant by URL (see below)
GET    /api/tenants/{tenant_id}/users/      TenantUsersView       IsSuperAdmin  → that tenant's staff (UserSerializer)
POST   /api/tenants/{tenant_id}/users/{user_id}/reset_password/
                                            TenantUserResetPasswordView
                                                                  IsSuperAdmin  → {"new_password": "..."}
GET    /api/tenants/{tenant_id}/metrics/    TenantMetricsView     IsSuperAdmin  → {ventas_mes, ventas_hoy, num_admins, num_cajeros, fecha_alta, activo}
```

Creating a tenant (`POST /api/tenants/`) also requires `admin_nombre` + `admin_correo` fields and auto-creates the initial ADMIN user. Returns `initial_admin_password` in the response. The tenant + admin are created inside a single `transaction.atomic()` block, so a failure creating the admin rolls the tenant back (no orphan). Because `User.correo` is globally unique, a duplicate `admin_correo` is pre-validated and returns **400** `{"admin_correo": ...}` (never a 500).

#### The three SUPERADMIN tenant-scoped endpoints

**Why they exist.** A SUPERADMIN has `tenant=None`, so `request.tenant` is always `None` and every tenant-scoped endpoint answers **403** via `require_tenant` — deliberate, per the access model. That left platform support with no way to answer "who works at this business and can you reset their PIN?". These three views are the explicit, bounded exception: **the tenant comes from the URL, never from `request.tenant`.**

**What they are not: impersonation.** No token is issued and no session is created — nothing here lets a SUPERADMIN act *as* the tenant. They read a support snapshot and can rotate one credential. That is the entire surface; `/api/users/` and the five `/api/reports/` endpoints are untouched and still tenant-admin-only.

**The invariant.** A `tenant_id` in the URL cannot reach a row belonging to a different tenant. The reset endpoint filters on **both** ids at once (`User.objects.filter(pk=user_id, tenant=tenant)`) rather than fetching by pk and checking afterwards — the query itself cannot express the wrong thing. A `user_id` from another business is a **404**, and that user's password is left untouched (verified in both directions with two real tenants).

**Implementation notes.**
- All three subclass `SuperAdminTenantScopedView` (`apps/tenants/views.py`), which pins `permission_classes = [IsSuperAdmin]` and resolves `tenant_id` with `get_object_or_404` → a missing tenant is **404**, never a 500 nor a silently-empty list.
- They are declared before `router.urls` in `apps/tenants/urls.py` for readability, **not** out of necessity: the router's detail route is `^(?P<pk>[^/.]+)/$`, anchored at `$`, so it cannot match `<id>/users/` in either ordering (checked by resolving both). What does matter is the `<uuid:...>` converter — a non-UUID id becomes a 404 at the resolver instead of reaching the ORM and raising `ValidationError` → **500**.
- The reset reuses `generate_new_password(user.rol)`, so a cashier gets a 4-digit PIN and an admin a 12-char password — same policy and same `{"new_password": ...}` shape as `UserViewSet.reset_password`. It also trips `CHECK_REVOKE_TOKEN` for free: the target's existing tokens die immediately.
- `metrics` uses the same `America/Bogota` criterion as `apps/reports/views.py` (`USE_TZ` is on and rows are UTC, so an 8pm Bogotá sale is already tomorrow in UTC). `Sum` returns `None` with no rows, so both totals are coerced to `0` — a brand-new business reads `0.0`, never `null`.


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
GET    /api/inventory/movements/     list     IsAdmin  (?product, ?fecha_inicio, ?fecha_fin)
POST   /api/inventory/movements/     create   IsCajero (see the lead_cashier rule below)
GET    /api/inventory/stock/         stock    IsAdmin  → StockSerializer for all CON_CODIGO products
```

**Creating a movement is `IsCajero`, not `IsAdmin`** (`InventoryMovementViewSet.get_permissions` — only `create` widens; listing stays admin-only). A `CAJERO` that reaches `create` is then filtered by two explicit guards in the view: it must have **`lead_cashier=True`** ("Solo los cajeros líderes pueden registrar entradas.") and may only submit **`tipo_movimiento=ENTRADA`** ("Los cajeros solo pueden registrar movimientos de tipo ENTRADA.") — both **403**. `AJUSTE` is therefore admin-only in practice, and `SALIDA_VENTA` is rejected for everyone (`InventoryMovementSerializer.validate_tipo_movimiento`): the sales endpoint creates those.

`StockSerializer` includes `bajo_minimo` boolean (true when `stock_actual < stock_minimo`).

### Sales — `/api/sales/`

```
GET    /api/sales/        list       IsAdmin  (?fecha_inicio, ?fecha_fin, ?metodo_pago, ?user, ?search)
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
2. Validates stock for `CON_CODIGO` items — against the **sum of quantities per product**, so a repeated `product` cannot oversell
3. Calculates totals
4. Creates `Sale` + `SaleItem` records
5. Creates `SALIDA_VENTA` movements for `CON_CODIGO` items
6. Updates `product.stock_actual` with `F()` expressions
All in one `@transaction.atomic` block.

### Reports — `/api/reports/`

```
GET /api/reports/summary/          IsAdmin  ?fecha=YYYY-MM-DD
    → {total_ventas, num_transacciones, unidades_vendidas, porcentaje_efectivo, porcentaje_nequi}

GET /api/reports/ventas-por-hora/  IsAdmin  ?fecha=YYYY-MM-DD (optional → today in America/Bogota)
    → [{hora: 0-23, total: float, transacciones: int,
        top_productos: [{nombre: str, unidades: int}, ...]}, ...]
      Always 24 entries (hours with no sales come back as zeros with an empty
      top_productos). top_productos holds that hour's 3 best sellers by units.

GET /api/reports/ventas-por-dia/   IsAdmin  ?fecha_inicio, ?fecha_fin (default: last 7 days)
    → [{fecha: YYYY-MM-DD, total: float, transacciones: int}, ...]

GET /api/reports/top-productos/    IsAdmin  ?fecha=YYYY-MM-DD, ?limit=10 (max 100)
    → [{product_id, nombre, unidades, total}, ...]

GET /api/reports/sales-detail/     IsAdmin  ?fecha | (?fecha_inicio & ?fecha_fin)
    → {fecha, label, tenant_nombre, tenant_logo_url, total_ventas, num_transacciones,
       sales: [{codigo, cajero, metodo_pago, total, monto_recibido, cambio, hora, items:[...]}]}
```

All report views use `America/Bogota` timezone for hour extraction.

### Query params — validated, never raw

Every date/int query param goes through **`apps/tenants/date_params.py`** (`parse_date_param`, `parse_date_range`, `parse_positive_int`). Consumers: the 5 report `APIView`s, `SaleViewSet.get_queryset` and `InventoryMovementViewSet.get_queryset`.

| Rule | Behaviour |
|---|---|
| Format | strictly `YYYY-MM-DD` → otherwise **400** on the offending field (`fecha`, `fecha_inicio`, `fecha_fin`) |
| `fecha_inicio > fecha_fin` | **400** (it used to return an empty list in silence) |
| Range width | capped at **`MAX_RANGE_DAYS = 366`** (inclusive count) → **400** above it. This is what bounds `VentasPorDiaView`'s per-day loop, which had no limit at all |
| `limit` | `?limit=abc` → 400; `?limit≤0` → 400; above 100 → **clamped** to 100 (unchanged behaviour); default 10 |
| **Half a range** | **not an error.** Each bound is independent — this is deliberate because `SalesHistoryPage` sends `fecha_inicio`/`fecha_fin` separately (the user may fill only one) |

What a missing bound means, per endpoint (documented defaults, unchanged):

- `GET /api/sales/`, `GET /api/inventory/movements/` — each bound filters **open-ended** (`?fecha_inicio` alone = "from that date on").
- `summary`, `top-productos` — the range applies only when **both** bounds are present; otherwise no date filter (full history). A lone `fecha` wins over the range.
- `sales-detail` — `fecha` → that day; both bounds → that range; anything else (including half a range) → **today**.
- `ventas-por-dia` — needs a closed range to build the series; missing either bound → **the last 7 days**.

**Guard order:** `require_tenant(request)` runs **before** parsing any param — no tenant is a **403**, not a 400.

> **Gotcha — why a helper and not a `try/except` per view.** DRF's `exception_handler` does **not** map `ValueError` (from `int()` / `date.fromisoformat()`) nor `django.core.exceptions.ValidationError` (raised when garbage reaches a date/UUID lookup): it returns `None` for them and Django turns them into a **500**. Only `rest_framework.serializers.ValidationError` becomes a 400 with a per-field body — the shape `applyServerErrors` consumes on the frontend. Any new query param that reaches a queryset must be parsed through the helper.
>
> **Still unvalidated (known):** the UUID params `?user=` (`SaleViewSet`) and `?product=` (`InventoryMovementViewSet`) go raw into their lookups, so `?user=abc` is still a **500** (`ValidationError: “abc” no es un UUID válido`). Pending task.

---

## Serializers — Key Behaviors

**`UserCreateSerializer`** validation rules:
- SUPERADMIN role cannot be assigned via API
- CAJERO requires `cedula`
- ADMIN requires `correo`
- Enforces global uniqueness on `correo`, per-tenant uniqueness on `cedula`
- **`PATCH /api/users/{id}/` no longer nullifies omitted fields.** The same serializer handles `create`, `update` and `partial_update` (`views.py` `get_serializer_class`). `validate()` used to write `data["correo"]`/`data["cedula"]` **unconditionally** — a key absent from the request computed as `None` and `update()` persisted that `None`, wiping the field (deadly for `correo` = `USERNAME_FIELD`). It only ever worked because `UsersPage` happens to always send the active role's field. Now a key is written back **only if it came in the request** (`"correo" in self.initial_data`); otherwise it is popped so `update()` never sees it. Sending `correo: ""` explicitly still 400s — **emptying ≠ omitting**.
- **`rol` falls back to the instance's role**, not to `CAJERO`: `data.get("rol", getattr(self.instance, "rol", UserRole.CAJERO))`. The old `CAJERO` default made a `PATCH` that omitted `rol` demand a cédula, returning a spurious 400 `"La cédula es obligatoria para cajeros."` when merely renaming an ADMIN. The per-role required check also reads the stored value for keys the request omitted, so it validates the user's **resulting** state rather than a half-empty payload.

**`ProductSerializer`** validation:
- `tipo=CON_CODIGO` requires `barcode`, `precio_costo`, `proveedor`
- `category` must belong to the same tenant as the request
- **Money and stock have a floor of 0**, in **two layers**: `MinValueValidator` on the model fields (`precio_venta`, `precio_costo`, `stock_actual`, `stock_minimo`) and explicit `min_value` on the serializer's price fields, which only exist to own the Spanish message (`"El precio de venta no puede ser negativo."`). Two layers because `/admin/`, the shell and management commands never touch DRF — and DRF alone would have left them open. **Zero is allowed on purpose**: a $0 line is a legitimate promo/combo/sample; negative is what breaks the money invariant. A negative `precio_venta` used to be accepted, and the sale then computed a **negative total** and handed the customer `cambio` — the register paying out for something it never charged (the `monto_recibido >= total` guard passes happily: `0 >= -50000`).
- Caveat worth knowing: `Model.full_clean()` is what runs those validators, and Django **never calls it on `.save()`** — a raw `Product.objects.create(precio_venta=-999)` in a shell still writes. That is exactly why the rule is duplicated in the serializer instead of trusted to the model alone.

**`InventoryMovementSerializer`**:
- **A movement can never leave `stock_actual` below zero** → **400** on `cantidad` stating what is available (`"El movimiento dejaría el stock en -94. Disponible de 'Pan': 5."`). The rule is about the **result, not the sign**: a negative `AJUSTE` is legitimate (correcting shrinkage) and still works; what it cannot do is push the stock negative. Sales guarded their own path already; inventory was the other door and had no check at all.
- The check runs inside `@transaction.atomic` with `select_for_update()` on the product row — the same treatment the sale gives it. Without the lock two simultaneous adjustments would both read the old stock and both pass.

**`SaleCreateSerializer`**:
- `EFECTIVO` requires `monto_recibido` **>= `total`** (recalculated server-side) → **400** on field `monto_recibido` if insufficient. The guard lives in `create()` (not `validate()`) because it needs the `total` from `_resolve_products()`'s `select_for_update()`, which requires the `@transaction.atomic` block; it runs before any write so the lock is reverted with no persisted rows. `NEQUI_TRANSFERENCIA` is unaffected.
- `items` must have at least 1 entry
- Stock check only applies to `CON_CODIGO` products
- **Stock is checked on the SUM per product, not per line.** The client may repeat the same `product` across several items, so `_resolve_products()` aggregates quantities by `product_id` **before** comparing against `stock_actual`. Checking line by line let two lines of 3 each pass `3 <= 5` and then decrement twice → `stock_actual = -1`, i.e. overselling. Same class of defect as the `monto_recibido` guard: **the server never trusts the shape of the client's payload.** The 400 reports the aggregated amount (`disponible 5, solicitado 6`), one message per product.
- **Duplicate lines are NOT merged into one `SaleItem`** (deliberate): one row is still written per input item, so a receipt shows the product twice if the client sent it twice. Only the *validation* aggregates. Merging would change the receipt/history contract (`printReceipt.ts`), so it needs its own decision. The POS consolidates the cart client-side, so in practice duplicates do not arrive from the UI.

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
DOCS_API_KEY=
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
psycopg2-binary==2.9.10       # PostgreSQL
cloudinary==1.44.2            # Image storage
drf-spectacular==0.30.0       # OpenAPI schema + Swagger/Redoc docs
drf-spectacular-sidecar==2026.8.1  # self-hosted Swagger/Redoc JS/CSS, no CDN
```

Receipts are generated on the **frontend** (`printReceipt.ts` / `generateReceipt.ts`), not the backend — there is no ESC/POS printing dependency.

---

## API Docs — `/docs/`, `/redoc/`, `/api/schema/`

Swagger UI (`/docs/`), Redoc (`/redoc/`) and the raw OpenAPI 3 schema (`/api/schema/`) are wired in `elvuelto/urls.py` via `drf-spectacular`. All three are gated behind a **single static secret** (`DOCS_API_KEY`, `.env`) — a dev/support tool, not a per-user credential, and unrelated to real endpoint auth.

**Fails closed.** `DOCS_API_KEY` unset/empty ⇒ nobody gets in, key or not (verified directly against `key_matches`, 4/4 cases: unset+no-key, unset+any-key, set+wrong, set+correct).

**Browser access goes through a login form, not a URL parameter.** Visiting `/docs/` or `/redoc/` without an active session redirects (302) to `/docs/login/?next=<original path>` — a plain HTML form (`DocsLoginView`, `docs_views.py`) that POSTs the key, checks it with `hmac.compare_digest`, and on success sets a session flag (`request.session["docs_authorized"] = True`, Django's existing cookie-backed session framework — nothing new to wire). The key never has to appear in a URL: the browser sends the session cookie automatically on every later request, **including Swagger UI's own JS fetch of `/api/schema/`** — no query-param forwarding hack needed. `next` is validated with `url_has_allowed_host_and_scheme` (same helper Django's own `LoginView` uses) so a crafted `?next=https://evil.example` cannot redirect off-site after a real login — verified live. Already-logged-in `GET /docs/login/` redirects straight through instead of re-showing the form.

An **earlier version of this gate accepted `?key=` in the URL** (so a bare browser visit worked with no form). Dropped after the owner asked for a GUI instead of an HTTP-parameter mechanism — which also happened to close two leaks an adversarial review had found: server/proxy access logs capturing the key, and Django's `DEBUG=True` error page echoing `request.GET` unredacted.

**The `X-Docs-Api-Key` header still works**, unchanged, for curl/Postman/CI — no browser, no session, no form. `/api/schema/` keeps DRF's normal `permission_classes` (`HasDocsApiKey`, from `SPECTACULAR_SETTINGS["SERVE_PERMISSIONS"]`) and answers a plain **403** if neither the header nor the session is present — no redirect there, since it's fetched by JS/curl, not typed into an address bar. `/docs/` and `/redoc/` opt out of that automatic 403 (`permission_classes = []` on `_RedirectsToLoginMixin`) and check `HasDocsApiKey().has_permission(...)` by hand in `get()` so an unauthorized visit can redirect instead.

**This key does not unlock real endpoints.** `GET /api/products/pos/` still returns `401` regardless of a valid docs session/header — verified live. Once inside `/docs/`, the separate "Authorize" 🔒 button (a `jwtAuth` Bearer scheme, auto-registered by importing `drf_spectacular.contrib.rest_framework_simplejwt` in `docs_views.py`) is what lets you actually exercise real endpoints via "Try it out", using a real user's JWT — same as any API client.

**Assets are self-hosted (`drf-spectacular-sidecar`), not loaded from a CDN.** `SWAGGER_UI_DIST`/`REDOC_DIST`/`SWAGGER_UI_FAVICON_HREF` = `"SIDECAR"` in `SPECTACULAR_SETTINGS`. Served at `/static/drf_spectacular_sidecar/...` via `django.contrib.staticfiles` (already in `INSTALLED_APPS`).

**All three responses carry `Cache-Control: no-store`** (`_NoStoreMixin.finalize_response`) so a shared/forward cache in front of the app can never replay a key-bearing page to a different client.

> **Gotcha — never import `drf_spectacular.*` submodules from inside `settings/base.py`.** Every `drf_spectacular` submodule reads `django.conf.settings` at import time. Importing one from a settings module that is itself still being loaded triggers a **reentrant** settings load: Django hands it a *partial* module (only the names defined above that import line), so drf-spectacular's global settings singleton (`drf_spectacular.settings.spectacular_settings`) freezes forever with defaults — `SERVE_PERMISSIONS` silently reverts to `AllowAny` — even though `django.conf.settings.SPECTACULAR_SETTINGS` itself ends up fully correct afterwards. Hit this for real while building the feature: `/docs/` returned **200** with no key at all until the `rest_framework_simplejwt` contrib import was moved out of `settings/base.py` into `docs_views.py` (which is only imported once `urls.py` loads, always after settings finish). `SPECTACULAR_SETTINGS` (the dict) is fine to keep in `settings/base.py`; only *imports of the package's own submodules* are the trap.

Permission logic: `elvuelto/docs_auth.py` (`HasDocsApiKey`, `key_matches`, `hmac.compare_digest`). Views + login form: `elvuelto/docs_views.py`. Settings: `SPECTACULAR_SETTINGS` + `DOCS_API_KEY` in `settings/base.py`.

---

## Image Uploads — `elvuelto/cloudinary_uploads.py`

**All three upload endpoints — and the one delete endpoint — go through this module. Do not call `cloudinary.uploader.*` from a view.** It lives next to `settings/` (where `cloudinary.config(...)` runs) because it belongs to neither `products` nor `tenants`, and both use it.

| Endpoint | Profile |
|---|---|
| `POST /api/products/categories/{id}/upload_image/` | `CATALOG_IMAGE_TRANSFORMATION` |
| `POST /api/products/{id}/upload_image/` | `CATALOG_IMAGE_TRANSFORMATION` |
| `POST /api/tenants/{id}/upload_logo/` | `LOGO_TRANSFORMATION` |

Both profiles are `width/height 1000, crop "limit", quality "auto:good"`. They are **separate constants on purpose** even though the numbers match today: shrinking logos later must not silently change product photos. `crop: "limit"` only ever scales **down** — a 100×100 icon stays 100×100 (verified), it is never upscaled or cropped.

### The pipeline

1. `validate_image_upload(file)` → **400** before any network call if the file is missing, `content_type` is not `image/*`, or it exceeds **10 MB** (`MAX_IMAGE_BYTES`).
2. `upload_optimized_image(...)` sends `transformation=` as an **incoming transformation**: Cloudinary resizes/recompresses *before storing*, so the original never occupies the account (`utils.build_upload_params`, `utils.py:1166`). A Cloudinary error becomes a 400, not the 500 the raw SDK exception produced — DRF does not map `cloudinary.exceptions.Error`.
3. `image_delivery_url(result)` builds the URL to persist in `imagen_url` / `cloudinary_url`.

### Why the stored URL is not `result["secure_url"]`

Two things the upload response does not give you:

- **`f_auto`.** `fetch_format` is a *delivery* feature (it reads the browser's `Accept` header), so it does nothing as an incoming transformation, and the URL `upload()` returns has no transformation segment at all. Measured on one stored asset: **43.969 B** from the plain URL vs **22.332 B** as WebP from the delivery URL, with a plain JPEG still served to clients that do not advertise WebP.
- **`version`.** Every upload reuses a deterministic `public_id` (`product_<uuid>`), so replacing a photo overwrites the same path. Without `v<timestamp>` the URL is byte-identical before and after and the CDN keeps serving the old image — this really happened during verification: a 100×100 upload came back as the 1000×750 photo uploaded seconds earlier under the same id. `secure_url` had this property built in; `image_delivery_url` rebuilds it.

### Measured effect

A 2400×1800 / 205.717 B photo, through any of the three endpoints: stored 1000×750 / 43.969 B, **served 22.332 B as WebP — 90% smaller**, visually indistinguishable from the original (compared side by side, no artefacts). A 3000×2000 / 7.1 MB file drops to 571.729 B stored.

> **Only new uploads.** Nothing here is retroactive: images uploaded before this exist unchanged at their original size, and there is deliberately no backfill script. They will shrink the next time someone replaces them.

### Removing an image — `destroy_image(public_id)`

`DELETE /api/tenants/{id}/logo/` (`TenantViewSet.delete_logo`) is the only caller today. It destroys the Cloudinary asset and deletes the `TenantDocument` row. Product/category images have **no** delete endpoint — replacing them is the only path.

**It never raises; it returns a bool.** That is the opposite of `upload_optimized_image` (which turns a Cloudinary error into a 400) and it is deliberate: the caller deletes the row right after, and a CDN hiccup must not be able to stop a superadmin from removing a logo. The orphan a failed destroy leaves behind is bounded and **self-healing** — the `public_id` is deterministic (`tenant_<uuid>_logo`) and uploads pass `overwrite=True`, so the next logo for that tenant writes over it.

> **Gotcha — `except cloudinary.exceptions.Error` does NOT catch everything the SDK throws.** `uploader.call_api` calls `utils.sign_request` (`uploader.py:882`) and `utils.cloudinary_api_url` (`:892`) **before** opening its own `try:` (`:902`), and both raise a plain **`ValueError`** — "Must supply api_key" / "api_secret" / "cloud_name" (`utils.py:619,622,910`) — which is not in the `cloudinary.exceptions` hierarchy. Only the HTTP request and the JSON parse are wrapped into `Error`. Because `settings/base.py` reads the three credentials with `default=""`, an environment that lost its `.env` **boots normally** and fails only on image operations. `destroy_image` therefore catches `Exception`, not `Error`: with the narrow catch the `ValueError` escaped, DRF did not map it (it maps no `ValueError`), `DELETE /logo/` answered **500**, and since `doc.delete()` runs after the call the row survived — leaving a logo that could never be removed from any screen. Found by an adversarial review and reproduced against `cloudinary==1.44.2`. **The same hole still exists in `upload_optimized_image`** (its documented 400 becomes a 500 on unusable credentials) — a separate, lower-impact task, since nothing is left half-written there.

**Call order matters:** the destroy runs *before* `doc.delete()`. An unexpected exception the SDK does not wrap therefore leaves the row intact — a logo still shown and still stored — rather than the reverse, a row deleted while the asset lives on unreferenced and unbillable-to-anyone.

**`invalidate=True` is a request, not a guarantee.** Verified live: right after a 204 the delivery URL still returned **200** from the CDN edge while `cloudinary.api.resource(public_id)` already answered `NotFound` — the origin was gone, the cached copy was not. This does not affect the app (the row is deleted, so no screen renders that URL again, and the next upload gets a fresh `v<timestamp>`), but do not use "fetch the old URL" as a test that deletion worked — check the Admin API instead.

**Idempotent:** no logo ⇒ still **204**. A DELETE states a desired end state, and a double click or a retry after a dropped connection must not surface as an error on an operation that in fact succeeded.

---

## Dev Seed Data

`python manage.py seed_dev_data` creates:

| What | Value |
|---|---|
| Superuser | admin@elvuelto.com / admin123 → `/super-admin/login` |
| Sample tenant | Panadería La Esperanza (NIT 900123456) |
| **Tenant slug** (staff login URL) | **`panaderia-la-esperanza`** → `/login/panaderia-la-esperanza` |
| Tenant admin | juan@laesperanza.com / admin123 → `/login` |
| Cashier | **cedula=12345678 / PIN 1234** → the staff login URL above |

**The slug is now stored on the row**, generated once by `Tenant.save()` (`apps/tenants/slugs.py`), so "Panadería" transliterates to `panaderia-` — the intuitive spelling. It used to be recomputed per request by `_nombre_to_slug`, which **dropped** the `í` and produced `panader**a**-la-esperanza`; the POS derived a third, different spelling. If a seeded DB predates migration `tenants/0004`, running `migrate` backfills it. To read the real value: `Tenant.objects.values_list('nombre', 'slug')`.

The cashier logs in with **cédula + PIN**, never with `correo` (`CashierLoginSerializer`), so the seeded cashier gets a `cedula` and a 4-digit PIN built from `password_policy.PIN_LENGTH`. Seeds created before that rule had no `cedula` and simply could not sign in; re-running the command **backfills** them (and is a no-op afterwards, so it stays idempotent).

The two `admin123` passwords are 8 chars, below `ADMIN_PASSWORD_LENGTH` (12), **on purpose**: the seed writes through the model manager, and the policy governs what the API accepts on create/change — no login path enforces a minimum. It is a documented dev-only exception, not drift.

---

## Design Patterns & Gotchas

- **PUT is disabled on every `ModelViewSet` — use PATCH.** `http_method_names = METHODS_WITHOUT_PUT` (`apps/tenants/viewsets.py`) on `TenantModelViewSet` (so `CategoryViewSet`/`ProductViewSet`), `UserViewSet` and `TenantViewSet`; a PUT now returns **405**. Reason: in DRF 3.15 `BooleanField.default_empty_html = False`, and `Field.get_value` applies it whenever the input is **HTML (form/multipart)** and the serializer is **not partial**. So a multipart `PUT` that merely *omits* a boolean silently writes `False` — a superadmin editing a business's name would flip `activo` off and take it offline (403 everywhere, `exists:false` on its login page); the same trick switches a user's `activo`/`lead_cashier` off. PATCH is immune (it is partial), and the frontend only ever uses POST/PATCH. If a PUT is ever needed, declare the booleans explicitly on the serializer first.
- **Always use `F()` for stock updates** — `SaleCreateSerializer` and `InventoryMovementSerializer` both use `F()` to prevent race conditions on concurrent sales.
- **`select_for_update()` on products during sale creation** — locks product rows for the duration of the transaction.
- **`product_nombre` is a snapshot on SaleItem** — do not try to derive it from the product FK; it exists so history survives product renames.
- **`Sale.codigo` is auto-generated** — 7-char alphanumeric in `Sale.save()`. Never set it manually.
- **Cloudinary stores `public_id` in DB** — needed for deletion/replacement. Always save both `cloudinary_url` and `cloudinary_public_id`.
- **Every image upload *and deletion* goes through `elvuelto/cloudinary_uploads.py`.** Never call `cloudinary.uploader.upload()` or `.destroy()` directly from a view — see the section below.
- **`SALIDA_VENTA` movements are system-only** — `InventoryMovementSerializer.validate()` rejects them if submitted manually.
- **Tenant-scoped endpoints must guard `request.tenant` via `require_tenant(request)`** (`apps/tenants/utils.py`) — returns the tenant or raises `PermissionDenied` (**403**) when there is no tenant context (SUPERADMIN, whose `tenant` is None and must impersonate per the access-model ADR; or an inactive/invalid tenant). **No tenant ⇒ 403. Never continue, never "return empty", never skip a validation.**

  Where it is called today (all verified by request):

  | Path | Guarded at |
  |---|---|
  | `CategoryViewSet` | `TenantModelViewSet.get_queryset` / `perform_create` → `_get_tenant()` |
  | `ProductViewSet` | its **own** `get_queryset()` (it overrides the base, so it calls `self._get_tenant()`) + the `pos` action + inherited `perform_create` |
  | `SaleViewSet` | `get_queryset()`; writes via `SaleCreateSerializer.create` |
  | `InventoryMovementViewSet` | `get_queryset()` **and** `perform_create()` |
  | `UserViewSet` | `get_queryset()` |
  | `reports` (5 `APIView`s), `StockView` | directly in each handler |
  | `ProductSerializer.validate_category`, `InventoryMovementSerializer.validate_product` | fail-closed cross-tenant check (see below) |

  **Not a "get it for free" situation:** inheriting `TenantModelViewSet` guarantees nothing if the subclass overrides `get_queryset()` without `super()`. `ProductViewSet` did exactly that and was unguarded while the docs claimed otherwise.

  `UserCreateSerializer` is guarded too (it was the last raw deref): both the cédula-uniqueness filter in `validate()` and the `tenant` assignment in `create()` go through `require_tenant`, so `POST /api/users/` as a SUPERADMIN is a **403**. It used to be a 500 either way — `TypeError` inside `filter(cedula=…, tenant=<lazy None>)` when a `cedula` was sent, or `ValueError: Cannot assign "<SimpleLazyObject: None>"` on assignment otherwise. It never actually created a tenant-less user; it just crashed.
- **Gotcha — never `request.tenant is None`.** `request.tenant` is a `SimpleLazyObject` (`TenantMiddleware`), so `lazy is None` is **always** False even when it resolves to None (`is` checks the proxy's identity, never evaluates). Detect the None case by truthiness (`if not tenant:`) — which is exactly what `require_tenant` does. (An earlier `TenantModelViewSet._get_tenant` used `is None` and therefore never actually fired.)
- **A missing guard does NOT "return empty" — it 500s.** `filter(tenant=<lazy resolving to None>)` raises `TypeError: one of the hex, bytes, bytes_le, fields, or int arguments must be given` (Django tries to build a UUID out of the proxy). Verified on `Sale` and `User`. So an unguarded tenant-scoped queryset is a 500, not a silent empty list — and "silently empty" would arguably be worse: on `UserViewSet` a literal `filter(tenant=None)` means `tenant IS NULL`, i.e. **every SUPERADMIN of the platform**, listable and editable by any tenant admin. The fix is always 403, never `filter(tenant=None)`.
- **Guards must fail CLOSED.** Both cross-tenant checks used to read:
  ```python
  if request and request.tenant and value.tenant_id != request.tenant.id:   # WRONG
      raise serializers.ValidationError("... no pertenece a este tenant.")
  ```
  That `and request.tenant` disables the cross-tenant validation **exactly when there is no tenant** — the one case where you cannot verify ownership — so a foreign product/category sails through. Absence of context must close the door, not open it: resolve with `require_tenant(request)` first (403), then compare. Applies to `ProductSerializer.validate_category` and `InventoryMovementSerializer.validate_product`. Any new `if request.tenant and <check>` is this bug again.
- **No test framework configured** — neither backend nor frontend has tests set up yet.
