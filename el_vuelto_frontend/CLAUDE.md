# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Commands

```bash
npm run dev          # Vite dev server on port 5173
npm run build        # tsc + vite production build
npm run typecheck    # TypeScript type checking only
npm run commit       # Interactive Conventional Commits (Husky + commitlint — use this, not git commit directly)
```

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

### API layer (`app/api/baseApi.ts`)

Single `createApi` instance with `baseQueryWithReauth`. On 401, it attempts token refresh at `/auth/refresh/`. On success it retries the original request; on failure it dispatches `logout()` and clears state. All feature APIs (`authApi`, `salesApi`, etc.) inject into this base via `baseApi.injectEndpoints()`.

Tag types: `Tenant`, `User`, `Product`, `Category`, `InventoryMovement`, `Sale`, `Report`.

---

## Feature-Based Architecture (`src/features/`)

Each feature owns its API endpoints, Redux slice (if needed), pages, and sub-components. Nothing is shared between features except the `app/` layer and `components/ui/`.

### `features/auth/`

**`authSlice.ts`** — Redux slice. Actions: `setCredentials`, `updateTokens`, `logout`.

`AuthUser` interface (stored in Redux):
```ts
{ id, nombre, correo, cedula, rol: "SUPERADMIN"|"ADMIN"|"CAJERO", activo, tenantId, tenantNombre, tenantLogoUrl }
```

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
- `createSale({metodo_pago, monto_recibido, items[]})` — invalidates `Sale`, `InventoryMovement`, `Product` tags

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

**`UsersPage.tsx`** — Password generation at creation time:
- ADMIN → 12-char complex password (`generateAdminPassword()`)
- CAJERO → 4-digit PIN (`generatePin()`)

Staff login URL displayed: `/login/{tenantSlug}` with copy-to-clipboard.

---

### `features/tenants/`

**`tenantsApi.ts`** — `checkTenantBySlug(slug)` is the only **public** endpoint (no auth header). Used by `StaffLoginPage` to resolve tenant before login. Creating a tenant also creates the initial admin user — the response includes `initial_admin_password`.

---

### `features/reports/`

**`reportsApi.ts`** — `getSummary`, `getVentasPorHora` (hourly breakdown 0–23, `America/Bogota` TZ), `getTopProductos`.

**`DashboardPage.tsx`** — Default landing for ADMIN. Uses today's date automatically. Shows KPI row, hourly bar chart, top products, recent sales.

**`ReportsPage.tsx`** — Same data but with a date picker and a payment method breakdown section.

---

### `features/super-admin/`

Separate section for SUPERADMIN role. Pages: `home/`, `tenants/`, `billing/`, `users/`, `history/`. Uses `SuperAdminLayout` from `features/layout/super-admin/`.

---

## Routing (`app/router.tsx`)

| Path | Page | Role required |
|---|---|---|
| `/login` | TenantLoginPage | — |
| `/login/:tenantSlug` | StaffLoginPage | — |
| `/super-admin/login` | SuperAdminLoginPage | — |
| `/super-admin/home` | Super admin home | SUPERADMIN |
| `/super-admin/tenants` | Tenants management | SUPERADMIN |
| `/super-admin/billing` | Billing | SUPERADMIN |
| `/super-admin/users` | SA Users | SUPERADMIN |
| `/dashboard` | DashboardPage | ADMIN |
| `/products` | ProductsPage | ADMIN |
| `/inventory` | InventoryPage | ADMIN |
| `/ventas` | SalesHistoryPage | ADMIN |
| `/reports` | ReportsPage | ADMIN |
| `/users` | UsersPage | ADMIN |
| `/pos` | PosPage | CAJERO |

`ProtectedRoute.tsx` (`utils/`) reads `isAuthenticated` and `user.rol` from Redux. Unauthorized users are redirected: CAJERO → `/pos`, ADMIN → `/dashboard`, SUPERADMIN → `/super-admin/home`, unauthenticated → `/login`.

---

## Layouts (`src/layouts/`)

**`LayoutContext.tsx`** — Shared context for sidebar state (`collapsed`, `mobileOpen`). Both `AdminLayout` and `SuperAdminLayout` use this — import `LayoutProvider` and `useLayout` from here.

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
- `var(--font-serif)` → Noto Serif (headings)
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

---

## Patterns to Follow

**Adding a new admin page:**
1. Create `features/<name>/<Name>Page.tsx`
2. Use `ta-*` classes for layout — no new CSS module files
3. Add RTK Query endpoints to a new `<name>Api.ts` via `baseApi.injectEndpoints()`
4. Add route to `app/router.tsx` under the ADMIN protected block
5. Add nav item to `AdminLayout.tsx`

**RTK Query tag invalidation:** When a mutation affects multiple resources (e.g., creating a sale affects stock), list all affected tags in `invalidatesTags`.

**Server-side form errors:** Uniqueness (correo global, cédula per-tenant, nit, barcode) and role-specific rules are validated only on the backend, which returns a DRF 400 `{ campo: ["msg"] }`. In a form's submit `catch`, route the error through `applyServerErrors(err, setError, fallback?)` (`src/utils/applyServerErrors.ts`) — it calls `setError(campo, { type: 'server', message })` per field (field `name` must match the backend's Spanish snake_case key: `correo`, `cedula`, `nit`, `admin_correo`, …), toasts `non_field_errors`/`detail`, and toasts `fallback` for non-400 errors. Never leave an empty `catch {}` on a form submit. Applied in `UsersPage.tsx` and `super-admin/tenants/index.tsx`; `ProductsPage.tsx` and `InventoryPage.tsx` still pending the same treatment.

**Barcode scanning pattern** (used in POS and Inventory):
```ts
// Page-level keydown listener, 300ms idle buffer
// Skip if document.activeElement is input/textarea/select
// Accumulate chars, flush as barcode string on idle
```

**Currency inputs:** Display with dot-thousands, strip non-digits before sending to API.

**Paginated vs array responses:** `listSales` (and similar) normalizes both `T[]` and `{ results: T[] }` — match this pattern when adding new list endpoints that may be paginated.
