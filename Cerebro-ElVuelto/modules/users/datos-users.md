---
tags: [modulo, datos]
status: vivo
module: users
updated: 2026-08-02
---

# Users — Datos y BD

Modelo único del scope: `User` (`apps/users/models.py:32-73`). Custom `AbstractBaseUser + PermissionsMixin`. `db_table = "users"`.

## Campos (verificados en `models.py`)

| campo | tipo | null/blank | default | notas |
|---|---|---|---|---|
| `id` | `UUIDField` PK | — | `uuid.uuid4` | `editable=False` (`:33`) |
| `tenant` | FK `tenants.Tenant` | `null=True blank=True` | — | `on_delete=CASCADE`, `related_name="users"` (`:34-40`) — **nullable** para superadmin |
| `nombre` | `CharField(200)` | no/no | — | requerido a nivel modelo (`:41`); `REQUIRED_FIELDS=["nombre"]` |
| `correo` | `EmailField(254)` | `null=True blank=True` | — | `unique=True` **global** (`:42`); `USERNAME_FIELD` |
| `cedula` | `CharField(20)` | `null=True blank=True` | — | único **por tenant** vía constraint (no `unique=True` propio) (`:43`) |
| `rol` | `CharField(20)` choices `UserRole` | no/no | `CAJERO` (`:44`) | choices `SUPERADMIN/ADMIN/CAJERO` (`:7-10`) |
| `activo` | `BooleanField` | no/no | `True` (`:45`) | expuesto como `is_active` vía `@property` (`:71-73`) |
| `lead_cashier` | `BooleanField` | no/no | `False` (`:46`) | gate de inventario en POS (ver [[users--inventory]]) |
| `is_staff` | `BooleanField` | no/no | `False` (`:47`) | acceso al Django admin |
| `created_at` | `DateTimeField` | — | `auto_now_add` (`:48`) | read_only |
| `updated_at` | `DateTimeField` | — | `auto_now` (`:49`) | read_only |
| (heredados) | `password`, `last_login`, `is_superuser`, `groups`, `user_permissions` | | | de `AbstractBaseUser`/`PermissionsMixin` |

Sin `Meta.ordering` en el modelo; el orden lo pone la vista (`views.py:86` → `order_by("nombre")`).

## Constraints e índices

- `UniqueConstraint(fields=["tenant","cedula"], name="unique_cedula_por_tenant", condition=Q(cedula__isnull=False))` (`models.py:60-66`). ⇒ dos usuarios del mismo tenant no comparten cédula; cédula `NULL` no cuenta (admins sin cédula conviven).
- `correo` `unique=True` a nivel columna ⇒ único **global** (cruza tenants). Un admin no puede repetir correo ni siquiera en otro negocio.
- Sin `unique_together`. Sin índices extra declarados más allá de los de FK/unique.

## Dónde vive cada validación (⚠️ importante)

| regla | modelo/BD | serializer | vista | Zod front |
|---|---|---|---|---|
| `correo` único global | BD (`unique=True`) | manual `ser:177-182` | `UpdateMeView:55` (perfil) | — |
| `cedula` única por tenant | BD (constraint) | manual `ser:183-188` | — | — |
| CAJERO exige `cedula` | — | `ser:169-170` | — | ❌ no |
| ADMIN exige `correo` | — | `ser:171-172` | — | ❌ no |
| No asignar SUPERADMIN | — | `ser:157-162` | — | enum sin SUPERADMIN (`UsersPage:36`) |
| `""`→`None` en `correo/cedula` | — | `ser:166-167,206-207` | `UpdateMeView:54` | trim→undefined (`UsersPage:101,139`) |
| `password` mínimo | — | `min_length=4` (`ser:148`) | `new_password≥6` (`views.py:70`) | perfil `min6` (`ProfilePage:23`) |

> [!warning] Sin `clean()` en el modelo
> No hay `clean()`/`full_clean()`: todas las reglas de negocio (rol↔campo, unicidad de nullable) viven en `UserCreateSerializer.validate`. Un `create` directo por ORM/`create_user` o Django admin **salta** esas reglas.

## Migraciones clave (historia del esquema)

| migración | qué hizo | relevancia |
|---|---|---|
| `0001_initial` | crea `User`; `correo` `unique` **no nullable**; sin `cedula` | estado base (`:26`) |
| `0002_user_cedula_alter_user_correo` | añade `cedula` (¡al inicio `unique=True` **global**!); `correo`→`null/blank` | `:16,21` |
| `0003_alter_user_cedula_user_unique_cedula_por_tenant` | **quita** `unique` global de `cedula` y añade `UniqueConstraint` condicional por tenant | por qué cédula ahora es única por-tenant y no global (`:15-23`) |
| `0004_user_lead_cashier` | añade `lead_cashier BooleanField default=False` | `:13-18` |

## Relaciones salientes hacia `User`
- `Sale.user` FK `PROTECT`, `InventoryMovement.user` FK `PROTECT` (según `el_vuelto_backend/CLAUDE.md`) ⇒ no se puede borrar un usuario con ventas/movimientos sin `ProtectedError`. Relevante para `destroy` (P-1). ❓ Confirmar `on_delete` exacto en apps `sales`/`inventory` (fuera de este módulo).
