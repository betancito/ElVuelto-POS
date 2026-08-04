---
tags: [modulo, formularios]
status: vivo
module: tenancy
updated: 2026-08-02
---

# Tenancy — Auditoría de formularios

Dos formularios, ambos en `features/super-admin/tenants/index.tsx`. Sigue [[plantilla-formulario]]. Backend: `apps/tenants/serializers.py` + `models.py`.

---

## Formulario 1 — Crear negocio (super-admin)

- **Componente:** `features/super-admin/tenants/index.tsx:115-143` (modal "Nuevo negocio") · **Modo:** crear.
- **Schema Zod:** `createSchema` `index.tsx:21-29`, **estático**. `zodResolver(createSchema)` (`index.tsx:52`). No se pasa `mode`/`reValidateMode` (default `onSubmit`).
- **`defaultValues`:** ninguno (form arranca vacío). `createForm.reset()` se llama tras éxito (`index.tsx:58`).
- **Estructura dinámica:** ninguna. Sin `useFieldArray`, sin campos condicionales, sin variación por rol. Bloque visual "Administrador inicial" (`index.tsx:130`) siempre presente.
- **Submit:** `onCreateSubmit` (`index.tsx:55`) → `useCreateTenantMutation().unwrap()` → `POST /api/tenants/`. Sin transformación de payload (envía el objeto Zod tal cual, incluido `support_number:""` si vacío). En éxito: `reset()`, cierra modal, `refetch()`, y setea `credentials` (abre `CredentialsModal` con `initial_admin_password`). El banner `PasswordBanner.tsx` NO se usa aquí.
- **Errores del servidor:** `catch { toast.error('No se pudo crear...') }` (`index.tsx:67-69`). ⚠️ **NO** mapea el 400 por campo a `setError`; NIT/correo duplicado, `max_length`, o el 500 por `admin_correo` duplicado caen todos en el mismo toast genérico. Ver [[riesgo-errores-400-silenciados]].

### Matriz de paridad por campo

| campo | Zod | RHF | tipo TS (`CreateTenantArgs`) | serializer DRF | modelo Django | constraint BD | ⚠️ divergencia |
|---|---|---|---|---|---|---|---|
| `nombre` | `string().min(2)` | register, req | `string` | CharField | CharField(200) | — | front sin `max(200)`; >200 ⇒ 400 tragado |
| `nit` | `string().min(5)` | register, req | `string` | CharField (UniqueValidator) | CharField(20) unique | UNIQUE | front sin `max(20)`; duplicado ⇒ 400 tragado |
| `ciudad` | `string().min(2)` | register, req | `string` | CharField | CharField(100) | — | front sin `max(100)` |
| `correo` | `string().email()` | register, req | `string` | EmailField (UniqueValidator) | EmailField unique | UNIQUE | duplicado ⇒ 400 tragado |
| `support_number` | `string().max(20).optional()` | register | `string?` | CharField(blank,null) | CharField(20) blank/null | — | front manda `""` (no `null`) si vacío ⇒ se guarda "" no NULL |
| `admin_nombre` | `string().min(2)` | register, req | `string` | CharField(write_only, min_length=2) | — (crea User.nombre) | — | paridad OK |
| `admin_correo` | `string().email()` | register, req | `string` | EmailField(write_only) | — (crea User.correo) | User.correo UNIQUE | ⚠️ unicidad NO validada en serializer ⇒ duplicado = **500**, no 400 |

Campos que el back NO recibe en create: `activo` (default True), `logo` (se sube aparte). `initial_admin_password` es read_only (respuesta).

---

## Formulario 2 — Editar negocio (super-admin)

- **Componente:** `index.tsx:146-180` (modal "Editar negocio") · **Modo:** editar.
- **Schema Zod:** `editSchema` `index.tsx:31-37`, **estático**. Igual a create pero SIN los `admin_*`. `zodResolver(editSchema)` (`index.tsx:53`).
- **`defaultValues`:** `editForm.reset({...})` en `openEditModal` (`index.tsx:75-81`) con datos del tenant; `support_number` cae a `''` si es `null` (`?? ''`). El estado `activo` NO está en el form Zod: se maneja aparte con `useState(editActivo)` + toggle switch (`index.tsx:49,160-174`).
- **Estructura dinámica:** toggle de `activo` fuera de RHF (botón `role="switch"`).
- **Submit:** `onEditSubmit` (`index.tsx:84`) → `useUpdateTenantMutation({id, ...data, activo: editActivo})` → `PATCH /api/tenants/{id}/`. En éxito: cierra modal, `refetch()`, `toast.success`.
- **Errores del servidor:** mismo patrón: `catch { toast.error('No se pudo actualizar...') }` (`index.tsx:91-93`). Sin `setError` por campo.

### Matriz de paridad por campo

| campo | Zod | RHF/estado | tipo TS (`UpdateTenantArgs`) | serializer DRF | modelo Django | constraint BD | ⚠️ divergencia |
|---|---|---|---|---|---|---|---|
| `nombre` | `min(2)` | register | `string?` | CharField | CharField(200) | — | idem create |
| `nit` | `min(5)` | register | `string?` | CharField unique | CharField(20) unique | UNIQUE | idem create |
| `ciudad` | `min(2)` | register | `string?` | CharField | CharField(100) | — | — |
| `correo` | `email()` | register | `string?` | EmailField unique | EmailField unique | UNIQUE | idem create |
| `support_number` | `max(20).optional()` | register | `string?` | CharField blank/null | idem | — | `null`→`''` en reset; se re-guarda "" |
| `activo` | (no en Zod) | `useState` + switch | `boolean?` | BooleanField (writable) | BooleanField | — | escribible por PATCH (no hay `toggle_active`) |

---

## ⚠️ Divergencias detectadas (→ backlog, no se arreglan aquí)

1. **Errores 400 por campo silenciados** — `index.tsx:68,91` toast genérico; ningún `setError`. NIT/correo duplicado no dicen al usuario cuál campo falló. Ver [[riesgo-errores-400-silenciados]]. (front `index.tsx:67-69,91-93` ↔ back `serializers.py` UniqueValidator).
2. **`admin_correo` duplicado ⇒ 500 no 400** — `serializers.py:62-68` crea User sin pre-validar unicidad ni `@transaction.atomic`; deja tenant huérfano. Ver [[riesgo-creacion-tenant-no-atomica]].
3. **`max_length` no replicado en Zod** — nombre/nit/ciudad/correo sin `max()` en front; la BD/serializer los rechaza con 400 que se traga.
4. **`support_number` `""` vs `null`** — el form manda string vacío; el modelo permite `null`. Inconsistencia menor de almacenamiento (front `index.tsx:80` ↔ modelo `models.py:12`).
5. **`toggle_active` fantasma** — endpoint del `tenantsApi.ts:77` inexistente en back; el form correctamente usa PATCH+`activo` en su lugar, pero el hook queda como trampa. Ver [[riesgo-toggle-active-fantasma]].

## ❓ Por confirmar
- ¿El logo del negocio debe poder subirse desde ESTE formulario? Hoy no hay input de archivo pese a que backend+hook existen. Ver [[preguntas-tenancy]] P-3.
- ¿`support_number` debería normalizarse a `null` cuando está vacío? P-6/relacionado.
