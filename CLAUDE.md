# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ElVuelto is a multi-tenant SaaS POS (Point of Sale) system for Colombian businesses. It has a Django REST Framework backend and a React + TypeScript + Vite frontend in a monorepo structure.

## Commands

### Backend (`el_vuelto_backend/`)

```bash
# Activate virtualenv
source .venv/bin/activate

# Run dev server
DJANGO_SETTINGS_MODULE=elvuelto.settings.local python manage.py runserver

# Apply migrations
python manage.py migrate

# Create new migration after model changes
python manage.py makemigrations

# Django shell
python manage.py shell
```

### Frontend (`el_vuelto_frontend/`)

```bash
npm run dev         # Start dev server (Vite, port 5173)
npm run build       # Production build
npm run typecheck   # TypeScript type checking
npm run commit      # Interactive conventional commit (Husky + commitlint)
```

Commits must follow Conventional Commits format — `npm run commit` is the safe path.

## Architecture

### Backend

- **Settings**: `elvuelto/settings/base.py` (core), `local.py` (DEBUG + SQL logging), `production.py` (env-based).
- **Apps** (`apps/`): `users`, `tenants`, `products`, `inventory`, `sales`, `reports`.
- **Auth**: JWT via `rest_framework_simplejwt`. Access tokens live 8 hours, refresh tokens 7 days. Login at `POST /api/auth/login/` returns tokens + user profile via `CustomTokenObtainPairSerializer`.
- **Roles**: `SUPERADMIN` (SaaS platform admin), `ADMIN` (tenant admin), `CAJERO` (cashier).
- **Multi-tenancy**: Database-level — all models use `TenantMixin` which auto-filters QuerySets by `tenant_id`. A `TenantMiddleware` extracts the tenant from the request.
- **Media**: Cloudinary for tenant logos and document uploads.
- **Printing**: `python-escpos` for thermal receipt printing.

### Frontend

- **State**: Redux Toolkit (`app/store.ts`). Auth state persisted to `sessionStorage` via `redux-persist`.
- **Data fetching**: RTK Query. `baseQueryWithReauth` in `app/api/baseApi.ts` handles 401s by auto-refreshing the JWT.
- **Features** (`src/features/`): Feature-sliced — each feature owns its slice, API endpoints, and pages.
- **Routing**: React Router v6. `ProtectedRoute` (`utils/ProtectedRoute.tsx`) guards routes by role.
- **Layouts**: `AdminLayout` (sidebar + header) and `AuthLayout` (centered card) in `src/layouts/`.
- **UI**: MUI v9 + Tailwind CSS v4.
- **Path alias**: `@/` maps to `src/` (configured in `vite.config.ts` and `tsconfig.json`).
- **Forms**: React Hook Form + Zod for validation.

### API URL convention

Frontend reads `VITE_API_URL` (defaults to `http://localhost:8000/api`). All RTK Query endpoints are relative to this base.

## Environment Variables

**Backend** (`.env` in `el_vuelto_backend/`):
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

**Frontend** (`.env` in `el_vuelto_frontend/`):
```
VITE_API_URL=http://localhost:8000/api
```

## Key Conventions

- **Super admin** routes/login are separate from tenant admin/cashier flows — `loginSuperAdmin` vs `loginWorker` mutations in the auth feature.
- **Tenant scoping** is automatic via `TenantMixin`; never manually filter by tenant in views — rely on the mixin.
- **Database**: PostgreSQL with `psycopg2-binary`. Colombian locale: timezone `America/Bogota`, language `es-co`.
- No test framework is currently configured in either backend or frontend.

---

## Shared Design System (Super Admin + Tenant Admin)

### "The Hearth & The Ledger" aesthetic
Warm artisan editorial — both layouts share the **same color palette** via CSS tokens in `src/styles/globals.css`. Terracotta primary (`var(--primary)` = `#6a2600`), parchment backgrounds, Noto Serif headlines, JetBrains Mono for numbers, Plus Jakarta Sans for UI text.

### Shared layout context — `src/layouts/LayoutContext.tsx`
Both `AdminLayout` (tenant admin) and `SuperAdminLayout` use the same `LayoutContext`. Import `LayoutProvider` and `useLayout` from `@/layouts/LayoutContext`. The super-admin `LayoutContext.tsx` re-exports from there.

