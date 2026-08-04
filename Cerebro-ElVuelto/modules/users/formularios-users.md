---
tags: [modulo, formularios]
status: vivo
module: users
updated: 2026-08-02
---

# Users — Auditoría de formularios

4 formularios: **Crear usuario**, **Editar usuario** (ambos en `UsersPage`), **Perfil · info** y **Perfil · contraseña** (en `ProfilePage`).

---

## 1. Crear usuario — modal en `UsersPage`

- **Componente:** `features/users/UsersPage.tsx:284-391` (form `:297`) · **Modo:** crear
- **Schema Zod:** `schema` `:34-40` · **estático** · `zodResolver` `:74` · `mode` por defecto (onSubmit)
- **`defaultValues`:** `{ rol:'CAJERO', lead_cashier:false }` (`:75`) — form vacío, sin `reset()` desde datos
- **Estructura dinámica:** `rol` con radios (role cards); `watch('rol')` (`:86`) alterna el campo de login: ADMIN→`correo` (`:338-343`), CAJERO→`cedula` (`:344-350`); checkbox `lead_cashier` **solo** si CAJERO (`:353-367`)
- **Submit:** `onSubmit` `:97-119` → genera password (CAJERO `generatePin()` / else `generateAdminPassword()`, `:98`) → `createUser` (`POST /users/`) → en éxito `reset()`, cierra modal, abre `UserCredentialsModal`. `lead_cashier` se fuerza `false` si no es CAJERO (`:103`)
- **Errores del servidor:** ⚠️ **`catch {}` vacío** (`:118`) — los 400 por campo (correo/cédula requeridos o duplicados) **se pierden**; no hay `setError` ni toast. → [[errores-silenciosos-formularios-usuarios]]

### Matriz de paridad

| campo | Zod | RHF | tipo TS | serializer DRF | modelo Django | constraint BD | ⚠️ divergencia |
|---|---|---|---|---|---|---|---|
| `nombre` | `string min2` (`:35`) | req. | `string` | requerido (`:154`) | `CharField(200)` no-null | — | máx: Zod sin `max`, BD 200 |
| `rol` | `enum ADMIN|CAJERO` (`:36`) | radio | `'ADMIN'|'CAJERO'` | `validate_rol` prohíbe SUPERADMIN (`:157`) | choices 3 | — | TS/Zod excluyen SUPERADMIN (ok, no se crea) |
| `correo` | `email|''` **opcional** (`:37`) | condicional ADMIN | `string?` | `required=False`; **exigido si ADMIN** (`:171`) | `EmailField` null/blank | `unique` global | Zod no exige por rol → 400 solo en back |
| `cedula` | `string` **opcional**, sin formato (`:38`) | condicional CAJERO | `string?` | `required=False`; **exigido si CAJERO** (`:169`) | `CharField(20)` null/blank | único por tenant | sin validación numérica ni `max` en front (P-5) |
| `lead_cashier` | `bool?` (`:39`) | checkbox | `bool?` | en fields (`:154`) | `BooleanField` def False | — | front lo fuerza `false` si no CAJERO (`:103`) |
| `password` | ❌ no está en Zod | ❌ autogenerado (`:98`) | `string` (en args) | write_only `min4` (`:148`) | `password` hash | — | nunca lo teclea el usuario |
| `activo` | ❌ | ❌ | `boolean` (User) | en fields, def True | def True | — | no se envía al crear → default |

---

## 2. Editar usuario — modal en `UsersPage`

- **Componente:** `UsersPage.tsx:393-494` (form `:407`) · **Modo:** editar
- **Schema Zod:** `editSchema` `:42-48` — **idéntico** a `schema` (duplicado) · `zodResolver` `:84`
- **`defaultValues`:** vía `resetEdit(...)` en `handleOpenEdit` (`:121-130`) con datos del user; `correo/cedula` → `?? ''`
- **Estructura dinámica:** igual que crear (`watchEdit('rol')` `:87`)
- **Submit:** `onEditSubmit` `:132-145` → `updateUser` (`PATCH /users/{id}/`) con `nombre, rol, correo, cedula, lead_cashier` — **sin `password`** (se cambia por el botón "restablecer"). `catch {}` vacío (`:144`)
- **Errores del servidor:** ⚠️ mismos silenciados que crear.

