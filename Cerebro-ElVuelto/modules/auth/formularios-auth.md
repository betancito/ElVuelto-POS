---
tags: [modulo, formularios, auditoria]
status: documentado
module: auth
updated: 2026-08-02
---

# Auth — Auditoría de formularios

Cuatro formularios tocan auth. Los 3 de login viven en `features/auth/`; la auto-edición vive en `features/users/ProfilePage.tsx` pero pega a `/auth/me/update/` (backend en scope auth). Anclas a ambos lados.

---

## 1. Login Admin (correo) — `/login`

- **Componente:** `TenantLoginPage.tsx:9` · **Modo:** solo login
- **Schema Zod:** ❌ **NO hay Zod.** Estado con `useState` (`:13-16`). Validación = solo `required` HTML pero el form es `noValidate` (`:67`) → en la práctica **no valida formato**; el botón se deshabilita si `!correo || !password` (`:120`).
- **defaultValues / reset:** N/A (strings vacíos).
- **Submit:** `handleSubmit` (`:18-34`) → `loginSuperAdmin({correo, password})` → `POST /auth/login/`. Ramifica por rol: ADMIN→`/dashboard`, CAJERO→`/pos`, otro (incl. SUPERADMIN)→`setApiError('Acceso no autorizado...')` **sin navegar** (`:27-28`). ⚠️ Un SUPERADMIN que se loguee aquí queda autenticado en Redux (via `onQueryStarted`) pero sin redirección.
- **Errores servidor:** `err.data.detail` → un solo `apiError` (`:31-32`). No mapea por campo.

| campo | Zod | RHF | tipo TS | serializer DRF | modelo Django | constraint BD | ⚠️ divergencia |
|---|---|---|---|---|---|---|---|
| correo | ninguno | useState, `required`+`type=email` (ignorado por noValidate) | `LoginSuperAdminArgs.correo: string` | `super().validate` (USERNAME_FIELD) | `correo EmailField` | `unique` global | sin validación de formato en el front |
| password | ninguno | useState, `required` | `password: string` | `check_password` | — | — | sin min length front (back tampoco lo exige en esta rama) |

---

## 2. Login Cajero (cédula + PIN) — `/login/:tenantSlug`

- **Componente:** `StaffLoginPage.tsx:67` · **Modo:** solo login
- **Schema Zod:** ❌ **NO hay Zod.** `useState` para `cedula`/`pin` (`:78-79`). PIN = 4 cajas numéricas (`PinInput`, `:18-64`); solo acepta dígitos (`:27`).
- **Precondición tenant:** `useCheckTenantBySlugQuery(slug)` (`:71`) resuelve el tenant por slug (endpoint público de [[tenancy]]). Si no existe/inactivo → pantalla "no encontrada" (`:125-138`).
- **Submit:** **auto-submit** cuando `pin.length===4 && cedula.trim() && tenantCheck.exists` (`:83-88`) o botón (`:200`). `loginWorker({cedula, password: pin, tenant_id: tenantCheck.id?})` → `POST /auth/login/cashier/`. `tenant_id` se envía **solo si `tenantCheck.id`** existe (`:98`). Éxito CAJERO→`/staff` (redirige a `/pos`), otro→`/dashboard` (`:100-103`).
- **Errores servidor:** `err.data.detail ?? err.data.message ?? (401?'Credenciales'...)` → `apiError` + limpia PIN (`:105-113`). No por campo.

| campo | Zod | RHF | tipo TS | serializer DRF | modelo Django | constraint BD | ⚠️ divergencia |
|---|---|---|---|---|---|---|---|
| cedula | ninguno | useState, `inputMode=numeric` (no fuerza dígitos) | `LoginWorkerArgs.cedula?: string` | `cedula min_length=1` (`serializers.py:87`) | `cedula CharField(20)` | unique **por-tenant** | front no limita a 20 chars ni a solo-dígitos |
| pin (password) | ninguno | 4 cajas, solo dígitos, exacto 4 | `password: string` | `password min_length=4` (`serializers.py:88`) | — | — | front fija 4; back acepta ≥4. OK para login, pero choca con auto-cambio min6 → [[divergencia-min-password-cajero]] |
| tenant_id | ninguno | del `checkTenantBySlug` | `tenant_id?: string` | `UUIDField required=False allow_null` (`serializers.py:89`) | FK Tenant | — | **opcional en la API** → [[login-cajero-sin-tenant-id]] |

---

## 3. Login Super Admin (correo) — `/super-admin/login`

