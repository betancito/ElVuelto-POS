---
tags: [modulo, datos, modelos]
status: documentado
module: auth
updated: 2026-08-02
---

# Auth — Datos y BD

> [!info] El modelo `User` lo **posee [[users]]** ([[datos-users]]). Aquí solo lo que login/JWT lee y las constraints que generan el riesgo cross-tenant.

## `User` — `apps/users/models.py:32-73` (`db_table = "users"`)

Extiende `AbstractBaseUser + PermissionsMixin`. `USERNAME_FIELD = "correo"` (:51), `REQUIRED_FIELDS = ["nombre"]` (:52), manager `UserManager` (:54).

Campos que el auth toca:

| campo | tipo | null/blank | default | notas auth |
|---|---|---|---|---|
| `id` | `UUIDField` PK | — | `uuid.uuid4` | va como `str` en JWT/user dict |
| `tenant` | FK→`tenants.Tenant` | `null=True, blank=True` | — | `on_delete=CASCADE`, `related_name="users"` (:34-40). **null para SUPERADMIN** |
| `nombre` | `CharField(200)` | no/no | — | requerido; va al JWT y al dict user |
| `correo` | `EmailField` | `null/blank` | — | `unique=True` (global); `USERNAME_FIELD`; login por correo lo usa |
| `cedula` | `CharField(20)` | `null/blank` | — | login cajero lo usa; **unicidad solo por-tenant** (ver constraint) |
| `rol` | `CharField(20)` | no | `CAJERO` | choices `UserRole`; va al JWT y decide guards |
| `activo` | `BooleanField` | no | `True` | `is_active` property (:71-73) → login rechaza si `False` |
| `lead_cashier` | `BooleanField` | no | `False` | expuesto en el dict user del login |
| `is_staff` | `BooleanField` | no | `False` | acceso admin Django |
| `created_at/updated_at` | `DateTimeField` | — | `auto_now_add`/`auto_now` | — |

### `UserRole` (TextChoices, `models.py:7-10`)
`SUPERADMIN` · `ADMIN` · `CAJERO`. Sincronizado con el union TS `'SUPERADMIN'|'ADMIN'|'CAJERO'` en `authSlice.ts:8`, `authApi.ts:25`. ⚠️ El TS de `usersApi.ts:8` (`User`) solo declara `'ADMIN'|'CAJERO'` (subset — no incluye SUPERADMIN, ese nunca pasa por CRUD de [[users]]).

### Constraint clave (origen del riesgo cross-tenant)
`models.py:60-66`:
```
UniqueConstraint(fields=["tenant","cedula"], name="unique_cedula_por_tenant",
                 condition=Q(cedula__isnull=False))
```
⇒ **la cédula es única por-tenant, NO globalmente.** Dos tenants distintos pueden tener la misma cédula. El login por cédula sin `tenant_id` no distingue entre ellos → [[login-cajero-sin-tenant-id]].

## Migraciones clave

| migración | qué cambió | relevancia auth |
|---|---|---|
| `0001_initial.py` | crea `User` (sin cédula) | — |
| `0002_user_cedula_alter_user_correo.py:14-22` | agrega `cedula` **con `unique=True` (global)** + `correo unique` | histórico: la cédula **fue** única global |
| `0003_..._unique_cedula_por_tenant.py:15-23` | quita el `unique` global de cédula y añade la `UniqueConstraint` condicional por-tenant | **este cambio es el que habilita cédulas repetidas entre tenants** → riesgo |
| `0004_user_lead_cashier.py` | agrega `lead_cashier` (default False) | campo que el login expone |

## ¿Dónde vive cada validación?
- **Login correo:** identidad por `correo` (unique BD) + `check_password` (`serializers.py:43,103`). Sin `clean()`.
- **Login cédula:** filtrado manual en el serializer (`serializers.py:37-40`, `:96-99`). No hay validación de tenant obligatorio en ningún lado.
- **`activo`:** chequeado en cada login (`serializers.py:45,105`) vía `is_active` property.
- **Auto-edición (`UpdateMeView`):** validación **a mano en la vista** (`views.py:45-74`), sin serializer ni `clean()`. `correo` unicidad se revalida en la vista (`views.py:55`), no confía solo en la BD.
- **Password:** no hay validadores de Django (`AUTH_PASSWORD_VALIDATORS` no aplica a estos flujos custom); solo `min_length` sueltos en serializers/vista → divergentes. Ver [[divergencia-min-password-cajero]].
