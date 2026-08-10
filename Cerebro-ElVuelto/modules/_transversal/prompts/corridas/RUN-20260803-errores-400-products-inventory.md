---
tags: [corrida, frontend, review, forms]
status: cerrado
updated: 2026-08-03
---

# RUN 2026-08-03 — PROMPT-FIX-FRONT-…-errores-400-products-inventory

**Prompt:** [[PROMPT-FIX-FRONT-20260803-errores-400-products-inventory]] · **Veredicto:** 🟢 PASÓ · **Ítem:** [[FRONT-20260802-errores-400-silenciados]] (avanza; **NO** se cierra — falta POS)

## Qué hizo el Dev (git diff, working tree)
- `ProductsPage.tsx`: importó `applyServerErrors` (`:18`); destructuró `setError` en el form de producto (`:125`) y de categoría (`:563`); reemplazó `console.error(err)` por `applyServerErrors(err, setError, fallback)` en ambos `catch` (`:206`, `:627`). Mutaciones ya usaban `.unwrap()`.
- **Bug real cazado (en alcance):** los campos `precio_costo`/`barcode`/`proveedor` NO renderizaban `<span className="ta-field-error">`, así que el `setError` sería invisible. Agregó los tres spans (`:507`, `:517`, `:522`). Sin esto, el criterio de aceptación (error bajo el campo `barcode`) NO se cumpliría.
- `InventoryPage.tsx`: importó el helper (`:13`); destructuró `setError` en el `MovementModal` (`:229`); reemplazó el `catch {}` vacío por `applyServerErrors(...)` (`:253-255`).
- `frontend/CLAUDE.md`: actualizado — el patrón cubre ahora todos los forms admin; documenta que el campo debe renderizar su span para que el error sea visible.

## Review del Planner (código real, no reporte)
- ✅ Wiring correcto: los 3 `catch` mapean el 400 por campo; los 3 forms ya usaban `.unwrap()` (el reject llega al catch).
- ✅ **Cobertura de spans completa** — cada campo que puede recibir 400 renderiza `ta-field-error`: producto `nombre:424`/`precio_venta:494`/`precio_costo:507`/`barcode:517`/`proveedor:522`; categoría `nombre:752`; movimiento `product:290`/`cantidad:366`/`precio_costo:383`.
- ✅ Reusó el helper sin tocar `applyServerErrors.ts`. Clases `ta-*` directas (patrón de diseño). Nombres snake calzan con las keys del back.
- ✅ Verifiqué `npm run typecheck` → **exit 0** (limpio).
- ✅ Doble actualización hecha (`frontend/CLAUDE.md`). Sin git. Sin scope creep.
- ⚠️ Verificación runtime manual (crear producto CON_CODIGO sin barcode) no capturada por el Dev; el camino código→setError→span quedó trazado estáticamente y es correcto.
- ⚠️ El ítem [[FRONT-20260802-errores-400-silenciados]] **sigue 🟡**: su criterio incluye el **POS** (`PosPage.tsx:270-272`), no cubierto aquí. Queda como follow-up (se atará al surface del 400 de `monto_recibido` del guard de ventas).

**Veredicto: 🟢 corrido-ok.**
