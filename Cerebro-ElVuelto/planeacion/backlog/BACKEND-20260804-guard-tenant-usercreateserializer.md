---
tags: [tarea, backend, users, tenancy]
status: 🟢
prioridad: media
updated: 2026-08-05
---

> [!done] Cerrado 2026-08-05 — ✅ [[RUN-20260805-usercreate-tenant-y-docs]]
> `require_tenant` en los dos sitios (`serializers.py` unicidad de cédula + `create`). Los dos 500 pasaron a **403**; verificado 6/6 con las regresiones (crear cajero 201, cédula duplicada 400, PATCH sin nulificar 200).
> **Con esto no queda ningún camino del backend que dereferencie `request.tenant` sin guard.**

# BACKEND-20260804-guard-tenant-usercreateserializer — El último camino que lee `request.tenant` crudo

**Tipo:** robustez / consistencia · **Descubierto:** auto-reportado por el Dev en [[RUN-20260804-guard-tenant-none-y-doc]], verificado por el Planner

## Problema
[[BACKEND-20260803-guard-tenant-none-viewsets-restantes]] cerró los 7 caminos de su alcance, pero `UserCreateSerializer` quedó fuera y sigue dereferenciando el tenant sin guard:

- `apps/users/serializers.py:203` — `tenant = self.context["request"].tenant` (filtro de unicidad de cédula)
- `apps/users/serializers.py:231` — `validated_data["tenant"] = request.tenant` (en `create`)

## Modo de fallo real (ejecutado, no supuesto)
`POST /api/users/` como SUPERADMIN (tenant None):

| Payload | Resultado |
|---|---|
| CAJERO con `cedula` | `TypeError: one of the hex, bytes… must be given` → **500** (revienta en el filtro de `:203`) |
| ADMIN sin `cedula` | `ValueError: Cannot assign "<SimpleLazyObject: None>": "User.tenant" must be a "Tenant" instance.` → **500** (en `:231`) |

> [!info] Corrección a la nota del `CLAUDE.md`
> `el_vuelto_backend/CLAUDE.md` (viñeta *"Still NOT guarded"*) dice que el segundo caso *"creates a user with `tenant=None`"*. **No es cierto:** Django rechaza asignar el `SimpleLazyObject` al FK y lanza `ValueError`, así que **no se crea ningún usuario huérfano**. Ambos casos son 500. Corregir esa frase junto con el fix.

## Criterio de aceptación
`POST /api/users/` sin contexto de tenant responde **403** (vía `require_tenant`), no 500. Crear usuarios como ADMIN con tenant real sigue funcionando igual (incluida la validación de unicidad de cédula por tenant). La nota del `CLAUDE.md` queda corregida.

## Notas para el Dev
- Mismo patrón que el resto: `require_tenant(self.context["request"])`. No uses `is None`.
- ⚠️ `validate()` corre también en `partial_update`, donde el tenant sí existe — no rompas el PATCH que se acaba de entregar ([[RUN-20260804-invariante-correo-admin]]).
- Doble actualización: `el_vuelto_backend/CLAUDE.md`.
