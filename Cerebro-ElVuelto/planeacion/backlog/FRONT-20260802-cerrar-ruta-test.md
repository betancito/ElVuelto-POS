---
tags: [tarea, frontend, seguridad]
status: 🟢
prioridad: alta
updated: 2026-08-03
---

> [!decision] 🟢 RESUELTO 2026-08-03 — ruta `/test/color-bends` + import fuera de `router.tsx`; page `ColorBendsTestPage.tsx` borrada. Componente `components/ui/ColorBends.tsx` conservado (vivo en `SuperAdminLoginPage`). build OK. ([[PROMPT-FIX-CLEANUP-20260803-d4-codigo-muerto-deps-ruta-test]])

# FRONT-20260802-cerrar-ruta-test — Quitar/proteger /test/color-bends

**Tipo:** seguridad · **Sprint:** [[Sprint-2026-08-02-estabilizacion-doc]] · **Decisión:** D-4

## Problema
`/test/color-bends` está registrada sin guard en `el_vuelto_frontend/src/app/router.tsx:107` (import en `:12`). Demo pública en producción. Ver [[riesgo-ruta-test-sin-guard]].

## Criterio de aceptación
La ruta ya no es accesible en producción (eliminada o detrás de guard). `npm run build` pasa.

## Notas para el Dev
- Quitar la ruta `:107` y el import `:12`.
- Evaluar si borrar también `src/features/test/ColorBendsTestPage.tsx` y el componente `components/ui/ColorBends.tsx` (❓ confirmar con grep que `ColorBends` no se usa en otra parte antes de borrarlo).
- Doble actualización: `frontend/CLAUDE.md` (tabla de routing).
