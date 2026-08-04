---
tags: [prompt, frontend, fix, forms]
status: 🔴
updated: 2026-08-02
---

# Prompt DEV — Helper para mapear errores 400 por campo (transversal front)

**Tarea backlog:** [[FRONT-20260802-errores-400-silenciados]] (relacionada: [[USERS-20260802-zod-requeridos-por-rol]])
**Alcance:** crear el helper + aplicarlo en los formularios listados. No scope creep. No git.

## Contexto mínimo necesario
- Leer: [[patron-errores-drf-rtk]], `src/features/users/UsersPage.tsx`, `src/features/super-admin/tenants/index.tsx`, `src/features/users/ProfilePage.tsx` (el **único que ya lo hace bien** — usar como referencia, `fieldError`).
- **Problema:** varios forms se tragan el 400 por campo (toast/banner genérico o `catch {}` vacío): users (`UsersPage.tsx:118,144`), tenants (`index.tsx:67-69,91-93`). La unicidad (correo/cedula/nit) se valida solo server-side, así que el usuario no sabe qué campo chocó.
- **Forma del 400 (DRF):** `{campo: ["msg"]}` o `{campo: "msg"}`; objeto → `non_field_errors`.

## Qué hacer
1. Crear `src/utils/applyServerErrors.ts`: función `applyServerErrors(error, setError)` que, dado un `FetchBaseQueryError` con `status === 400` y `data` tipo `Record<string, string | string[]>`:
   - por cada campo, `setError(campo, { type: 'server', message: Array.isArray(v) ? v[0] : v })`;
   - `non_field_errors` (o `detail`) → `toast.error(...)` (react-toastify, ya instalado `^11.1.0`).
2. Aplicarlo en los `onSubmit`/`catch` de: `UsersPage.tsx` (reemplazar los `catch {}` vacíos), `super-admin/tenants/index.tsx` (crear y editar). Dejar `ProductsPage.tsx` e `InventoryPage.tsx` como siguientes (mencionarlo si no da tiempo — **sin cap silencioso**).
3. Respetar los nombres de campo del backend (español snake): `correo`, `cedula`, `nit`, `nombre`, etc. → deben coincidir con los `name` del form RHF.

## Restricciones
- Un solo helper reutilizable (no repetir la lógica por form).
- No cambiar el contrato de la API ni los mensajes del backend.

## Entregable / verificación
- `npm run typecheck` → sin errores (pegar salida).
- Prueba manual: crear un usuario con un correo ya existente → el error aparece **bajo el campo correo** (no toast genérico). Igual con un tenant de `nit` duplicado.
- **Doble actualización:** documentar el patrón en `frontend/CLAUDE.md` (o proponer `CLAUDE_FORMS.md`). Veredicto ✅/🔴.
