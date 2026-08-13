# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Commands

```bash
npm run dev          # Vite dev server on port 5173
npm run build        # tsc + vite production build
npm run typecheck    # TypeScript type checking only
```

**`npm run commit` is NOT a script of this package** — `el_vuelto_frontend/package.json` only defines the four above. Committing runs **from the repo root**, where `"commit": "cz"` and the Husky hooks live:

```bash
cd <repo root> && npm run commit    # Interactive Conventional Commits (commitizen + commitlint)
```

Running it inside `el_vuelto_frontend/` fails with "Missing script: commit".

No test framework is configured.

---

## Environment

```
VITE_API_URL=http://localhost:8000/api
VITE_APP_NAME=El Vuelto
```

Path alias: `@/` → `src/` (configured in both `vite.config.ts` and `tsconfig.json`).

---

## Architecture Overview

React 18 + TypeScript + Vite. State via Redux Toolkit. Data fetching via RTK Query. Routing via React Router v6. Styling via Tailwind CSS v4 + MUI v9 + custom CSS design system (`ta-*` classes). Forms via React Hook Form + Zod.

### State shape (`app/store.ts`)

```
auth        (persisted → sessionStorage)   tokens, user, isAuthenticated
pos                                        cart items, payment method, cash received
[apiBase]                                  RTK Query cache
```

Auth state is persisted to `sessionStorage` via `redux-persist`. Use `useAppDispatch` and `useAppSelector` from `app/hooks.ts` — never the untyped Redux hooks.

### API layer (`app/apiBase.ts`)

Single `createApi` instance with `baseQueryWithReauth`. On 401, it attempts token refresh at `/auth/refresh/`. On success it retries the original request; on failure it dispatches `logout()` and clears state.

**A rejected refresh is what logs the user out.** The chain is `refresh 401 → logout() → isAuthenticated: false → ProtectedRoute redirects to /login` (`/super-admin/login` under that section). It only became reachable once the backend started refusing to refresh a deactivated user — before that the refresh always returned 200, so a cashier deactivated mid-shift kept a UI that looked logged in while every request failed silently. Nothing to write in the client: keep the `else` branch of `baseQueryWithReauth` dispatching `logout()`, and keep screens behind `ProtectedRoute` (that is what performs the redirect — `/pos` included). All feature APIs (`authApi`, `salesApi`, etc.) inject into this base via `apiBase.injectEndpoints()`.

Tag types: `Tenant`, `User`, `Product`, `Category`, `InventoryMovement`, `Sale`, `Report`.

---

## Feature-Based Architecture (`src/features/`)

Each feature owns its API endpoints, Redux slice (if needed), pages, and sub-components. Nothing is shared between features except the `app/` layer and `components/ui/`.

### `features/auth/`

**`authSlice.ts`** — Redux slice. Actions: `setCredentials`, `updateTokens`, `logout`.

`AuthUser` interface (stored in Redux):
```ts
{ id, nombre, correo, cedula, rol: "SUPERADMIN"|"ADMIN"|"CAJERO", activo, leadCashier, tenantId, tenantNombre, tenantSlug, tenantLogoUrl }
```

**`tenantSlug` comes from the login response (`user.tenant_slug`) and is never computed on the client.** It is the persisted `Tenant.slug` (backend `apps/tenants/slugs.py`). Anything that needs a `/login/<slug>` URL — `PosPage`'s "Cerrar Turno", `UsersPage`'s staff link — reads it from Redux. There used to be two local slugify functions (`utils/slugify.ts`, now deleted, and a `toSlug` inside `UsersPage`) that disagreed with each other **and** with the backend on accents: a cashier of "Panadería La Esperanza" was sent to a slug the server could not resolve → "Sucursal no encontrada". Do not reintroduce one; if a new screen needs the slug, take it from `state.auth.user.tenantSlug`.

**`authApi.ts`** — Two login mutations:
- `loginSuperAdmin(correo, password)` → `POST /auth/login/` — dispatches `setCredentials` on success
- `loginWorker(tenant_id?, cedula?, correo?, password)` → `POST /auth/login/cashier/`

