---
tags: [tarea, frontend, forms, ux]
status: 🟡
prioridad: alta
updated: 2026-08-03
---

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
- 🔴 Falta aplicarlo en `ProductsPage` e `InventoryPage` → [[PROMPT-FIX-FRONT-20260803-errores-400-products-inventory]].
