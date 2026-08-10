---
tags: [prompt, frontend, fix, forms, pos]
status: 🟢
updated: 2026-08-03
---

# Prompt DEV — Mostrar el error real del 400 en el POS (cierra errores-400)

**Completa (última pieza):** [[FRONT-20260802-errores-400-silenciados]] · **Sigue de:** [[RUN-20260803-errores-400-products-inventory]]
**Alcance:** UNA cosa — que el banner del POS muestre el error real del backend en vez de un genérico. No scope creep. No git.

## Contexto mínimo necesario
- Leer: `el_vuelto_frontend/CLAUDE.md` (Server-side form errors), `src/features/sales/PosPage.tsx` (`handleCobrar`), `src/utils/applyServerErrors.ts`, y `apps/sales/serializers.py` (formas del 400).
- **Ojo:** el POS **no** es un form de react-hook-form (es un carrito manual), así que `applyServerErrors` (que llama `setError`) **no** aplica aquí. Necesitas extraer el mensaje del 400 y meterlo al banner `saleError`.

## El bug (anclado)
- `handleCobrar` (`PosPage.tsx:252-273`) hace `createSale(...).unwrap()` (`:266`), pero el `catch` (`:270-272`) siempre setea un genérico: `setSaleError('Hubo un error al registrar la venta...')`. El banner lo pinta en `:392`.
- Así se **tragan** los errores útiles del 400, sobre todo los de stock: el backend devuelve `{"items": ["Stock insuficiente para 'X': disponible N, solicitado M.", ...]}` (`apps/sales/serializers.py:97-102`) y también puede dar `{"monto_recibido": "..."}` (guard nuevo) o `{"non_field_errors":[...]}`/`{"detail":"..."}`.

## Qué hacer (pasos)
1. En el `catch (err)` de `handleCobrar`, extraer el mensaje real del cuerpo del 400 (RTK Query: `err.data` cuando `err.status === 400`) y setearlo en `saleError`. Prioridad de campos: `items` (une el array con " · "), luego `monto_recibido`, luego `non_field_errors`/`detail`. Si no hay 400 con cuerpo reconocible (500, red), usa el genérico actual como fallback.
2. Reusa lo que puedas: si te sirve, factoriza un helper `getServerErrorMessage(err, fallback)` en `applyServerErrors.ts` (mismo parseo del 400, pero devolviendo `string` en vez de llamar `setError`) y úsalo aquí; si prefieres inline en `handleCobrar`, también vale — pero no dupliques el parseo del status/estructura si ya lo puedes compartir.
3. No cambies `cobrarDisabled` ni la lógica de la venta.

## Restricciones
- Solo `PosPage.tsx` (y opcionalmente `applyServerErrors.ts` si factorizas el helper). Stack inmutable.
- No inventes claves: usa exactamente `items` / `monto_recibido` / `non_field_errors` / `detail`.
- **Doble actualización:** en `el_vuelto_frontend/CLAUDE.md` anotar que el POS ya surfacea el 400 de venta (items/stock, monto, non_field) en su banner → con esto el ítem [[FRONT-20260802-errores-400-silenciados]] queda **cerrado**.

## Entregable / verificación
- `npm run typecheck` → limpio (pegar salida).
- Prueba manual (si levantas el front): vender más unidades que el stock de un `CON_CODIGO` → el banner muestra **"Stock insuficiente para 'X'…"**, no el genérico.
- Veredicto ✅ / 🔴 con la evidencia.