Login pages:
- `TenantLoginPage.tsx` — email login, routes ADMIN → `/dashboard`, CAJERO → `/pos`
- `StaffLoginPage.tsx` — resolves tenant by slug (calls `checkTenantBySlug`), then cedula + 4-digit PIN (auto-submits on PIN complete)
- `SuperAdminLoginPage.tsx` — standalone superadmin login with Three.js animated background

---

### `features/sales/`

**`posSlice.ts`** — Cart state. Actions: `addItem`, `removeItem`, `updateQuantity`, `clearCart`, `setMetodoPago`, `setMontoRecibido`.

`CartItem`: `{ productId, nombre, precioUnitario, cantidad, tipo: "SIN_CODIGO"|"CON_CODIGO", imagen_url }`

**`salesApi.ts`** — Endpoints:
- `listSales(search?, fecha_inicio?, fecha_fin?, metodo_pago?)` — normalizes both array and paginated `{results:[]}` responses
- `createSale({metodo_pago, monto_recibido, items[]})` — invalidates `Sale`, `InventoryMovement`, `Product`, `Report` tags (all 5 report queries in `reportsApi` provide `Report`, so dashboard/reports refresh live after a sale). `createMovement` does **not** invalidate `Report` — inventory movements don't feed any sales-based report figure.

**`PosPage.tsx`** — Two-panel layout: left = catalog/search, right = cart + payment. Critical behaviors:
- **Barcode scanning**: page-level `keydown` listener with 300ms idle buffer. Accumulates characters, flushes as barcode when idle. Skipped when `input/textarea/select` is focused. Same pattern in `InventoryPage.tsx`.
- Payment flows: `EFECTIVO` opens `CashInputModal` to capture cash received; `NEQUI_TRANSFERENCIA` skips it.
- `SuccessModal` renders receipt preview with print option after successful sale.

**`SalesHistoryPage.tsx`** — Paginated list (20/page), date range filter, receipt preview modal.

---

### `features/products/`

**`productsApi.ts`** — Two product serializations:
- `Product` — full admin view: `category` is a UUID + separate `category_nombre`
- `PosProduct` — POS view: `category` is the category **name** (string), not UUID. Fetched via `GET /products/pos/`.

Endpoints: `listProducts`, `getPosProducts`, `listCategories`, `createProduct`, `updateProduct`, `deleteProduct`, `uploadProductImage`, CRUD for categories, `uploadCategoryImage`.

**`ProductsPage.tsx`** — Dual-tab (Products / Categories).
- Image upload supports clipboard paste via `Ctrl+V` in addition to file picker.
- Price inputs display dot-thousands formatting (`"1.234.567"`) but submit raw numbers — there is a `formatCOP` helper but the input stripping/formatting is done inline in the component.
- `tipo` toggle (Sin código ↔ Con código) shows/hides `barcode`, `precio_costo`, `proveedor` fields.
- Products with `tipo=CON_CODIGO` have their stock tracked via inventory; `SIN_CODIGO` products do not.

---

### `features/inventory/`

**`inventoryApi.ts`** — Endpoints: `listMovements`, `createMovement` (only `ENTRADA` or `AJUSTE` — `SALIDA_VENTA` is backend-only), `getStock`.

`StockItem` includes `bajo_minimo: boolean` flag (stock < stock_minimo).

**`InventoryPage.tsx`** — Same global barcode scanning pattern as POS. Scanning auto-opens `MovementModal` pre-filled with the scanned product. KPI cards show total products, total stock value, and low-stock count.

---

### `features/users/`

**`usersApi.ts`** — Endpoints: `listUsers`, `createUser`, `updateUser`, `toggleUserActive`, `resetPassword`.

`resetPassword(id)` returns `{ new_password: string }` — shown in `UserCredentialsModal`.

**`UsersPage.tsx`** — Password generation at creation time (there is no password input; it is always generated):
- ADMIN → 12-char complex password (`generateAdminPassword()`)
- CAJERO → 4-digit PIN (`generatePin()`)

