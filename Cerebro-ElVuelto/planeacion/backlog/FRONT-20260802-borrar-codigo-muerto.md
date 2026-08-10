---
tags: [tarea, frontend, limpieza]
status: 🟢
prioridad: alta
updated: 2026-08-03
---

> [!decision] 🟢 RESUELTO 2026-08-03 — shims `layouts/SuperAdminLayout.tsx` y `features/tenants/TenantsPage.tsx` borrados (0 importadores); `tenantsApi.ts` conservado. typecheck+build OK. ([[PROMPT-FIX-CLEANUP-20260803-d4-codigo-muerto-deps-ruta-test]])

# FRONT-20260802-borrar-codigo-muerto — Eliminar shims muertos

**Tipo:** limpieza · **Sprint:** [[Sprint-2026-08-02-estabilizacion-doc]] · **Decisión:** D-4

## Problema
Dos shims de re-export sin importadores:
- `el_vuelto_frontend/src/layouts/SuperAdminLayout.tsx` (re-exporta `@/features/layout/super-admin`; el router usa el de features directamente, `router.tsx:8`).
- `el_vuelto_frontend/src/features/tenants/TenantsPage.tsx` (re-exporta `@/features/super-admin/tenants`; el router usa el de super-admin, `router.tsx:18`).

## Criterio de aceptación
Ambos archivos eliminados. `npm run typecheck` y `npm run build` pasan. `grep` confirma 0 importadores antes de borrar.

## Notas para el Dev
- **NO borrar** `src/features/tenants/tenantsApi.ts`: está VIVO (lo importan `StaffLoginPage.tsx:6`, `home/components/StatsGrid.tsx:1`, `super-admin/tenants/index.tsx:10`).
- Confirmar con grep que nadie importa `layouts/SuperAdminLayout` ni `features/tenants/TenantsPage`.
- Doble actualización: `frontend/CLAUDE.md` (sección Layouts) — aclarar que `LayoutContext` canónico vive en `src/layouts/`.
