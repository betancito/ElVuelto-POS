---
tags: [corrida, frontend, review, forms, pos]
status: cerrado
updated: 2026-08-03
---

# RUN 2026-08-03 — PROMPT-FIX-FRONT-…-errores-400-pos

**Prompt:** [[PROMPT-FIX-FRONT-20260803-errores-400-pos]] · **Veredicto:** 🟢 PASÓ · **Ítem:** [[FRONT-20260802-errores-400-silenciados]] → **CERRADO** (todas las superficies)

## Qué hizo el Dev (git diff)
- `applyServerErrors.ts`: extrajo `parse400Body(error)` (check de `status===400` + forma) a un helper compartido, y añadió `getServerErrorMessage(error, fallback)` que devuelve un `string` con prioridad `items` (join " · ") → `monto_recibido` → `non_field_errors`/`detail` → fallback. `applyServerErrors` ahora usa `parse400Body` (sin duplicar el check).
- `PosPage.tsx`: `handleCobrar` `catch (err)` → `setSaleError(getServerErrorMessage(err, <genérico>))` (`:271-273`).

## Review del Planner
- ✅ Refactor DRY correcto: un solo dueño del check de 400; forms y POS lo comparten. `applyServerErrors` sin regresión (misma lógica).
- ✅ `getServerErrorMessage` cubre las formas reales del 400 de venta: stock `{"items":[str]}` (`sales/serializers.py:97-102`), guard `{"monto_recibido":[str]}`, `non_field_errors`/`detail`; 500/red → fallback.
- ✅ `npm run typecheck` → limpio. Doble actualización en `frontend/CLAUDE.md` (nota "Non-form surfaces (POS)"). Sin scope creep.
- ℹ️ Residual menor (no bloqueante): si `items` viniera como lista de dicts por-ítem (validación de campo de `SaleItemInputSerializer`, p.ej. `cantidad`), el filtro a strings los omite → caería al fallback. En la práctica el carrito garantiza `cantidad>=1`, así que no ocurre por UI.

**Veredicto: 🟢 corrido-ok.**