**Password policy is per role, not flat.** The backend owns it (`apps/users/password_policy.py`); the front mirrors the two numbers as `PIN_LENGTH` (4) and `ADMIN_PASSWORD_LENGTH` (12), exported from `src/utils/generatePassword.ts` — import those constants instead of hardcoding a length. `ProfilePage.tsx` builds its password Zod schema from the **logged-in user's `rol`** (`makePasswordSchema`), so a cashier keeps the intentional 4-digit PIN while an admin needs 12, with messages verbatim from the backend's `length_error_for`.

**Role-conditional validation:** `schema`/`editSchema` mirror the backend's per-role rule via Zod `superRefine` — **CAJERO requires `cedula`, ADMIN requires `correo`** (`apps/users/serializers.py:192-194`) — so the form blocks before sending instead of eating a 400. Error messages match the serializer's verbatim.

**Editing a user can rotate their credential — the front must show it.** When a `PATCH` on `/api/users/{id}/` raises the role's password floor (CAJERO → ADMIN) and the edit modal sends no `password` (it has no password field), the backend generates a new one for the landing role and returns it as `User.new_password` (`null` on every other update — see `apps/users/serializers.py`, Password policy section of the backend `CLAUDE.md`). `onEditSubmit` in `UsersPage.tsx` checks `result.new_password` after the mutation resolves and, if truthy, opens `UserCredentialsModal` with `isReset: true` — same pattern as `handleReset`'s password-reset flow. It reads `rol`/`correo`/`cedula` off `result` (the server-confirmed state), never off the form data or the stale `editUser`. A demotion, or an edit that doesn't touch `rol`, always gets `new_password: null` and the modal never opens.

Staff login URL displayed: `/login/{tenantSlug}` with copy-to-clipboard.

---

### `features/tenants/`

**`tenantsApi.ts`** — `checkTenantBySlug(slug)` is the only **public** endpoint (no auth header). Used by `StaffLoginPage` to resolve tenant before login; it matches the backend's persisted `Tenant.slug` column, so the slug in the URL must be the one that came from the login response (`tenantSlug`), never a client-side re-slugify of the name. Creating a tenant also creates the initial admin user — the response includes `initial_admin_password`.

---

### `features/reports/`

**`reportsApi.ts`** — 5 report queries, all providing the `Report` tag: `getSummary`, `getVentasPorHora` (hourly breakdown 0–23, `America/Bogota` TZ), `getVentasPorDia`, `getTopProductos`, `getSalesDetail`.

**`ReportsPage.tsx`** — Same data with **four period modes** (`diario` / `semanal` / `mensual` / `personalizado`, each with its own picker — day input, week calendar, month, or a custom start/end pair), a payment method breakdown, Excel/HTML export, and an error banner fed by the five queries' `error` (see the form-errors pattern below).

> **`DashboardPage.tsx` does NOT live here** — it is `src/features/dashboard/DashboardPage.tsx`. It is the default landing for ADMIN, uses today's date automatically, and shows a KPI row, hourly bar chart, top products and recent sales. It consumes `reportsApi` (and `salesApi`), which is why it is easy to misplace.

---

### `features/super-admin/`

Separate section for SUPERADMIN role. Pages: `home/`, `tenants/`, `billing/`, `history/`. Uses `SuperAdminLayout` from `features/layout/super-admin/`.

**`tenants/TenantDetailPage.tsx`** — detail view of one business, reached by clicking any row in the businesses table (`TenantsTable`; the edit button calls `e.stopPropagation()` so it opens its modal instead of navigating). Header with logo/nombre/nit/ciudad/correo/estado, then two tabs following the `ProductsPage` pattern:

