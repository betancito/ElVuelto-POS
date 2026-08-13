---
tags: [prompt, tenancy, users, super-admin, front, feature]
status: 🔴
module: tenancy
updated: 2026-08-09
---

# Feature DEV — Página de detalle del negocio (super-admin), reemplaza el módulo Usuarios

**Tarea:** [[SUPERADMIN-20260809-pagina-detalle-negocio]] (fase 2 de 2 — front)
**Épica:** [[EPIC-20260809-superadmin-gestion-tenants]]
**Alcance:** frontend únicamente. Backend ya cerrado y verificado — no lo toques. No git.

## Contexto — el backend que ya existe (verificado ejecutando, 13/13 casos, [[RUN-20260809-endpoints-superadmin-tenant-scoped]])

Tres endpoints nuevos, `IsSuperAdmin`-only:

```
GET  /api/tenants/{tenant_id}/users/                       → array de usuarios de ese tenant
     shape: { id, tenant, nombre, correo, cedula, rol: "ADMIN"|"CAJERO", activo, lead_cashier, created_at, updated_at }
     (mismo shape que ya devuelve /api/users/ — UserSerializer)

POST /api/tenants/{tenant_id}/users/{user_id}/reset_password/
     → { "new_password": "<string>" }
     (404 si el user_id no pertenece a ese tenant — no lo manejes como error especial, un 404 genérico está bien)

GET  /api/tenants/{tenant_id}/metrics/
     → { ventas_mes: number, ventas_hoy: number, num_admins: number, num_cajeros: number,
         fecha_alta: string (ISO datetime), activo: boolean }
```

## Qué hay HOY en el front (verificado, sin cambios de tu parte salvo lo que se pide abajo)

- `features/super-admin/tenants/index.tsx` (`TenantsPage`) + `TenantsTable.tsx` — tabla de negocios. **Ninguna fila es clickeable hoy**: el único elemento interactivo por fila es el botón de editar (`TenantsTable.tsx:50-54`, `onClick={() => onEdit(t)}`).
- `features/super-admin/users/` (`SAUsersPage` + `SAUsersPlaceholder`) — **placeholder estático, cero API calls**. Esto es lo que se borra.
- Ruta `/super-admin/users` en `app/router.tsx`. Nav item "Usuarios" en `features/layout/super-admin/components/Sidebar/index.tsx` (array `NAV_ITEMS`). Botón "Gestionar usuarios" en `features/super-admin/home/components/QuickActions.tsx:9` que navega a `/super-admin/users`.
- `components/ui/UserCredentialsModal.tsx` + `utils/downloadCredentials.ts` (`downloadUserCredentialCard`) — **genéricos, no dependen de que el caller sea un ADMIN de tenant**. Prop shape:
  ```ts
  interface UserCredentialsData {
    tenantNombre: string
    tenantLogoUrl?: string | null
    userName: string
    rol: 'ADMIN' | 'CAJERO'
    loginIdentifier: string
    password: string
    isReset?: boolean
  }
  ```
  Mismo componente que ya usa `features/users/UsersPage.tsx` para "Restablecer contraseña" — copiá ese patrón, no reinventes el modal.
- Design system: usá clases `ta-*` (`ta-page`, `ta-kpi-grid`, `ta-kpi-card`, `ta-table-wrap`/`ta-table`, `ta-badge--admin`/`ta-badge--cashier`, `ta-modal*`). Para el patrón de tabs, mirá `ProductsPage.tsx` (dual-tab Productos/Categorías) — es el mismo patrón que necesitás acá (Resumen/Usuarios).

## Qué hacer

### 1. RTK Query — `features/tenants/tenantsApi.ts`
Agregá 3 endpoints nuevos (son sub-recursos de tenant, van en el mismo archivo que ya tiene `getTenant`/`listTenants`):
- `getTenantUsers(tenantId: string)` → `GET /tenants/${tenantId}/users/`
- `resetTenantUserPassword({ tenantId, userId }: { tenantId: string; userId: string })` → `POST /tenants/${tenantId}/users/${userId}/reset_password/`
- `getTenantMetrics(tenantId: string)` → `GET /tenants/${tenantId}/metrics/`

Definí los tipos de respuesta según los shapes de arriba (no inventes campos que el backend no manda).

### 2. Navegación desde la tabla de negocios
`TenantsTable.tsx` — la fila entera navega a `/super-admin/tenants/{id}` al hacer click, **sin** romper el botón de editar existente (`e.stopPropagation()` en el `onClick` del botón de editar, para que no dispare también la navegación de la fila).

### 3. Ruta nueva
`app/router.tsx` — agregá `path="tenants/:id"` → `TenantDetailPage`, anidada bajo el mismo `SuperAdminLayout` que ya envuelve `/super-admin/*` (junto a la ruta existente `tenants`).

