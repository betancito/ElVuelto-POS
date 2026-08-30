---
tags: [tarea, backend, auth, users, errores, seguridad]
status: 🔴
prioridad: alta
updated: 2026-08-30
---

# BACKEND-20260830-login-publico-500-tenant-id-no-uuid — el login público revienta en 500 con un dato basura

> [!danger] Es el endpoint MÁS expuesto del sistema: `POST /api/auth/login/`, `AllowAny`, sin JWT
> Cualquiera en la red puede provocar un **500 en HTML** (traceback si `DEBUG=True`) mandando un
> `tenant_id` que no sea UUID. No es escalada de privilegios, pero es ruido de error no manejado en la
> puerta de entrada, y contradice el criterio de aceptación que el propio backlog ya tenía escrito.

## Cómo nace
Sale de la re-verificación del PASO 0 del 2026-08-30. Un escéptico atacó el relevamiento de
[[BACKEND-20260805-residuos-del-triaje]] (punto 1: "params sin validar → 500") y encontró que el
relevamiento se hizo con `grep query_params.get`, así que **se le escapó una TERCERA instancia** del
mismo defecto — y es la peor, porque no está en un `get_queryset` autenticado sino en el login público.

## El defecto, con anclas
`el_vuelto_backend/apps/users/serializers.py`, en `CustomTokenObtainPairSerializer.validate`:

- `:69` — `cedula = self.initial_data.get("cedula")`
- `:71` — `cedula = cedula.strip()` — **antes de cualquier validación de tipo**.
- `:72` — `tenant_id = self.initial_data.get("tenant_id")` — **crudo**. No es campo declarado del
  serializer: los únicos campos son `correo` + `password`, que simplejwt inyecta en
  `TokenObtainSerializer.__init__`.
- `:75` — `if not tenant_id:` — solo rechaza **vacío**, no "no-UUID".
- `:79` — `User.objects.filter(cedula=cedula, tenant_id=tenant_id)` → con `"basura"` levanta
  `django.core.exceptions.ValidationError('"basura" is not a valid UUID.')`, que **DRF no mapea**
  (`rest_framework.views.exception_handler` devuelve `None` para la `ValidationError` de Django) → 500.

## Que es un olvido y no un diseño, lo prueba el hermano
`el_vuelto_backend/apps/users/serializers.py:162` — `CashierLoginSerializer` declara
`tenant_id = serializers.UUIDField(required=True)` para **el mismo dato**. Uno lo hace bien; el otro no.

## Los dos casos
| body | qué pasa | dónde |
|---|---|---|
| `{"correo":"x@x.com","password":"y","cedula":"1","tenant_id":"basura"}` | `ValidationError` de Django sin mapear → **500 HTML** | `serializers.py:72,79` |
| `{"correo":"x@x.com","password":"y","cedula":123}` | `123.strip()` → `AttributeError` → **500** | `serializers.py:71` |

Las dos líneas vienen de `ca5db4d`; `abee9d8` no las tocó.

## Ojo con el arreglo que proponía la ficha vieja
[[BACKEND-20260805-residuos-del-triaje]] propone un `parse_uuid_param()` en
`apps/tenants/date_params.py` "usado en los dos `get_queryset`". **No cubre este caso**: son TRES
lugares y el tercero no es un `get_queryset`. Acá lo natural es declarar el campo
(`serializers.UUIDField`) o validar el tipo antes de tocar la base.

## Verificación pendiente contra servidor real
Derivado del código y del comportamiento de DRF 3.15.2 / Django 5.1.4 (reproducido en el venv del repo
a nivel de `exception_handler`), pero **no se golpeó el endpoint con el server prendido** — hoy Postgres
no está corriendo en esta máquina. Antes de cerrarlo hay que pegarle con `curl`.

## Anclas
- `el_vuelto_backend/apps/users/serializers.py:69,71,72,75,79,162`

## Enlaces
[[BACKEND-20260805-residuos-del-triaje]] · [[patron-errores-drf-rtk]] · [[patron-permisos-roles]] ·
[[2026-08-30-planner-paso0-resync]]