- **Resumen** — `ta-kpi-grid` fed by `getTenantMetrics(id)`: ventas del mes, ventas de hoy, admins, cajeros, fecha de alta. Money through `formatCOP`.
- **Usuarios** — `ta-table` fed by `getTenantUsers(id)`. Clicking a row opens a small modal whose only action is **Restablecer contraseña**; on success it opens `UserCredentialsModal` with `isReset: true`. `UserCredentialsModal` and `downloadCredentials.ts` are reused **as-is** — they are generic and do not care that the caller is a superadmin instead of a tenant admin.

The `loginIdentifier` handed to the credential card is `cedula` for a CAJERO and `correo` for an ADMIN, matching what each role actually types to sign in. The `.unwrap()` on the reset is wrapped in `try/catch` + `toast.error(getServerErrorMessage(...))`; a bare `.unwrap()` here leaves the admin waiting for a modal that never opens (the bug already fixed in `UsersPage.handleReset`).

**This page replaced the old `super-admin/users/` module**, which was a static placeholder with zero API calls. Managing a business's staff now starts by choosing the business, so there is no platform-wide users screen, no `/super-admin/users` route, and no "Usuarios" sidebar entry; the home "Gestionar usuarios" quick action points at `/super-admin/tenants`.

The three endpoints it consumes (`getTenantUsers`, `getTenantMetrics`, `resetTenantUserPassword` in `features/tenants/tenantsApi.ts`) are **SUPERADMIN-only and tenant-scoped by URL** on the backend — see the backend CLAUDE.md. They are not impersonation: no token is issued, and this page deliberately offers no create/edit/delete of users.

**The header logo is a click-to-upload control, not just a display.** The real `<input type="file" accept="image/*">` is stretched over the whole avatar (`position:absolute;inset:0;opacity:0`, class `ta-avatar-upload__input` in `src/styles/tenant-admin.css`) — **not** a `<label>` wrapping a hidden input, which is what the first version did and which left the control out of the tab order with no accessible name. The dark overlay on top is decorative: `aria-hidden` + `pointer-events:none`, so it cannot swallow clicks meant for the input, and the input itself carries the `aria-label`.

Selecting a file uploads **immediately** here via `useUploadTenantLogoMutation` (`POST /tenants/{id}/upload_logo/`, field name `logo`). `validateImageFile` (`src/utils/imageUpload.ts`) rejects a wrong type or an oversized file before the request; the backend remains the real authority. `uploadTenantLogo` invalidates the untagged `'Tenant'` tag, which also covers `getTenant(id)`'s per-id tag, so the avatar refreshes on its own — no manual refetch. Same `try/catch` + `toast.error(getServerErrorMessage(...))` idiom as `handleReset` above; success shows `toast.success`.

**The create/edit modals in `super-admin/tenants/index.tsx` have the same control, but deferred** (added 2026-08-12; this supersedes the earlier decision to keep the logo out of those modals — see `ADR-TENANCY-20260812-logo-tenant-modales-crear-editar` in the cerebro). Picking a file there uploads **nothing**: it stores a `LogoDraft` (`components/TenantLogoField.tsx`) — `keep` | `replace{file, preview}` | `remove` — and the submit handler applies it after the tenant write succeeds. Why deferred:

- **Create has no choice.** There is no tenant id until `POST /tenants/` answers, and the create payload must stay **JSON**: sent as multipart, DRF 3.15's `BooleanField.default_empty_html = False` would turn an omitted `activo` into `False` and the business would be born inactive (the same trap that got PUT disabled — see the backend `CLAUDE.md`). So the logo is always a second request keyed on `result.id`.
- **Edit matches it** so "Cancelar" cancels everything, logo included, instead of the name reverting while the photo silently stuck.

Two invariants in those handlers, both about **partial failure** (the tenant write commits, the logo step does not):

1. **Create: the credentials modal must open no matter what.** `initial_admin_password` is shown exactly once and is unrecoverable, so the logo upload runs inside `applyLogoDraft`, which returns an error string and never throws. A failed logo produces an extra `toast.error`, never a missing password.
2. **Edit: data first, logo second.** The reverse order would leave a new logo behind on an edit the server rejected. On a logo-step failure the toast says explicitly that the data *was* saved.