- **Componente:** `SuperAdminLoginPage.tsx:26` · **Modo:** solo login
- **Schema Zod:** ✅ **ÚNICO login con Zod** (`:19-24`): `correo.email('Correo inválido')`, `password.min(1,'...')`. `zodResolver` (`:34`), `mode` default (onSubmit). Estático.
- **Submit:** `onSubmit` (`:36-41`) → `login(data)` → `POST /auth/login/` → `navigate('/super-admin/home')` **sin verificar rol** (`:38-39`). ⚠️ Cualquier rol con credenciales válidas entra al portal superadmin en el front (aunque los guards de las páginas internas usan `allowedRoles={['SUPERADMIN']}` en `router.tsx:48`, así que las páginas sí lo rebotan). Ver P-3.
- **Errores servidor:** `error.data.detail` (RTK error, no unwrap) → `apiError` (`:43-46`). No por campo.

| campo | Zod | RHF | tipo TS | serializer DRF | modelo Django | constraint BD | ⚠️ divergencia |
|---|---|---|---|---|---|---|---|
| correo | `.email()` requerido | `register('correo')` | `LoginSuperAdminArgs.correo` | `super().validate` | `correo EmailField unique` | unique global | — (paridad OK) |
| password | `.min(1)` | `register('password')` | `password: string` | `check_password` | — | — | Zod exige solo min1; sin tope |

---

## 4. Auto-edición de perfil — `/profile` (compartido con [[users]])

> Front en `features/users/ProfilePage.tsx`; backend `UpdateMeView` (`views.py:38-77`) en scope auth. Dos sub-formularios independientes.

- **Schema Zod:** ✅ `infoSchema` (`ProfilePage.tsx:13-16`): `nombre.min(2)`, `correo.email().or(literal('')).optional()`. `passwordSchema` (`:19-28`): `current_password.min(1)`, `new_password.min(6)`, `confirm_password` + `.refine` igualdad (`:25`, front-only).
- **defaultValues:** info desde `user` de Redux (`:57`) — **no hay `reset()` si el user cambia** (queda del render inicial). password vacíos (`:87`).
- **Submit info:** `updateMe({nombre, correo})` → `PATCH /auth/me/update/`; despacha `updateUser` a Redux (`:67`). **Submit password:** `updateMe({current_password, new_password})`; en éxito → `logout()` + `navigate('/login')` a los 2s (`:99-102`).
- **Errores servidor:** ✅ **sí mapea por campo** vía `fieldError()` (`:32-42`) → `setPwError` en `current_password`/`new_password` (`:104-108`); info cae a `infoServerError` genérico (`:70-74`).

| campo | Zod (front) | tipo TS | validación DRF (vista) | modelo | ⚠️ divergencia |
|---|---|---|---|---|---|
| nombre | `min(2)` | `UpdateMeArgs.nombre?` | min 2 (`views.py:47`) | `nombre CharField(200)` | paridad OK; ninguno topa a 200 |
| correo | `email()` o `''`, opcional | `correo?: string` | unicidad global excl. self (`views.py:55`) | `correo unique` | front manda `''`→ back lo vuelve `None` (`views.py:54`) OK |
| current_password | `min(1)` | `current_password?` | `check_password` (`views.py:64`) | — | — |
| new_password | `min(6)` | `new_password?` | min 6 (`views.py:70`) | — | **min6 aquí vs min4 en login cajero** → [[divergencia-min-password-cajero]] |
| confirm_password | `.refine` igualdad | (no se envía) | — | — | validación solo-front (correcto) |

---

## ⚠️ Divergencias detectadas

1. **Password mínimo incoherente (medio):** login cajero `min4` (`serializers.py:88`) + PIN generado de 4 dígitos, pero auto-cambio exige `min6` (`views.py:70` / `ProfilePage.tsx:22`). Un cajero no puede fijarse un PIN de 4 desde su perfil. → [[divergencia-min-password-cajero]].
2. **Cero validación en 2 de 3 logins (medio):** `TenantLoginPage` y `StaffLoginPage` no usan Zod; el único robusto es `SuperAdminLoginPage`. Formato de correo/cédula no se valida antes de pegar a la API.
3. **`tenant_id` opcional en login cajero (alto):** front lo manda, API no lo exige → [[login-cajero-sin-tenant-id]].
4. **SuperAdminLoginPage no chequea rol post-login (bajo, mitigado por guards):** ver P-3.
5. **`/auth/login/` también hace login por cédula (bajo):** rama encubierta en `serializers.py:32-46`; ningún form la usa así, pero amplía superficie.

## ❓ Por confirmar
- Ver [[preguntas-auth]] P-1..P-5.