### 4. `TenantDetailPage` (nueva, `features/super-admin/tenants/` — elegí vos el archivo exacto, ej. `TenantDetailPage.tsx` o una subcarpeta `detail/`)
- Lee el `:id` de la URL (`useParams`).
- Header: logo del tenant, nombre, nit, ciudad, correo, badge de estado (activo/inactivo) — mismos datos que ya trae `getTenant(id)` (ya existe, `tenantsApi.ts`, no hace falta tocarlo).
- Dos secciones con tabs (patrón de `ProductsPage.tsx`): **"Resumen"** y **"Usuarios"**.
  - **Resumen**: `ta-kpi-grid` con las métricas de `getTenantMetrics(id)` — ventas del mes, ventas de hoy, admins, cajeros, fecha de alta. Formateá plata con `formatCOP` (`src/utils/`).
  - **Usuarios**: `ta-table` con los usuarios de `getTenantUsers(id)` — nombre, rol (badge), correo/cédula según rol, estado. Click en una fila abre un modal chico con el nombre del usuario y un botón "Restablecer contraseña".
- Al confirmar el reset: llamá `resetTenantUserPassword({tenantId, userId})`, y con el `new_password` que vuelve, abrí `UserCredentialsModal` con `isReset: true`, `tenantNombre`/`tenantLogoUrl` del tenant que estás viendo, `userName`/`rol` del usuario, `loginIdentifier` = `correo` si es ADMIN o `cedula` si es CAJERO, `password` = el nuevo. **No dejes el `.unwrap()` sin `catch`** (ya hay precedente de este bug en `UsersPage.tsx` — mirá cómo lo resolvió `handleReset` ahí: `try/catch` + `toast.error(getServerErrorMessage(...))`).

### 5. Borrar el módulo Usuarios de super-admin
- `features/super-admin/users/` completa (carpeta entera: `index.tsx`, `SAUsersPage.module.css`, `components/SAUsersPlaceholder.tsx` + su `.module.css`).
- La ruta `/super-admin/users` en `router.tsx`.
- El nav item "Usuarios" en `Sidebar/index.tsx` (`NAV_ITEMS`).
- El botón "Gestionar usuarios" de `QuickActions.tsx:9` — repointealo a `/super-admin/tenants` (ya no hay una pantalla de usuarios separada; gestionar usuarios ahora empieza por elegir el negocio) o borralo, tu criterio, pero **no** puede quedar apuntando a una ruta muerta.

## Restricciones
- No toques nada del backend (los 3 endpoints ya están listos y verificados).
- No le agregues al detalle del negocio nada de crear/editar/borrar usuario — **solo ver + resetear password**, eso es todo lo que pide esta fase.
- `UserCredentialsModal`/`downloadCredentials.ts` no se tocan — son genéricos, reusalos tal cual.
- Diseño: clases `ta-*`, sin `.module.css` nuevo para la página nueva (los `.module.css` que quedan en `super-admin/` son de páginas viejas que no siguen este patrón — no repitas esa convención).

## Entregable / verificación
1. `npm run typecheck` y `npm run build` → limpios.
2. Contá qué se ve, con el backend real corriendo:

| # | Caso | Esperado |
|---|---|---|
| 1 | Click en una fila de la tabla de negocios | Navega a `/super-admin/tenants/{id}` |
| 2 | Click en el botón de editar (ícono lápiz) de una fila | Abre el modal de edición, **no** navega |
| 3 | Página de detalle, tab Resumen | Métricas correctas para ESE negocio |
| 4 | Tab Usuarios | Solo usuarios de ese negocio, nunca de otro |
| 5 | Click en un usuario → restablecer contraseña | Se abre `UserCredentialsModal` con la contraseña nueva, mismos datos correctos (rol, identificador de login) |
| 6 | Descargar el PDF desde ese modal | El PDF trae el logo de El Vuelto + el logo del negocio correcto + las credenciales correctas |
| 7 | Ir a `/super-admin/users` a mano | 404 / redirige — la ruta ya no existe |
| 8 | Sidebar de super-admin | Sin entrada "Usuarios" |
| 9 | `QuickActions` en el home de super-admin | Sin botón roto |

3. Veredicto ✅ / 🔴.

**Doble actualización:** `el_vuelto_frontend/CLAUDE.md` — sección `features/super-admin/` (o donde corresponda): documentar `TenantDetailPage`, que reemplaza al módulo Usuarios, y que reusa `UserCredentialsModal` tal cual.

> [!warning] Si algo no cuadra
> Pará y reportá con `archivo:línea`. El backend fue verificado hoy (2026-08-09) — si al integrarlo ves un shape de respuesta distinto al de arriba, el código del backend manda, decilo en el reporte.