Object URLs from `URL.createObjectURL` are revoked imperatively on every transition (pick, discard, remove, undo, cancel, Escape, backdrop, submit) plus once on unmount via a ref — **not** from a `useEffect` keyed on the draft, because `StrictMode` is on and its simulated remount would revoke a preview still on screen. `deleteTenantLogo` (`DELETE /tenants/{id}/logo/`) invalidates `'Tenant'` like its sibling.

Design: `ta-*` classes only, no new `.module.css` (the `.module.css` files left in `super-admin/` belong to older pages that predate the convention).

---

## Routing (`app/router.tsx`)

| Path | Page | Role required |
|---|---|---|
| `/login` | TenantLoginPage | — |
| `/login/:tenantSlug` | StaffLoginPage | — |
| `/super-admin/login` | SuperAdminLoginPage | — |
| `/super-admin/home` | Super admin home | SUPERADMIN |
| `/super-admin/tenants` | Tenants management | SUPERADMIN |
| `/super-admin/tenants/:id` | TenantDetailPage (resumen + usuarios) | SUPERADMIN |
| `/super-admin/billing` | Billing | SUPERADMIN |
| `/super-admin/history` | HistoryPage | SUPERADMIN |
| `/staff` | — (redirect to `/pos`) | — |
| `/dashboard` | DashboardPage | ADMIN |
| `/products` | ProductsPage | ADMIN |
| `/inventory` | InventoryPage | ADMIN |
| `/ventas` | SalesHistoryPage | ADMIN |
| `/reports` | ReportsPage | ADMIN |
| `/users` | UsersPage | ADMIN |
| `/profile` | ProfilePage | ADMIN |
| `/pos` | PosPage | CAJERO |

Plus `/` → `RootRedirect` and `*` → `/login`.

`ProtectedRoute.tsx` (`utils/`) reads `isAuthenticated` and `user.rol` from Redux. Unauthorized users are redirected: CAJERO → `/pos`, ADMIN → `/dashboard`, SUPERADMIN → `/super-admin/home`, unauthenticated → `/login`.

---

## Layouts (`src/layouts/`)

**`LayoutContext.tsx`** — Shared context for sidebar state (`collapsed`, `mobileOpen`). Both `AdminLayout` and `SuperAdminLayout` use this — import `LayoutProvider` and `useLayout` from here.

`SuperAdminLayout` is canonically at `@/features/layout/super-admin` — that's what `router.tsx` imports. (The old `src/layouts/SuperAdminLayout.tsx` re-export shim was removed; import the feature module directly in new code.)

**Sidebar behavior (both layouts):**
| State | Trigger | Width |
|---|---|---|
| Expanded | Viewport ≥ 1450px or toggled | 256px |
| Collapsed (icon rail) | Viewport < 1450px or toggled | 72px |
| Mobile overlay | Viewport ≤ 768px, hamburger pressed | 256px over content |

CSS variables: `--sa-sidebar-w: 256px`, `--sa-sidebar-collapsed-w: 72px`, `--sa-header-h: 64px`.

---

## Design System

### CSS custom properties (`src/styles/globals.css`)

All color tokens are CSS variables. Key values:
- `--primary`: `#6a2600` (terracotta)
- `--surface-container`: `#f4ede2` (warm parchment)
- `--background`: `#fff8f0`

### `ta-*` classes (`src/styles/tenant-admin.css`)

**All admin pages use these directly in JSX `className` props. Do not create new `.module.css` files for admin pages.**

