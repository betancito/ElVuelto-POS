---
tags: [corrida, tenancy, users, super-admin, front, feature]
status: 🟢 corrido-ok
module: tenancy
updated: 2026-08-09
---

# RUN 2026-08-09 — Página de detalle del negocio, front (fase 2/2)

**Prompt:** [[PROMPT-FEAT-TENANCY-20260809-frontend-tenant-detail-page]]
**Tarea:** [[SUPERADMIN-20260809-pagina-detalle-negocio]] · **Épica:** [[EPIC-20260809-superadmin-gestion-tenants]]
**Veredicto:** ✅ **PASÓ** — `typecheck`+`build` reales, props de cada componente reusado verificadas contra su código fuente, y trazado completo de los 9 casos de aceptación. **Verificación visual en navegador: no ejecutada** (Chrome no está conectado en este entorno — se ofreció, no está disponible). No se probó el click final de "Restablecer contraseña" contra datos reales del seed para no mutar credenciales que el humano usa a mano; el endpoint que dispara ya se verificó de punta a punta en la corrida de backend ([[RUN-20260809-endpoints-superadmin-tenant-scoped]]).

## Qué se entregó
- `TenantDetailPage.tsx` (nueva) — header del negocio (reusa `getTenant(id)`, ya existente) + tabs Resumen/Usuarios (mismo patrón que `ProductsPage`) + modal de confirmación de reset + `UserCredentialsModal` reusado tal cual.
- `tenantsApi.ts` — 3 endpoints nuevos (`getTenantUsers`, `getTenantMetrics`, `resetTenantUserPassword`) con tags por tenant, y un `transformResponse` defensivo en `getTenantUsers` (mismo patrón que `listSales`/`listUsers` por si la paginación global se activa algún día).
- `TenantsTable.tsx` — fila clickeable con navegación, **con paridad de teclado** (`tabIndex`, `role="button"`, `onKeyDown` Enter/Space) — no pedido explícitamente, mejora de accesibilidad razonable sobre lo mínimo. Botón de editar con `e.stopPropagation()`, exactamente como se pidió.
- Borrado completo: `features/super-admin/users/` (4 archivos), ruta `/super-admin/users`, entrada "Usuarios" del sidebar (+ import de ícono ahora sin uso), y el botón de `QuickActions` repointado a `/super-admin/tenants` en vez de quedar roto.
- Doble actualización: `el_vuelto_frontend/CLAUDE.md` — sección `features/super-admin/` completamente reescrita, tabla de rutas actualizada.

## Verificación ejecutada
- `npm run typecheck` → limpio.
- `npm run build` → `✓ built in 4.29s` (mismo warning preexistente de tamaño de chunk, no relacionado).
- `grep -rn "SAUsersPage|SAUsersPlaceholder|super-admin/users" src/` → **0 resultados** — cero referencias colgantes al módulo borrado.
- Verifiqué los 3 componentes reusados (`Modal`, `PageLoader`, `Button`) contra su código fuente real: `isOpen/onClose/size`, `show`, `loading` — todas las props que usa `TenantDetailPage` existen tal cual. El `typecheck` limpio ya lo confirmaba, pero lo crucé a mano igual.

## Los 9 casos, trazados contra el código
| # | Caso | Resultado |
|---|---|---|
| 1 | Click en fila → navega | `TenantsTable` `onOpen` → `TenantsPage` `navigate(/super-admin/tenants/${t.id})` |
| 2 | Click en editar → NO navega | `e.stopPropagation()` en el botón, antes de `onEdit` |
| 3 | Tab Resumen, métricas correctas | `useGetTenantMetricsQuery(id)` → mismo endpoint ya verificado 13/13 en el backend |
| 4 | Tab Usuarios, solo de ese tenant | `useGetTenantUsersQuery(id)` → mismo endpoint, mismo guard ya verificado |
| 5 | Reset → `UserCredentialsModal` correcto | `handleReset` arma `tenantNombre/tenantLogoUrl` del tenant en pantalla, `userName/rol` del usuario, `loginIdentifier` vía helper correo/cédula por rol, `password` de la respuesta |
| 6 | PDF con logos y credenciales correctas | Depende de `downloadUserCredentialCard`, sin cambios — ya genérico y verificado en corridas anteriores |
| 7 | `/super-admin/users` ya no existe | Ruta borrada de `router.tsx`, confirmado por grep |
| 8 | Sidebar sin "Usuarios" | `NAV_ITEMS` sin esa entrada, import de `PersonIcon` retirado |
| 9 | `QuickActions` sin botón roto | Repointado a `/super-admin/tenants`, con comentario explicando por qué |

## Checklist de trampas
**#3 tags RTK**: `getTenantUsers`/`getTenantMetrics` etiquetados por tenant (`tenant-${id}`, `metrics-${id}`) para no invalidar entre negocios distintos; `resetTenantUserPassword` no invalida nada a propósito (no cambia ningún campo que la lista muestre) — decisión razonada, no un olvido. **#6 diseño**: `ta-*` puro, sin `.module.css` nuevo. **#7 errores**: `.unwrap()` del reset con `try/catch` + toast, mismo patrón que `UsersPage.handleReset`. **#10 doble actualización**: ✅. **#11**: sin git, sin scope creep — no se agregó crear/editar/borrar usuario, tal como pedía el alcance.

## Cierra
[[SUPERADMIN-20260809-pagina-detalle-negocio]] → 🟢, **ambas fases completas**. [[EPIC-20260809-superadmin-gestion-tenants]] → 🟢 cerrada.