### Matriz de paridad
Misma que "Crear" salvo: **no envía `password`**; `correo/cedula` se mandan `trim()||undefined` (`:139-140`) ⇒ al omitir uno, `UserCreateSerializer.validate` lo **nulifica** (`ser:190-191`). Mitigado porque el form manda el campo del rol activo. → [[patch-nulifica-campos-omitidos]]

---

## 3. Perfil · información personal — `ProfilePage`

- **Componente:** `ProfilePage.tsx:122-157` (form `:126`) · **Modo:** editar (self)
- **Schema Zod:** `infoSchema` `:13-16` · estático · `zodResolver` `:56`
- **`defaultValues`:** `{ nombre: user.nombre, correo: user.correo }` desde Redux (`:57`) — ⚠️ si el user cambia en Redux tras montar, no hay `reset()` → puede quedar stale
- **Submit:** `onInfoSubmit` `:62-76` → `updateMe({nombre, correo})` (`PATCH /auth/me/update/`) → despacha `updateUser` a Redux (solo `nombre`+`correo`, `authSlice:52-60`)
- **Errores del servidor:** ✅ **sí** se mapean vía `fieldError` (`:32-42`) → `infoServerError` (`:70-74`); fallback genérico

### Matriz de paridad

| campo | Zod | RHF | tipo TS | back (UpdateMeView) | modelo | constraint | ⚠️ |
|---|---|---|---|---|---|---|---|
| `nombre` | `string min2` (`:14`) | req. | `string?` (`UpdateMeArgs`) | `≥2` a mano (`views.py:47`) | `CharField(200)` | — | paridad ok |
| `correo` | `email|''` opcional (`:15`) | opc. | `string?` | único global exclude self (`views.py:55`) | `EmailField` unique | `unique` | envía `correo ?? ''` (`:66`); `""`→`None` en back (`:54`) |

---

## 4. Perfil · cambiar contraseña — `ProfilePage`

- **Componente:** `ProfilePage.tsx:160-206` (form `:164`) · **Modo:** cambio de password (self)
- **Schema Zod:** `passwordSchema` `:19-29` · `refine` confirma coincidencia (`:25-28`) · `zodResolver` `:85`
- **Submit:** `onPwSubmit` `:91-110` → `updateMe({current_password, new_password})` → en éxito `resetPw()`, muestra éxito, **cierra sesión** (`logout()`+`/login`) tras 2s (`:99-102`)
- **Errores del servidor:** ✅ `setError` por campo (`current_password`/`new_password`, `:104-108`)

### Matriz de paridad

| campo | Zod | back | ⚠️ |
|---|---|---|---|
| `current_password` | `min1` (`:21`) | `check_password` (`views.py:64`) | 400 si incorrecta |
| `new_password` | `min6` (`:23`) | `min6` a mano (`views.py:70`) | paridad front↔back en 6 ✅, pero difiere del `min4` de creación (`ser:148`) → [[reglas-password-divergentes]] |
| `confirm_password` | igual a new (`:25-28`) | ❌ no viaja al back | validación solo front |

---

## ⚠️ Divergencias detectadas (priorizadas)
1. 🔴 **Errores 400 tragados** en crear/editar usuario (`UsersPage.tsx:118,144`) ↔ backend devuelve errores por campo (`ser:170,172,182,188`). El perfil (`ProfilePage`) **sí** los mapea. → [[errores-silenciosos-formularios-usuarios]]
2. 🔴 **Requerido por rol solo en el back**: Zod marca `correo`/`cedula` opcionales (`UsersPage:37-38`) pero el serializer los exige según rol (`ser:169-172`). Sumado a (1), el usuario no ve el error.
3. 🔴 **Password min divergente**: crear `min4` (`ser:148`) vs perfil `min6` (`views.py:70`/`ProfilePage:23`) vs autogenerado admin 12 (front) / 10 (reset back). → [[reglas-password-divergentes]]
4. 🟡 **PATCH nulifica** `correo`/`cedula` omitidos (`ser:190-191`). → [[patch-nulifica-campos-omitidos]]
5. 🟡 **`cedula` sin validación de formato** en ningún lado (P-5); solo `max_length=20` en BD.

## ❓ Por confirmar
- ¿El backend responde `non_field_errors` en algún caso de estos forms? Todos los errores vistos son por-campo (`{campo:"msg"}`); `fieldError` (`ProfilePage:32-42`) no cubre `non_field_errors`. → P-2 en [[preguntas-users]]
