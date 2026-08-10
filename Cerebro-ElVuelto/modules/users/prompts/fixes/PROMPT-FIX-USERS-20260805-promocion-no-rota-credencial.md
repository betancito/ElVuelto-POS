---
tags: [prompt, users, auth, seguridad, fix]
status: 🔴
module: users
updated: 2026-08-05
---

# 🔒 Prompt DEV — Subir de rol no puede dejar la credencial vieja

**Tarea backlog:** [[USERS-20260805-promocion-no-rota-credencial]]
**Alcance:** una regla en `UserCreateSerializer`. Probablemente 1 archivo del backend (2 si elegís tocar el front). No git.

## La invariante

> **La contraseña de un usuario siempre cumple la política de su rol actual.** Incluso después de un cambio de rol.

## El problema

`UserCreateSerializer.validate` evalúa la política **solo sobre la contraseña que viene en el request**:
```python
password = data.get("password")
if password is not None and len(password) < min_length_for(rol):
    raise serializers.ValidationError({"password": length_error_for(rol)})
```
Un `PATCH` que cambia `rol` y no manda `password` no valida nada, y `update()` solo llama a `set_password` si llegó una. **El rol sube; el hash se queda.**

Verificado por el Planner:
```
control: POST crear ADMIN con password "1234"   → 400  (la política de 12 existe)
PATCH cajero → {"rol":"ADMIN","correo":"..."}   → 200
   rol: ADMIN · cedula: 'PR1' · check_password("1234"): True
   login PÚBLICO /auth/login/cashier/ con cédula + PIN "1234" → OK, token con rol: ADMIN
```

**Por qué importa de verdad:**
- Es **el flujo normal de la UI**: el modal de edición de `UsersPage` manda `rol` + `correo` y **nunca** `password` (no hay campo). El admin cambia el rol, guarda, y ya tiene un ADMIN con PIN.
- El PIN es un secreto de baja calidad **por diseño** (se teclea en público, es shoulder-surfeable) y se asumió que solo protegía al CAJERO. Ahora protege el rol más alto del tenant.
- El PATCH no borra la `cedula`, así que el promovido **sigue entrando por el login público de cajero** — el de menor barrera. Reventar ese espacio ahora puede dar un token de **ADMIN**.
- El mismo estado final que un POST rechaza con 400 se alcanza con un PATCH que devuelve 200.

## Qué hacer

En `UserCreateSerializer.validate`, comparar el **rol resultante** con el **rol almacenado** (`self.instance.rol`) y actuar cuando el mínimo **sube** (`min_length_for(rol_nuevo) > min_length_for(rol_viejo)`).

**Elegí una y justificá en el reporte:**

- **(a) Exigir `password` en ese PATCH** → 400 si no viene, con un mensaje que explique que subir de rol requiere una contraseña nueva.
  *Contra:* obliga a tocar el modal del front para pedirla.
- **(b) Rotarla automáticamente** con `generate_new_password(rol_nuevo)` y devolverla en la respuesta, como hace `reset_password`.
  *Contra:* cambia el contrato de la respuesta del PATCH.

Mi inclinación es **(b)** — es la que no deja al admin a medio camino y reusa maquinaria que ya existe. Pero decidí vos: si elegís (a), **no toques el front en este prompt**; reportá que hace falta y lo mando en otro.

⚠️ **Solo cuando el mínimo SUBE.** Bajar de ADMIN a CAJERO no debe rotar nada (una contraseña de 12 cumple de sobra la política de 4).
⚠️ **No toques** la política en sí (`password_policy.py`) ni el PIN de 4 dígitos — es decisión del owner.

## Restricciones
- Solo `apps/users/serializers.py` (+ front únicamente si elegís (a) y decidís hacerlo, avisando).
- Sin migraciones.
- ⚠️ **No rompas** nada de lo entregado: invariante correo/cédula, `User.clean()`, PUT deshabilitado, throttling, guards de tenancy, pisos de dinero/stock, refresh con usuario activo.

## Entregable / verificación
1. `makemigrations --check --dry-run` → sin cambios.
2. Pegá request/respuesta:

| # | Caso | Esperado |
|---|---|---|
| 1 | `PATCH {"rol":"ADMIN","correo":"..."}` sobre un CAJERO con PIN | según tu opción: **400** pidiendo password, o **200** con la contraseña nueva |
| 2 | Tras el caso 1: `check_password("1234")` sobre ese usuario | **False** |
| 3 | Tras el caso 1: login por `/auth/login/cashier/` con el PIN viejo | **rechazado** |
| 4 | `PATCH {"rol":"CAJERO"}` sobre un ADMIN (baja de rol) | **200**, **sin** rotar la contraseña |
| 5 | **`PATCH {"nombre":"X"}` sin cambiar rol** | **200**, contraseña intacta (regresión) |
| 6 | **`POST /api/users/` crear cajero y crear admin** | **201** ambos (regresión) |
| 7 | **`POST /api/users/{id}/reset_password/`** | **200** con contraseña acorde al rol (regresión) |
| 8 | **Login de cajero + `POST /api/sales/`** | **200/201** (regresión: el POS vende) |

3. Decí qué opción elegiste y por qué.
4. Veredicto ✅ / 🔴.

**Doble actualización:** `el_vuelto_backend/CLAUDE.md` (Password policy) — que un cambio de rol que sube el mínimo rota/exige credencial, y por qué.

> [!warning] Si algo no cuadra
> Pará y reportá con `archivo:línea`. Verificado ejecutando el 2026-08-05, pero el código manda.
