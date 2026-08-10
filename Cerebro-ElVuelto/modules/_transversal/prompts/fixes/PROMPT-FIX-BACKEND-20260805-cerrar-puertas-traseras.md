---
tags: [prompt, backend, seguridad, users, tenancy, fix]
status: 🔴
module: _transversal
updated: 2026-08-05
---

# 🔒 Prompt DEV — Cerrar las dos puertas que evaden los serializers

**Tarea backlog:** [[BACKEND-20260805-escrituras-que-evaden-serializers]]
**Alcance:** una invariante, 2–3 archivos del backend. No git. No tocar el front.

## La invariante

> **Toda escritura sobre `User` y `Tenant` respeta las reglas por rol.** No importa por dónde entre.

Los 08-04/05 se blindaron `UserCreateSerializer` y `UpdateMeView`. Una auditoría adversarial confirmó que **ese blindaje aguanta** todos los ataques por su propia superficie (`""`, `null`, `"   "`, PUT, cambio de rol en el mismo request, TOCTOU). Pero hay **dos caminos que no pasan por ahí**, y por ahí la invariante se cae. Verificados ejecutando.

---

## Puerta 1 — El sitio de Django (`/admin/`)

`/admin/` está montado en `elvuelto/urls.py`. `UserAdmin.add_fieldsets` (`apps/users/admin.py`) es `['correo','nombre','tenant','rol','password1','password2']` — **sin `cedula`**.

Verificado con `django.test.Client`:
| Acción en `/admin/` | Resultado | Por API |
|---|---|---|
| Crear CAJERO | 302, `cedula=None` ⇒ **nunca puede entrar al POS** | 400 |
| Vaciar `correo` de un ADMIN | 302, `correo=None` ⇒ **lockout** (es `USERNAME_FIELD`) | 400 |
| Cambiar rol ADMIN→CAJERO | 302, cajero sin cédula | 400 |

Y no es que el operador se equivoque: **el campo `cedula` no está en el formulario**, así que es imposible hacerlo bien.

⚠️ **Agravante:** `apps/tenants/serializers.py:87` pone `is_staff=True` a **todo** admin de tenant. Confirmado en la BD. Hoy el change page les da 403 por falta de permiso de modelo, pero `is_staff` es justo lo que se mira para entrar a `/admin/`: están a un `user_permissions` de distancia.

## Puerta 2 — `PUT` + `multipart` apaga booleanos ausentes

En DRF 3.15.2, `BooleanField.default_empty_html = False` y `Field.get_value` lo aplica cuando el input es HTML y **no** es `partial`. Un `PUT` multipart que omita un booleano lo pone en `False` **sin decir nada**.

Verificado:
```
PUT /api/tenants/{id}/  format=multipart  {nombre, nit, ciudad, correo}  →  200
tenant.activo → False
```
**Un superadmin editando el nombre de un negocio lo deja fuera de servicio:** endpoints en 403 y página pública de login en `exists:false`. Mismo mecanismo con `activo`/`lead_cashier` de usuarios.

---

## Qué hacer

Te doy el criterio, no la implementación. **Elegí y justificá en el reporte.**

### Puerta 1 — al menos esto
1. **Quitar `is_staff=True`** de `_create_initial_admin` (`apps/tenants/serializers.py:87`). Un admin de tenant no administra la plataforma; para eso está `create_superadmin`. ⚠️ Fijate si algo más depende de ese flag antes de sacarlo.
2. Que `/admin/` no pueda producir usuarios inválidos: agregá `cedula` a los fieldsets **y** hacé que el `ModelForm` valide la regla por rol (un `clean()` en el form del admin, o mejor `User.clean()` + `full_clean()`).

> **Si podés, preferí la regla en el modelo.** Un `User.clean()` con la regla por rol cierra **las dos puertas de una vez** y cualquier futura. Si además ponés un `CheckConstraint`, queda garantizado a nivel BD.
> ⚠️ Pero **mirá primero si las filas existentes la cumplen** (`seed_dev_data` genera un superadmin sin cédula ni tenant — el SUPERADMIN no debe caer en la regla). Si la migración fuera riesgosa, quedate en la capa de forms y **decilo**.

### Puerta 2
La app **nunca usa PUT** (`usersApi.ts` y `tenantsApi.ts` usan PATCH — verificalo antes de tocar). Deshabilitar PUT en los `ModelViewSet` afectados (`http_method_names`) mata la clase entera con una línea. Alternativa más quirúrgica: declarar los booleanos explícitamente en los serializers para que no tomen el `default_empty_html`.

## Restricciones
- Solo backend. **Nada de front.**
- Si generás migración, que sea **solo** por este cambio, y pegá el `makemigrations` completo.
- ⚠️ **No rompas nada de los 08-04/05**: invariante correo/cédula, política de password, guards de tenancy, agregación de stock, params de fecha. La verificación de abajo incluye esas regresiones a propósito.
- El SUPERADMIN no tiene tenant ni cédula: cualquier regla que escribas **no debe** aplicarle.

## Entregable / verificación
1. `makemigrations --check --dry-run` (o el `makemigrations` si generaste una) — pegá la salida.
2. Pegá request/respuesta:

| # | Caso | Esperado |
|---|---|---|
| 1 | `/admin/` → crear CAJERO sin cédula | **rechazado** con mensaje, o imposible porque el campo ahora existe y es obligatorio |
| 2 | `/admin/` → vaciar `correo` de un ADMIN | **rechazado** |
| 3 | `PUT /api/tenants/{id}/` multipart sin `activo` | `activo` **sigue en True** |
| 4 | `PUT /api/users/{id}/` multipart sin `activo`/`lead_cashier` | **no** se apagan |
| 5 | Un admin de tenant recién creado | `is_staff` en **False** |
| 6 | **`POST /api/users/` ADMIN, cajero válido** | **201** (regresión) |
| 7 | **`PATCH /api/users/{id}/ {"nombre":"X"}`** | **200**, `correo`/`cedula` intactos (regresión) |
| 8 | **`PATCH /api/auth/me/update/ {"correo":""}` como ADMIN** | **400** (regresión) |
| 9 | **`POST /api/sales/` como CAJERO** | **201** (regresión: el POS vende) |
| 10 | **`seed_dev_data` dos veces** | sin errores, idempotente (regresión) |

3. Decí qué enfoque elegiste para cada puerta y por qué.
4. Veredicto ✅ / 🔴.

**Doble actualización:** `el_vuelto_backend/CLAUDE.md` — documentá que `/admin/` **no** es una vía válida de administración de tenants, que los admins de tenant ya no son `is_staff`, y el gotcha de `PUT`+multipart con booleanos (es una trampa de DRF que se va a repetir).

> [!warning] Si algo no cuadra
> Pará y reportá con `archivo:línea`. Todo lo de arriba se verificó ejecutando el 2026-08-05, pero el código manda.
