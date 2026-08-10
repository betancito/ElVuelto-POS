---
tags: [corrida, backend, seguridad, users, tenancy]
status: 🟢 corrido-ok
module: _transversal
updated: 2026-08-05
---

# 🔒 RUN 2026-08-05 — Cerrar las dos puertas que evaden los serializers

**Prompt:** [[PROMPT-FIX-BACKEND-20260805-cerrar-puertas-traseras]] · **Tarea:** [[BACKEND-20260805-escrituras-que-evaden-serializers]]
**Veredicto:** ✅ PASÓ — **10/10**, todo verificado ejecutando por el Planner.

## Diff entregado
7 archivos: `apps/users/{models,admin,views}.py`, `apps/tenants/{serializers,views,viewsets}.py`, `seed_dev_data.py`. **Sin migración** (`makemigrations --check` → `No changes detected`). Front intacto.

## Puerta 1 — el sitio de Django
Eligió **`User.clean()`** (`apps/users/models.py:72-96`) con la regla por rol, más `cedula` agregada a **ambos** fieldsets del `UserAdmin`. Sin `CheckConstraint`, o sea **sin migración y sin riesgo sobre filas existentes** — que es exactamente la salida que el prompt autorizaba si la migración resultaba delicada.

El docstring es honesto sobre el alcance: `clean()` corre vía `ModelForm._post_clean()` → `full_clean()`, así que cubre el admin y cualquier `ModelForm` futuro, pero **no** un `.save()` pelado. DRF no se ve afectado (tiene su propia regla, con los mismos mensajes) y el SUPERADMIN queda exento a propósito.

También quitó `is_staff=True` de `_create_initial_admin` (`tenants/serializers.py`) y del seed, con el comentario de por qué: un admin de tenant administra su negocio, no la plataforma.

## Puerta 2 — `PUT` + multipart
Constante compartida `METHODS_WITHOUT_PUT` (`tenants/viewsets.py:11`) con el porqué documentado, aplicada a `TenantModelViewSet` (→ Category y Product), `TenantViewSet` y `UserViewSet`. `SaleViewSet`/`InventoryMovementViewSet` no la necesitan: no incluyen `UpdateModelMixin`, así que no exponen PUT ni PATCH. Cobertura correcta.

## Verificación (10/10)

`makemigrations --check --dry-run` → `No changes detected`

| # | Caso | Resultado |
|---|---|---|
| 1 | `/admin/` crear CAJERO sin cédula | **200 = rechazado**, no se creó |
| 2 | `/admin/` vaciar `correo` de un ADMIN | **200 = rechazado**, correo intacto |
| 3 | `PUT /api/tenants/{id}/` multipart | **405** · `activo` sigue en True |
| 4 | `PUT /api/users/{id}/` multipart | **405** · `activo` y `lead_cashier` intactos |
| 5 | Admin de tenant recién creado | `is_staff=False` |
| 6 | `POST /api/users/` cajero válido | **201** |
| 7 | `PATCH {"nombre"}` | **200**, `correo` intacto |
| 8 | `PATCH /me/update/ {"correo":""}` ADMIN | **400** |
| 9 | `POST /api/sales/` CAJERO | **201** — el POS vende |
| 10 | `seed_dev_data` ×2 | idempotente; cajero con cédula y PIN; login → OK |

## Nota de método — una contradicción que resolví
El `git diff` mostraba `_get_tenant` cambiando del `is None` roto a `require_tenant`, lo que parecía contradecir mi review de tenancy (donde medí 403 y no 500). **`git diff` compara contra HEAD, y hace dos días que no se commitea**: ese cambio es del 08-03 ([[RUN-20260803-guard-tenant-none]]), no de hoy. Verifiqué el mecanismo aparte (`lazy is None` → False; `filter(tenant=lazy)` → `TypeError`) y confirmé que mi medición original era correcta. **En un repo con días sin commitear, el `git diff` no fecha nada — el `mtime` sí.**

## 🟡 Residual real: el fix es **hacia adelante**, no retroactivo

`is_staff` deja de ponerse en los admins **nuevos**, pero **las filas existentes lo conservan**. Verificado en la BD de dev: **1 de 2** admins de tenant sigue con `is_staff=True` (`juan@laesperanza.com`). En dev es una fila; en un despliegue real serían **todos los admins de tenant creados hasta hoy** — o sea justo las cuentas cuya exposición motivó el ticket.

El Dev sí hizo backfill para la cédula del cajero en el seed, pero no para `is_staff`. La asimetría es lo que lo delata como olvido, no como decisión.
→ [[BACKEND-20260805-cerrar-residuos-users-auth]]

## Checklist de trampas
**#1 tenancy** ✅ los guards siguen; `_get_tenant` ahora delega en `require_tenant` (deduplicación correcta) · **#4 permisos** ✅ `is_staff` es el cambio buscado, `permission_classes` sin tocar · **#9 migraciones** ✅ ninguna, a propósito · **#10 doble actualización** ✅ · **#11** ✅ sin git, sin front.
