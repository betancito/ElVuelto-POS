---
tags: [prompt, cleanup, frontend, backend, d4]
status: 🟢
updated: 2026-08-03
---

# Prompt DEV — Limpieza D-4 (código muerto + deps + ruta /test)

**Cierra 3 tareas:** [[FRONT-20260802-borrar-codigo-muerto]] · [[BACKEND-20260802-limpiar-deps]] · [[FRONT-20260802-cerrar-ruta-test]]
**Alcance:** SOLO estas 3 limpiezas. Borrados con `grep`-antes-de-borrar. No scope creep. No git.

> Anclajes reconfirmados 2026-08-03; confírmalos al abrir (el archivo es la verdad).

## Parte A — Borrar 2 shims muertos (frontend)
`grep` confirma **0 importadores** de:
- `el_vuelto_frontend/src/layouts/SuperAdminLayout.tsx` (re-export; el router usa el de features en `router.tsx:8`).
- `el_vuelto_frontend/src/features/tenants/TenantsPage.tsx` (re-export; el router usa el de super-admin en `router.tsx:18`).

Pasos: `grep -rn "layouts/SuperAdminLayout" src` y `grep -rn "features/tenants/TenantsPage" src` → confirmar 0 → **borrar ambos archivos**.
**NO borrar** `src/features/tenants/tenantsApi.ts` (VIVO: `StaffLoginPage.tsx`, `home/components/StatsGrid.tsx`, `super-admin/tenants/index.tsx`).

## Parte B — Deduplicar cloudinary + quitar python-escpos (backend)
En `el_vuelto_backend/requirements.txt`:
- Quitar la línea **duplicada** de `cloudinary==1.44.2` (`:9-10` → dejar UNA).
- Quitar `python-escpos==3.1` (`:7`) — `grep -rn "escpos" apps --include='*.py'` = **0 usos** (reconfirmar).

## Parte C — Quitar la ruta /test sin guard (frontend)
En `el_vuelto_frontend/src/app/router.tsx`:
- Quitar la ruta `{ path: '/test/color-bends', ... }` (`:107`) y su import (`:12`).
- Borrar también la page muerta `src/features/test/ColorBendsTestPage.tsx`.
- **NO borrar** `src/components/ui/ColorBends.tsx`: está VIVO (`SuperAdminLoginPage.tsx:16,56`). Solo la page/ruta de test mueren.

## Restricciones
- Solo los archivos citados. Stack inmutable. Grep-antes-de-borrar en cada parte.
- **Doble actualización (docs que mentían):**
  - `el_vuelto_frontend/CLAUDE.md`: sección Layouts (aclarar que `LayoutContext`/layout canónico vive donde el router importa) y tabla de Routing (sin la fila `/test/color-bends`).
  - `el_vuelto_backend/CLAUDE.md` **y** `CLAUDE.md` raíz: corregir la afirmación de "impresión ESC/POS en backend" (python-escpos ya no es dependencia; los recibos se generan en el front — `printReceipt.ts`/`generateReceipt.ts`). Quitar `python-escpos` de la lista de dependencias del backend/CLAUDE.

## Entregable / verificación (salida REAL)
- Frontend: `npm run typecheck` **y** `npm run build` → limpios (pegar salida). Grep post-borrado: 0 referencias a los archivos eliminados.
- Backend: `pip install -r requirements.txt` sin error; `grep -rn escpos apps --include='*.py'` = 0; `grep -c "cloudinary==1.44.2" requirements.txt` = 1.
- Veredicto ✅ / 🔴 con la evidencia.
