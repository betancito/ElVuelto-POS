---
tags: [tarea, backend, auth, users, errores, seguridad]
status: 🔴
prioridad: alta
updated: 2026-09-13
---

# BACKEND-20260830-login-publico-500-tenant-id-no-uuid — el login público revienta en 500 con un dato basura

> [!danger] CORREGIDA A FONDO EL 2026-09-13 — el titular de esta ficha era FALSO
> El nombre del archivo dice `tenant-id-no-uuid` y **ese caso no produce un 500**: devuelve **400 JSON**.
> El 500 real existe, pero es por **`cedula` no-string**, que esta ficha tenía como nota al pie.
> El ID del archivo se conserva porque es la clave con la que la enlaza medio cerebro; el contenido es
> el que vale. Ver el detalle abajo.

## El defecto real: `cedula` sin validar de tipo

`el_vuelto_backend/apps/users/serializers.py:76-78`, en `CustomTokenObtainPairSerializer.validate`:

```python
def validate(self, attrs):
    cedula = self.initial_data.get("cedula")   # :76 — sale de initial_data, sin declarar como campo
    if cedula:
        cedula = cedula.strip()                # :78 — .strip() sobre lo que venga
```

`initial_data` es el JSON crudo del request: puede traer un `int`, una lista, un dict. `123.strip()`
levanta `AttributeError`, que **no es** una `ValidationError` de Django ni de DRF, así que
`Serializer.run_validation` no la atrapa, `exception_handler` devuelve `None` y Django la convierte en
**500 `text/html`**.

**Reproducido full-stack** el 2026-09-13 con `django.test.Client` (`DJANGO_SETTINGS_MODULE=elvuelto.settings.local`):

| body | resultado real |
|---|---|
| `{"correo":"x@x.com","password":"y","cedula":123}` | **500 text/html** ← el defecto |
| `{"correo":"x@x.com","password":"y","cedula":["1"],"tenant_id":"basura"}` | **500 text/html** |
| `{"correo":"x@x.com","password":"y","cedula":"1","tenant_id":"basura"}` | **400 JSON** `{"non_field_errors":["“basura” no es un UUID válido."]}` |

## Por qué el caso del `tenant_id` NO es un 500 (la tesis vieja, refutada)

La ficha original razonaba: `User.objects.filter(..., tenant_id="basura")` levanta
`django.core.exceptions.ValidationError` → `rest_framework.views.exception_handler` devuelve `None` →
500. **Cada eslabón es cierto por separado, y la conclusión es falsa**, porque la excepción nunca llega
al `exception_handler`:

`.venv/lib/python3.12/site-packages/rest_framework/serializers.py:635-640` — `run_validation` envuelve
la llamada a `self.validate()` en `except (ValidationError, DjangoValidationError)` y la **re-lanza como
`ValidationError` de DRF**. Resultado: 400 con cuerpo JSON.

> [!warning] La lección, que vale más que el bug
> Este razonamiento se escribió, se registró en `00-INDEX`, sobrevivió un PASO 0 entero y lo repitió el
> Planner en esta misma sesión tras "reproducirlo" **a nivel de ORM** — que es donde sí falla. Lo que
> faltaba era ejecutar el **endpoint**, no la línea. Verificar la pieza no es verificar el sistema.

## El endpoint sí es público (esto se sostiene)
`apps/users/urls.py:17` → `path("auth/login/", CustomTokenObtainPairView.as_view(), ...)`, montado bajo
`elvuelto/urls.py:10` (`path("api/", include("apps.users.urls"))`). `apps/users/views.py:39` no declara
`permission_classes`, así que hereda `AllowAny` de `TokenViewBase`
(`rest_framework_simplejwt/views.py:12-14`).

⚠️ **Y desde el 2026-08-30 está en internet**: `https://elvuelto.online/api/auth/login/`
(ver [[INFRA-20260913-el-deploy-a-azure-ya-corrio]]). `DEBUG=False` confirmado desde afuera, así que el
500 sale pelado, sin traceback.

## Anclas — todas +7 desde `89d3f41`
`89d3f41` insertó 7 líneas en `_user_payload` (`:51-58`, el bloque `tenant_factura_electronica`), que
vive **antes** de la clase, así que todo el bloque corrió parejo:

| vieja | hoy | qué es |
|---|---|---|
| `:69` | **`:76`** | `cedula = self.initial_data.get("cedula")` |
| `:71` | **`:78`** | `cedula = cedula.strip()` ← **el defecto** |
| `:72` | **`:79`** | `tenant_id = self.initial_data.get("tenant_id")` (crudo, pero termina en 400) |
| `:75` | **`:82`** | `if not tenant_id:` — rechaza vacío, no no-UUID |
| `:79` | **`:86`** | `User.objects.filter(cedula=cedula, tenant_id=tenant_id)` |
| `:162` | **`:169`** | el hermano `CashierLoginSerializer` con `UUIDField(required=True)` (clase en `:163`) |

## Arqueología corregida
La ficha decía *"las dos líneas vienen de `ca5db4d`"*. El `git blame` dice otra cosa:
- `:78` y `:79` son de **`3ade509a`** (2026-04-24) — el defecto tiene **cuatro meses más** de los que se
  le atribuían.
- De `ca5db4d` (2026-08-03) es solo el guard `if not tenant_id:` (`:82-85`), o sea el arreglo **parcial**
  que pasó por al lado del problema de tipos sin verlo.
- Ni `abee9d8` ni `89d3f41` las tocaron; `89d3f41` solo las desplazó.

## Criterio de aceptación
`POST /api/auth/login/` con `cedula` no-string (`123`, `["1"]`, `{"a":1}`) devuelve **400 JSON** con
error por campo, nunca 500. Declarar `cedula` como campo del serializer (`CharField`) o validar el tipo
antes del `.strip()` — el hermano `CashierLoginSerializer` ya declara los suyos y es el molde a copiar.
Verificable con `django.test.Client` sin levantar Postgres (la validación corta antes de la BD).

> [!warning] No probar contra producción
> `elvuelto.online` es el negocio de un cliente real. Los payloads basura van contra un backend local.

## Enlaces
[[BACKEND-20260805-residuos-del-triaje]] · [[INFRA-20260913-el-deploy-a-azure-ya-corrio]] ·
[[patron-errores-drf-rtk]] · [[patron-permisos-roles]] · [[2026-08-30-planner-paso0-resync]] ·
[[2026-09-13-planner-paso0-resync]]
