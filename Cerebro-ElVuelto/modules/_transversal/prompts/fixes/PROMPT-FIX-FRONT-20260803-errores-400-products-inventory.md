---
tags: [prompt, frontend, fix, forms]
status: 🟢
updated: 2026-08-03
---

# Prompt DEV — Aplicar applyServerErrors en ProductsPage e InventoryPage

**Completa:** [[FRONT-20260802-errores-400-silenciados]] · **Sigue de:** [[RUN-20260803-errores-400-helper]]
**Alcance:** aplicar el helper YA existente a dos pantallas más. No scope creep. No git.

## Contexto
El helper `src/utils/applyServerErrors.ts` ya existe y se aplicó en `UsersPage` y `tenants`. Falta en:
- `src/features/products/ProductsPage.tsx` — forms de **producto** y **categoría** (ver riesgo `modules/products/riesgos/errores-400-swallowed-en-forms`).
- `src/features/inventory/InventoryPage.tsx` — form del **MovementModal** (ver riesgo `modules/inventory/riesgos/errores-servidor-silenciados`).

## Anclas verificadas (2026-08-03, contra código real)
Grep: `applyServerErrors` hoy solo se importa en `users/UsersPage.tsx` y `super-admin/tenants/index.tsx`. Los tres forms objetivo ya llaman la mutación con `.unwrap()`, así que el reject llega al `catch` — **solo falta la llamada al helper**:
- `ProductsPage.tsx:204-206` — `catch` del form de **producto**: hoy `console.error(err)` únicamente. Mutaciones con `.unwrap()` en `:189/192/199`.
- `ProductsPage.tsx:622-624` — `catch` del form de **categoría**: hoy `console.error(err)` únicamente. Mutaciones con `.unwrap()` en `:607/610/617`.
- `InventoryPage.tsx:249-255` — `onSubmit` del **MovementModal**: `catch {}` **vacío** en `:254` (traga todo). Mutación `createMovement(data).unwrap()` en `:251`.
(Líneas aproximadas; confírmalas al abrir el archivo — el archivo es la verdad.)

## Qué hacer
1. **ProductsPage.tsx:** en el `catch` del submit de producto y del de categoría, usar `applyServerErrors(err, setError, fallback)` con el `setError` del `useForm` correspondiente (destructurarlo). Confirmar que las mutaciones usan `.unwrap()` (`createProduct`/`updateProduct`/`createCategory`/`updateCategory`); si no, agregarlo para que el error llegue al `catch`.
2. **InventoryPage.tsx:** en el `catch` del submit del `MovementModal`, usar `applyServerErrors(err, setError, fallback)`. Confirmar `.unwrap()` en `createMovement`.
3. Nombres de campo del back (snake) deben calzar con los `name` de RHF: `barcode`, `precio_costo`, `proveedor`, `nombre`, `tipo`, `cantidad`, `tipo_movimiento`.

## Restricciones
- **Reusar** el helper existente; no duplicar lógica ni tocar `applyServerErrors.ts` (salvo que falte un caso real, y si lo tocas, explícalo).
- No cambiar el contrato de la API.

## Entregable / verificación
- `npm run typecheck` → limpio (pegar salida).
- Prueba manual: crear un producto `CON_CODIGO` sin `barcode` → el error del backend aparece **bajo el campo barcode** (no toast genérico). Registrar un movimiento `AJUSTE` con `cantidad` 0 → error visible.
- **Doble actualización:** en `frontend/CLAUDE.md`, dejar constancia de que el patrón `applyServerErrors` aplica a **todos** los forms (users, tenants, products, inventory). Veredicto ✅/🔴.