### Sidebar — 3 modes (both layouts)
The sidebar behaves identically in both `AdminLayout` and `SuperAdminLayout`:

| Mode | When | Visual |
|---|---|---|
| **Expanded** | Viewport ≥ 1450px or manually toggled | Full 256px sidebar, icon + label |
| **Collapsed (icon rail)** | Viewport < 1450px or manually toggled | 72px rail, icon only, tooltip on hover |
| **Mobile overlay** | Viewport ≤ 768px, hamburger opens drawer | Full 256px overlay over content, backdrop |

CSS variables (set in `globals.css`):
- `--sa-sidebar-w: 256px` — expanded width (both layouts)
- `--sa-sidebar-collapsed-w: 72px` — icon-rail width (both layouts)
- `--sa-header-h: 64px` — topbar height (both layouts)

### Layout shell colors (both layouts)
- Sidebar: `var(--surface-container)` (#f4ede2 warm parchment)
- Header: glassmorphism `rgba(250,250,249,0.8)` + `backdrop-blur(12px)`
- Main canvas: `var(--background)` (#fff8f0)
- Active nav pill: `var(--surface)` bg, `var(--on-primary-container)` text
- Icon buttons: hover `rgba(251,146,60,0.1)` tint
- User avatar: `var(--primary-container)` bg, `var(--on-primary-container)` text

### Normalized CSS — `src/styles/tenant-admin.css`

**When building a new module, use these `ta-*` class names directly in JSX className props. Do NOT create a new `.module.css` file per page — all shared styles live in `tenant-admin.css`.**

#### Page structure
| Class | Result |
|---|---|
| `ta-page` | Column flex container with 2rem gaps |
| `ta-page-hero` | Row: title left, action buttons right |
| `ta-page-title` | Noto Serif, 2.25rem, primary terracotta |
| `ta-page-sub` | Muted subtitle, 0.9375rem |

#### Cards
| Class | Result |
|---|---|
| `ta-card` | White (#fff) card, 16px radius, 2rem padding |
| `ta-card-low` | Parchment (#faf3e8) card, same sizing |
| `ta-card-header` | Flex row, space-between, bottom margin |
| `ta-card-title` | Noto Serif, 1.25rem, primary |

#### KPI grid
| Class | Result |
|---|---|
| `ta-kpi-grid` | Auto-fill grid, min 200px cols, 1.5rem gap |
| `ta-kpi-card` | White card with overflow hidden |
| `ta-kpi-card--accent` | Adds primary tinted bottom border |
| `ta-kpi-card--secondary` | Secondary-container background |
| `ta-kpi-label` | 0.6875rem, bold, uppercase, tracked |
| `ta-kpi-value` | JetBrains Mono, 1.875rem, primary |
| `ta-kpi-value--serif` | Noto Serif, 1.75rem, on-surface |
| `ta-kpi-meta` | Flex row for trend label |
| `ta-kpi-meta--up` | Tertiary (green) color |
| `ta-kpi-meta--flat` | on-surface-variant color |
| `ta-kpi-meta--down` | Error (red) color |
| `ta-kpi-bg-icon` | Absolute ghost icon, 5% opacity |

#### Buttons
| Class | Result |
|---|---|
| `ta-btn` | Base inline-flex button |
| `ta-btn-primary` | Baked gradient (terracotta→brown), rounded-lg, shadow |
| `ta-btn-secondary` | surface-container-highest bg, primary text |
| `ta-btn-ghost` | Transparent, muted text, hover tint |
| `ta-btn-icon` | 2.25rem circle icon button |
| `ta-btn-icon--danger` | Adds error-container hover to icon button |

#### Filter chips
| Class | Result |
|---|---|
| `ta-chips` | Flex wrap container |
| `ta-chip` | secondary-container pill, 0.8125rem |
| `ta-chip-active` | primary fill, on-primary text |

#### Status & badges
| Class | Result |
|---|---|
| `ta-status` | Flex row: dot + label |
| `ta-status-dot` | 0.5rem circle |
| `ta-status--active` | Tertiary/green |
| `ta-status--inactive` | Outline/gray |
| `ta-status--error` | Error/red |
| `ta-badge` | Rounded-full pill, 0.6875rem, bold, uppercase |
| `ta-badge--admin` | tertiary-fixed bg |
| `ta-badge--cashier` | secondary-container bg |
| `ta-badge--success` | tertiary-fixed bg |
| `ta-badge--warning` | secondary-container bg |
| `ta-badge--error` | error-container bg |
| `ta-badge--neutral` | surface-container-highest bg |
| `ta-badge--primary` | primary-fixed bg |
| `ta-pay-chip--efectivo` | Cash payment chip |
| `ta-pay-chip--nequi` | Nequi chip |
| `ta-pay-chip--bancolombia` | Bancolombia chip |

#### Tables
| Class | Result |
|---|---|
| `ta-table-wrap` | White rounded-lg overflow-hidden container |
| `ta-table` | Full-width, left-aligned, collapsed borders |
| `ta-thead` | surface-container-low header row |
| `ta-th` | 1rem 1.5rem padding, 0.6875rem bold uppercase |
| `ta-td` | 1rem 1.5rem padding, 0.9375rem |
| `ta-tr` | Hover → surface-container-low |

#### Typography utilities
| Class | Result |
|---|---|
| `ta-mono` | JetBrains Mono, 600 weight |
| `ta-mono--primary` | primary terracotta color |
| `ta-mono--tertiary` | forest green color |
| `ta-mono--muted` | on-surface-variant color |
| `ta-serif` | Noto Serif font |

#### Form fields
| Class | Result |
|---|---|
| `ta-field` | Column flex, 0.5rem gap |
| `ta-label` | 0.6875rem, bold, uppercase, tracked |
| `ta-input` | surface-container-highest bg, bottom-border focus on primary |
| `ta-select` | Same as ta-input with cursor: pointer |
| `ta-form-grid` | 2-column form grid |
| `ta-field-error` | 0.75rem, error color |

#### Modals
| Class | Result |
|---|---|
| `ta-modal-backdrop` | Fixed inset, blur overlay, flex center |
| `ta-modal` | White card, max 38rem, 90vh max-height |
| `ta-modal--lg` | Larger modal at 56rem |
| `ta-modal-header` | surface-container-low bg, flex space-between |
| `ta-modal-title` | Noto Serif, 1.75rem, primary |
| `ta-modal-sub` | Subtitle below modal title |
| `ta-modal-body` | Scrollable, flex column, 2rem 2.5rem padding |
| `ta-modal-footer` | surface-container-low bg, justify-end actions |

#### Bar chart
| Class | Result |
|---|---|
| `ta-bar-chart` | Flex items-end, 12rem height container |
| `ta-bar-col` | Flex-1 column for single bar |
| `ta-bar-fill` | Bar fill element (height via inline style %) |
| `ta-bar-fill--peak` | primary-container highlighted bar |
| `ta-bar-label` | 0.625rem mono label below bar |
| `ta-bar-label--peak` | primary color peak label |

#### Rankings & progress
| Class | Result |
|---|---|
| `ta-rank-list` | Column flex, 1rem gap |
| `ta-rank-item` | Row: badge + name + value |
| `ta-rank-badge` | Small circle with rank number |
| `ta-rank-name` | Product/item name (flex: 1) |
| `ta-rank-units` | Mono unit count |
| `ta-rank-total` | Mono primary-colored total |
| `ta-progress-wrap` | 0.5rem track bar |
| `ta-progress-fill` | primary-container fill (width via inline style) |

#### Miscellaneous
| Class | Result |
|---|---|
| `ta-info-note` | primary-fixed tinted info box |
| `ta-info-text` | Info box text, 0.8125rem |
| `ta-role-card` | Selectable role option card |
| `ta-role-card--selected` | primary border + white bg |
| `ta-url-card` | Staff login URL display card |
| `ta-banner` | tertiary-fixed password/notification banner |
| `ta-banner-pw` | Mono password display inside banner |
| `ta-divider` | 1px separator line |
| `ta-empty` | Empty state centered message |
| `ta-pane-layout` | Two-pane flex layout (table + slide panel) |
| `ta-pane-main` | Left scrollable pane |
| `ta-pane-side` | Right 22rem fixed panel |
| `ta-pane-side-header` | Panel header row |
| `ta-pane-side-body` | Panel scrollable body |
| `ta-pane-side-footer` | Panel footer with primary action |
