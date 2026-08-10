---
tags: [prompt, users, front, seguridad, password, fix]
status: 🔴
module: users
updated: 2026-08-09
---

# 🔒 Prompt DEV — Mostrar la contraseña rotada cuando se promueve por el modal de edición

**Tarea backlog:** [[USERS-20260809-promocion-no-muestra-password-rotado]]
**Alcance:** front únicamente, 2 archivos: `usersApi.ts` + `UsersPage.tsx`. No backend. No git.

## La invariante

> **Si el servidor rotó la contraseña de alguien, el admin que hizo la acción la ve en pantalla.** Nunca queda una promoción con una credencial que nadie conoce.

## Contexto (ya cerrado, no lo toques)

`apps/users/serializers.py` ya hace esto (verificado ejecutando, ver [[RUN-20260806-promocion-no-rota-credencial]]): cuando un `PATCH` sobre `/api/users/{id}/` sube el rol de forma que el mínimo de contraseña **sube** (CAJERO→ADMIN) y no viene `password` en el body, el backend genera una nueva contraseña acorde al rol nuevo, la guarda, y la devuelve en el JSON de respuesta como `new_password` (string). En cualquier otro caso (sin cambio de rol, democión, o `password` explícita) `new_password` viene `null`.

**No toques el backend.** Esto ya está hecho y probado.

## El problema

`UsersPage.tsx`:
```ts
async function onEditSubmit(data: EditFormData) {
  if (!editUser) return
  try {
    await updateUser({ id: editUser.id, ... }).unwrap()   // ← resultado descartado
    setEditUser(null)
  } catch (err) { ... }
}
```
El `new_password` que el backend devuelve se pierde. El admin cierra el modal sin enterarse de que la cuenta que acaba de promover tiene una contraseña nueva que nadie vio.

Compará con `handleReset` (mismo archivo, unas líneas más abajo), que sí hace lo correcto: guarda el resultado, y si hay contraseña nueva, abre `UserCredentialsModal`.

## Qué hacer

1. **`usersApi.ts`** — la interfaz `User` no declara `new_password`. Agregalo como campo opcional (el backend lo manda `null` casi siempre; solo es string cuando rotó). No cambies la firma de `updateUser` más allá de que ahora tipa ese campo.

2. **`UsersPage.tsx` → `onEditSubmit`** — capturá el resultado de `updateUser(...).unwrap()`. Si `result.new_password` es truthy, abrí `UserCredentialsModal` con los mismos datos que arma `handleReset` (`tenantNombre`, `tenantLogoUrl`, `userName`, `rol`, `loginIdentifier`, `password`, `isReset: true`), usando el `result` (no `data` del form ni el `editUser` viejo) para `rol`/`correo`/`cedula`, porque es el estado que el servidor confirmó. Si `new_password` es `null`/`undefined` (el caso normal: no hubo promoción con rotación), el comportamiento actual no cambia — cerrás el modal de edición y ya.

3. No dupliques lógica: el `loginIdentifier` es `correo` si el rol resultante es ADMIN, `cedula` si es CAJERO — mismo patrón que ya usa `handleReset`/`onSubmit` en este archivo.

## Restricciones
- Solo `usersApi.ts` + `UsersPage.tsx`. Nada de backend, nada de otros features.
- No cambies el comportamiento cuando `new_password` es `null` — cero regresión en la edición normal (cambiar nombre, correo, `lead_cashier`, democión de rol).
- Diseño: `UserCredentialsModal` ya existe, reusalo tal cual (no le agregues props nuevas si no hacen falta).

## Entregable / verificación
1. `npm run typecheck` y `npm run build` → limpios.
2. Contá qué se ve en estos casos (usá el backend real, ya soporta todo esto):

| # | Caso | Esperado |
|---|---|---|
| 1 | Editar un CAJERO con PIN, cambiar `rol` a ADMIN + `correo`, sin tocar contraseña | Se cierra el modal de edición y se abre `UserCredentialsModal` con la contraseña nueva (12 caracteres) |
| 2 | Editar un usuario cambiando solo `nombre` (sin tocar `rol`) | Se cierra el modal de edición; **no** aparece `UserCredentialsModal` (regresión) |
| 3 | Editar un ADMIN bajándolo a CAJERO | Se cierra el modal de edición; **no** aparece `UserCredentialsModal` (regresión — la democión no rota nada) |
| 4 | Crear usuario (flujo normal) | Sigue mostrando el modal de credenciales como siempre (regresión) |
| 5 | "Restablecer contraseña" (`handleReset`) | Sigue funcionando igual (regresión) |

3. Veredicto ✅ / 🔴.

**Doble actualización:** `el_vuelto_frontend/CLAUDE.md` — sección de `features/users/` — que una promoción de rol vía el modal de edición puede rotar la contraseña y que el front la muestra en `UserCredentialsModal` (mismo patrón que reset).

> [!warning] Si algo no cuadra
> Pará y reportá con `archivo:línea`. El comportamiento del backend está verificado ejecutando el 2026-08-09 (ver [[RUN-20260806-promocion-no-rota-credencial]]); si al leer `serializers.py` ves algo distinto, decilo antes de asumir.
