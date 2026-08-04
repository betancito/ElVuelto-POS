---
tags: [corrida, frontend, review, forms]
status: cerrado
updated: 2026-08-03
---

# RUN 2026-08-03 — PROMPT-FIX-FRONT-…-errores-400-helper

**Prompt:** [[PROMPT-FIX-FRONT-20260802-errores-400-helper]] · **Veredicto:** 🟢 PASÓ · **Ítem:** [[FRONT-20260802-errores-400-silenciados]] (parcial 🟡)

## Qué hizo el Dev (git diff)
- Nuevo `src/utils/applyServerErrors.ts`: mapea el 400 por campo a `setError`, `non_field_errors`/`detail` → toast, y muestra fallback en 500/red (nada se traga en silencio). Tipado con `UseFormSetError<T>`/`Path<T>`.
- `UsersPage.tsx`: reemplazó los `catch {}` vacíos por `applyServerErrors(err, setError|setEditError, ...)` en crear (`:120`) y editar (`:148`). Ambas mutaciones usan `.unwrap()` (`:109`, `:146`).
- `super-admin/tenants/index.tsx`: reemplazó los toast genéricos por `applyServerErrors(...)` en crear (`:68`) y editar (`:92`).
- `frontend/CLAUDE.md` actualizado.

## Review del Planner
- ✅ Helper correcto y reutilizable; los submits usan `.unwrap()`, así el error llega al `catch`. Nombres de campo del back (snake) calzan con los `name` de RHF.
- ✅ Verifiqué `npm run typecheck` → **exit 0** (limpio).
- ⚠️ Alcance parcial (declarado en el prompt, no cap silencioso): falta aplicar el helper en `ProductsPage` e `InventoryPage` → [[PROMPT-FIX-FRONT-20260803-errores-400-products-inventory]].

**Veredicto: 🟢 corrido-ok.**