Key classes by category:
- Layout: `ta-page`, `ta-page-hero`, `ta-page-title`, `ta-page-sub`
- Cards: `ta-card`, `ta-card-low`, `ta-card-header`, `ta-card-title`
- KPI: `ta-kpi-grid`, `ta-kpi-card`, `ta-kpi-value`, `ta-kpi-label`, `ta-kpi-meta--up/flat/down`
- Tables: `ta-table-wrap`, `ta-table`, `ta-thead`, `ta-th`, `ta-td`, `ta-tr`
- Modals: `ta-modal-backdrop`, `ta-modal`, `ta-modal--lg`, `ta-modal-header`, `ta-modal-body`, `ta-modal-footer`
- Buttons: `ta-btn`, `ta-btn-primary`, `ta-btn-secondary`, `ta-btn-ghost`, `ta-btn-icon`
- Forms: `ta-field`, `ta-label`, `ta-input`, `ta-select`, `ta-form-grid`, `ta-field-error`
- Status: `ta-status--active/inactive/error`, `ta-badge--admin/cashier/success/warning/error/neutral`
- Typography: `ta-mono`, `ta-mono--primary`, `ta-mono--tertiary`, `ta-serif`
- Two-pane layout: `ta-pane-layout`, `ta-pane-main`, `ta-pane-side`
- Payment chips: `ta-pay-chip--efectivo`, `ta-pay-chip--nequi`, `ta-pay-chip--bancolombia`

### Fonts
- `var(--font-sans)` → Plus Jakarta Sans (UI text)
- `var(--font-headline)` → **Noto Serif** — this is the headline font the `ta-*` classes actually use (`ta-page-title`, `ta-card-title`, `ta-serif`, …)
- `var(--font-serif)` → **Playfair Display** — a different font, defined in the Tailwind theme block at the top of `globals.css`. Do **not** reach for it expecting the headline look
- `var(--font-mono)` → JetBrains Mono (numbers, codes)

---

## Key Utilities (`src/utils/`)

```ts
formatCOP(1234567)        // → "$1.234.567"  (Colombian peso format)
generateAdminPassword()   // 12-char mixed complexity
generatePin()             // 4-digit numeric PIN
```

`printReceipt.ts` — 80mm thermal receipt layout.
`generateReceipt.ts` — jsPDF receipt for download.
`downloadCredentials.ts` — exports credentials as `.txt`.
`applyServerErrors.ts` — `applyServerErrors(err, setError, fallback?)` maps a DRF 400 onto a react-hook-form (see the form-errors pattern below).
`imageUpload.ts` — `MAX_IMAGE_BYTES` + `validateImageFile(file) → string | null`, the client-side mirror of the backend's `validate_image_upload`. Import it instead of retyping the 10 MB; the messages are verbatim from the backend so a file rejected on either side reads the same. Same mirror pattern as `generatePassword.ts` ↔ `password_policy.py`.

---

## Patterns to Follow

**Adding a new admin page:**
1. Create `features/<name>/<Name>Page.tsx`
2. Use `ta-*` classes for layout — no new CSS module files
3. Add RTK Query endpoints to a new `<name>Api.ts` via `apiBase.injectEndpoints()`
4. Add route to `app/router.tsx` under the ADMIN protected block
5. Add nav item to `AdminLayout.tsx`

**RTK Query tag invalidation:** When a mutation affects multiple resources (e.g., creating a sale affects stock), list all affected tags in `invalidatesTags`.

**Server-side form errors:** Uniqueness (correo global, cédula per-tenant, nit, barcode) and role-specific rules are validated only on the backend, which returns a DRF 400 `{ campo: ["msg"] }`. In a form's submit `catch`, route the error through `applyServerErrors(err, setError, fallback?)` (`src/utils/applyServerErrors.ts`) — it calls `setError(campo, { type: 'server', message })` per field (field `name` must match the backend's Spanish snake_case key: `correo`, `cedula`, `nit`, `admin_correo`, …), toasts `non_field_errors`/`detail`, and toasts `fallback` for non-400 errors. Never leave an empty `catch {}` on a form submit. The pattern now covers **all** admin forms: `UsersPage.tsx`, `super-admin/tenants/index.tsx`, `ProductsPage.tsx` (product + category forms) and `InventoryPage.tsx` (`MovementModal`). Note: for the error to be visible the field must render a `{errors.<campo> && <span className="ta-field-error">…</span>}` — the product form's `barcode`/`precio_costo`/`proveedor` fields (all returned as 400 keys by `ProductSerializer.validate` for `CON_CODIGO`) had no such span until this change.

