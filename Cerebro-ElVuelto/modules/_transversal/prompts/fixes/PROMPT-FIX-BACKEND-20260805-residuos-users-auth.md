---
tags: [prompt, backend, users, auth, seguridad, fix]
status: 🔴
module: _transversal
updated: 2026-08-05
---

# 🔒 Prompt DEV — Los tres huecos que quedaron a medias en users/auth

**Tarea backlog:** [[BACKEND-20260805-cerrar-residuos-users-auth]]
**Alcance:** 2 archivos + 1 migración de datos. No git. No tocar el front.

Tres cosas de la misma zona, **todas verificadas ejecutando**. Dos porque el guard se escribió mirando solo a `UserRole.ADMIN`; una porque el fix anterior no fue retroactivo.

---

## 1. Tu fix de `is_staff` no alcanzó a las filas que ya existían

En [[RUN-20260805-cerrar-puertas-traseras]] sacaste `is_staff=True` de `_create_initial_admin`. Correcto — pero **solo aplica a admins nuevos**. Verificado en la BD de dev: **1 de 2** admins de tenant sigue con `is_staff=True` (`juan@laesperanza.com`).

En dev es una fila. En un despliegue real serían **todos los admins de tenant creados hasta hoy** — justo las cuentas cuya exposición motivó el ticket. `is_staff` es lo que Django mira para dejar entrar a `/admin/`.

**Qué hacer:** una **migración de datos** que ponga `is_staff=False` en todo `User` con `rol=ADMIN`.
- ⚠️ **No toques los SUPERADMIN**: lo necesitan para `/admin/`.
- Poné `reverse_code=migrations.RunPython.noop` (no tiene sentido revertirla).
- Pegá el `makemigrations` y decí **cuántas filas** toca.

## 2. `UpdateMeView` deja al SUPERADMIN borrarse su propio correo

El guard es `if user.rol == UserRole.ADMIN and not correo`. El SUPERADMIN no entra en esa comparación — pero su `correo` **también** es `USERNAME_FIELD` y es su **única** vía de login: no tiene `tenant_id`, así que el login por cédula no le sirve.

Verificado:
```
PATCH /api/auth/me/update/ {"correo": ""} como SUPERADMIN → 200
correo quedó en: None
```
El administrador de la plataforma queda **fuera y sin forma de volver**, salvo shell o BD. Hoy no es alcanzable desde la UI (el super-admin no tiene pantalla de perfil), pero la API está abierta.

**Qué hacer:** que el guard cubra **todo rol cuyo login dependa del correo** — ADMIN **y** SUPERADMIN. Pensalo como *"si este usuario no tiene otra credencial de login, no lo dejes sin correo"*, no como una lista de roles que hay que ir ampliando.

## 3. Espacios en blanco guardan `""` en vez de `NULL` → `IntegrityError` 500

```python
correo = data["correo"].strip() if data["correo"] else None   # apps/users/views.py
```
`"   "` es truthy ⇒ `.strip()` da `""` ⇒ se guarda **cadena vacía**, no `NULL`. Como `correo` es `unique`, el **segundo** usuario que lo haga colisiona.

Verificado:
```
cajero 1: PATCH /me/update/ {"correo": "   "} → 200, correo en BD: ''
cajero 2: PATCH /me/update/ {"correo": "   "} → IntegrityError:
          duplicate key value violates unique constraint "users_correo_key"
          DETAIL: Key (correo)=() already exists.
```
DRF **no** mapea `IntegrityError` ⇒ **500** en producción.

**Qué hacer:** normalizá el blanco a `None` **antes** de decidir nada (`(data["correo"] or "").strip() or None`, que es justo lo que ya hace `UserCreateSerializer.validate`). Con eso el punto 2 también queda bien planteado: `"   "` para un ADMIN debe dar 400, no guardar `""`.

> [!info] Los puntos 2 y 3 son el mismo bloque de código
> Resolvelos juntos: primero normalizás, después aplicás el guard sobre el valor ya normalizado.

---

## Restricciones
- Solo `apps/users/views.py` + la migración de datos en `apps/users/migrations/`. **Nada de front.**
- ⚠️ **No rompas** lo entregado: `User.clean()`, PUT deshabilitado (`METHODS_WITHOUT_PUT`), la invariante del correo por API, la política de password, los guards de tenancy, el seed.
- Claves de error en español. No cambies el contrato de la API.

## Entregable / verificación
1. `makemigrations` (pegá la salida) y `migrate` (pegá la salida). Decí cuántas filas toca la migración de datos.
2. Pegá request/respuesta:

| # | Caso | Esperado |
|---|---|---|
| 1 | `PATCH /me/update/ {"correo":""}` como **SUPERADMIN** | **400** |
| 2 | `PATCH /me/update/ {"correo":"   "}` como **ADMIN** | **400** (no guarda `""`) |
| 3 | `PATCH /me/update/ {"correo":"   "}` como **CAJERO** | **200**, y en la BD queda **`None`**, no `''` |
| 4 | Dos CAJEROS distintos hacen el caso 3 | ambos **200**, **sin `IntegrityError`** |
| 5 | Tras migrar: `User.objects.filter(rol=ADMIN, is_staff=True).count()` | **0** |
| 6 | Tras migrar: `User.objects.filter(rol=SUPERADMIN, is_staff=True).count()` | **> 0** (no se tocaron) |
| 7 | **`PATCH /me/update/ {"correo":"nuevo@x.co"}` como ADMIN** | **200** (regresión) |
| 8 | **`PATCH /me/update/ {"nombre":"X"}` como ADMIN** | **200**, correo intacto (regresión) |
| 9 | **`/admin/` crear CAJERO sin cédula** | sigue **rechazado** (regresión de `User.clean()`) |
| 10 | **`PUT /api/users/{id}/` multipart** | sigue **405** (regresión) |
| 11 | **`POST /api/sales/` como CAJERO** | **201** (regresión: el POS vende) |

3. Veredicto ✅ / 🔴.

**Doble actualización:** `el_vuelto_backend/CLAUDE.md` — que `is_staff` es solo de SUPERADMIN (y por qué), y que `/api/auth/me/update/` exige correo a todo rol que dependa de él.

> [!warning] Si algo no cuadra
> Pará y reportá con `archivo:línea`. Todo lo de arriba se verificó ejecutando el 2026-08-05, pero el código manda.
