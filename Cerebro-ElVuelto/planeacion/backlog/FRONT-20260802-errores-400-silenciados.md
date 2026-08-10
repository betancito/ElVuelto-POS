---
tags: [tarea, frontend, forms, ux]
status: 🟢
prioridad: alta
updated: 2026-08-03
---

> [!decision] 🟢 CERRADO 2026-08-03 — todas las superficies cubiertas: forms (users, tenants, products, inventory vía `applyServerErrors`) + POS (banner vía `getServerErrorMessage`, [[RUN-20260803-errores-400-pos]]).

# FRONT-20260802-errores-400-silenciados — Mapear errores 400 por campo (transversal)

**Tipo:** UX / consistencia · **Descubierto:** auditoría de módulos 2026-08-02 (patrón repetido en 5 módulos)

## Problema
Varios formularios se **tragan** el 400 por campo del backend en un toast/banner genérico o un `catch {}` vacío, sin mapearlo a `setError` de RHF:
- users: `catch` vacío en crear/editar (`features/users/UsersPage.tsx:118,144`).
- tenancy: toast genérico (`features/super-admin/tenants/index.tsx:67-69,91-93`).
- sales/POS: banner genérico, no dice qué producto falló (`features/sales/PosPage.tsx:270-272`).
- products / inventory: idem (ver `modules/products/riesgos/errores-400-swallowed`, `modules/inventory/riesgos/errores-servidor-silenciados`).
- **Único bien hecho:** `ProfilePage.tsx` sí los mapea.

La unicidad (correo/cedula/nit/barcode) se valida **solo** en el backend → el usuario no sabe qué campo chocó. Ver [[patron-errores-drf-rtk]].

## Criterio de aceptación
Un helper único `applyServerErrors(err, setError)` mapea el 400 por campo a los inputs y los `non_field_errors` a un toast. Aplicado a UsersPage, tenants, POS, ProductsPage, InventoryPage.

## Notas para el Dev
- Una sola utilidad reutilizable; no repetir por form.
- Doble actualización: crear el patrón canónico en `frontend/CLAUDE.md` (o `CLAUDE_FORMS.md`).

## Progreso
- 🟢 Helper `src/utils/applyServerErrors.ts` + aplicado en `UsersPage` y `tenants` ([[RUN-20260803-errores-400-helper]], typecheck OK).
- 🟢 Aplicado en `ProductsPage` (producto + categoría) e `InventoryPage` (MovementModal); el Dev agregó los `ta-field-error` faltantes de `barcode`/`precio_costo`/`proveedor` ([[RUN-20260803-errores-400-products-inventory]], typecheck OK).
- 🔴 **Falta POS** (`features/sales/PosPage.tsx:270-272`, banner genérico) — el criterio de aceptación lo incluye. El ítem sigue 🟡 hasta cubrir POS (se atará al 400 `monto_recibido` del guard de ventas [[SALES-20260802-guard-monto-recibido]]).