**A `setError` on a field that is not mounted is invisible.** `applyServerErrors` does its job, but if the input (and its `ta-field-error` span) lives inside a conditional branch that is not rendered, nobody paints the message and the submit fails in silence. This bit `UsersPage`: `correo` and `cedula` each render only in their rol's branch, yet react-hook-form **keeps the value of an unmounted field** (`shouldUnregister` defaults to `false`), so the payload carried both and a 400 on the hidden one vanished. **Rule: send only the fields that belong to the selected branch** — `onSubmit`/`onEditSubmit` now set the other rol's credential to `undefined`, so a 400 can only ever land on a mounted input. When adding a form with branch-conditional fields, either strip the payload the same way or make sure every possible 400 key has a rendered span.

**Non-form surfaces (POS, Reports):** these are not react-hook-forms, so `setError` does not apply — pull a string out of the 400 and drop it in a banner. `ReportsPage` destructures `error` from **all five** RTK Query hooks and renders the first message in an error banner (`var(--error-container)` inline, no new CSS module) above the charts: since the backend's date-param hardening, a "personalizado" range over 366 days or an inverted one returns a 400 and the user used to get blank charts with no explanation. Note the reports 400 is keyed by the failing **param** (`fecha_inicio`, `fecha_fin`, `fecha`, `limit`), which `getServerErrorMessage` does not look at (it only knows `items`/`monto_recibido`/`non_field_errors`/`detail`), so `ReportsPage` has a small local `reportErrorMessage()` that reads those keys first and delegates to the shared helper for everything else.

**Never leave a bare `.unwrap()`.** `handleReset` in `UsersPage` awaited `resetPassword(id).unwrap()` with no `try/catch` — an unhandled rejection where the admin just never saw the credentials modal. Every `.unwrap()` needs a `catch` that routes through `applyServerErrors` (forms) or `getServerErrorMessage` + `toast` (actions).

**The POS specifically:** it is a manual cart, so `setError` does not apply. Use `getServerErrorMessage(err, fallback)` (same `src/utils/applyServerErrors.ts`) to pull a `string` from the 400 and drop it into the `saleError` banner. Field priority: `items` (stock/validation list, joined with " · "), then `monto_recibido`, then `non_field_errors`/`detail`/`error`; non-400 (500, network) falls back. `PosPage.tsx`'s `handleCobrar` uses it, so a sale rejected for insufficient stock or short cash now shows the real backend message instead of a generic one. With this, every 400 surface (admin forms + POS) is covered — the errores-400 work is closed.

**`error` key added to both `getServerErrorMessage` and `applyServerErrors` for image uploads (2026-08-12).** The backend's shared `validate_image_upload` (`elvuelto/cloudinary_uploads.py`, used by all three upload endpoints: product/category/tenant-logo) raises its 400s as `{"error": "<msg>"}`. `getServerErrorMessage` didn't recognize it, so a bad file type or an oversized upload always fell through to the caller's generic fallback string. Worse in `applyServerErrors`: an adversarial review (2026-08-12) found the untreated `error` key hit the generic `setError('error', ...)` branch — no form registers a field literally named `error`, so the message rendered nowhere, and `applyServerErrors` still counted it as `surfaced`, which skipped the fallback toast too. `ProductsPage.tsx`'s product/category image-upload catches (routed through `applyServerErrors`, not `getServerErrorMessage`) failed **completely silently** on an oversized/wrong-type file — no message anywhere. Both helpers now toast the real `error` message like `non_field_errors`/`detail`.

**Barcode scanning pattern** (used in POS and Inventory):
```ts
// Page-level keydown listener, 300ms idle buffer
// Skip if document.activeElement is input/textarea/select
// Accumulate chars, flush as barcode string on idle
```

**Currency inputs:** Display with dot-thousands, strip non-digits before sending to API.

**Paginated vs array responses:** `listSales` (and similar) normalizes both `T[]` and `{ results: T[] }` — match this pattern when adding new list endpoints that may be paginated.
