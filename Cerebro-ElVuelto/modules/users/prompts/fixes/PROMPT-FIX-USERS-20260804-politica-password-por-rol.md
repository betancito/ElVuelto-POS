---
tags: [prompt, users, fix, backend, password]
status: 🔴
module: users
updated: 2026-08-04
---

# Prompt DEV — Una sola política de contraseñas, coherente por rol

**Tarea backlog:** [[USERS-20260802-unificar-reglas-password]] · **Sprint:** [[Sprint-2026-08-04-users-hardening]] (último ítem)
**Alcance:** unificar la política en **una fuente de verdad** y aplicarla. Backend + un archivo del front. No git.

## Decisión del owner que estás implementando (no la re-discutas)

> El **PIN de 4 dígitos del CAJERO es intencional** (pantalla táctil sin teclado). **No se aplana** la política: queda **coherente por rol** — cajero = PIN de 4 dígitos numérico, admin = contraseña fuerte — y se documenta.

Tu trabajo **no** es endurecer el cajero. Es que las 5 implementaciones que hoy existen digan lo mismo.

## El desorden actual (verificado el 2026-08-04)

| # | Punto | Regla hoy | Ancla |
|---|---|---|---|
| 1 | Crear usuario (DRF) | `min_length=4` — **sin distinguir rol**: la API acepta un ADMIN con password de 4 | `apps/users/serializers.py:150` |
| 2 | Login cajero (DRF) | `min_length=4` | `apps/users/serializers.py:91` |
| 3 | Reset — CAJERO | 4 dígitos | `apps/users/serializers.py:238-240` |
| 4 | Reset — ADMIN | **10** chars, símbolos `!@#$%` | `apps/users/serializers.py:241-248` |
| 5 | Generar al crear — ADMIN (front) | **12** chars, símbolos `!@#$%&*` | `utils/generatePassword.ts:11-22` |
| 6 | Generar al crear — CAJERO (front) | 4 dígitos | `utils/generatePassword.ts:24-30` |
| 7 | Cambio en perfil | **min 6** (back y front) | `apps/users/views.py:85` · `ProfilePage.tsx:22` |
| 8 | Admin inicial de un tenant | `secrets.token_urlsafe(12)` (~16 chars) | `apps/tenants/serializers.py:72` |

**Las incoherencias concretas:** un ADMIN se crea con mínimo 4 (#1) pero al cambiarla en su perfil el mínimo sube a 6 (#7); su password autogenerada mide 12 al crear (#5), 10 al restablecer (#4) y ~16 al dar de alta el tenant (#8); y los conjuntos de símbolos difieren (`!@#$%&*` vs `!@#$%`).

## Qué hacer (pasos)

### 1. Definir la política en UN solo lugar del backend
Crea un módulo pequeño — sugerencia `apps/users/password_policy.py` — con la política **por rol** y **una sola** función de generación:

```python
PIN_LENGTH = 4                 # CAJERO
ADMIN_PASSWORD_LENGTH = 12     # ADMIN / SUPERADMIN
ADMIN_SYMBOLS = "!@#$%&*"

def min_length_for(rol) -> int: ...        # CAJERO -> 4, resto -> 12
def generate_password(rol) -> str: ...     # reemplaza generate_new_password
```
Elegí **12** y `!@#$%&*` como canónicos porque es lo que ya ve el admin al crearse su cuenta (#5) — bajar a 10 sería un retroceso. Si preferís otro número, decilo en el reporte, pero que sea **uno solo**.

### 2. Aplicar la política en el backend
- `generate_new_password` (`serializers.py:238-248`) pasa a delegar en `generate_password(rol)`. Mantené el nombre exportado si algo más lo importa (verificá con grep).
- `UserCreateSerializer.password` (`:150`): el `min_length=4` fijo debe volverse **condicional por rol**. Como el `min_length` del campo no ve el `rol`, hacé la comprobación en `validate()` (donde ya tenés el `rol` resuelto contra la instancia, del fix anterior) y devolvé 400 `{"password": "..."}`. **Ojo:** en un `PATCH` que no manda `password` no debe validarse nada.
- `UpdateMeView` (`views.py:85`): el `< 6` fijo pasa a `min_length_for(user.rol)`. Mensaje de error acorde (`"Mínimo N caracteres."` / para cajero, algo como `"El PIN debe tener 4 dígitos."`).
- **No toques** `apps/tenants/serializers.py:72` en este prompt salvo que sea un one-liner obvio para usar `generate_password(ADMIN)`; si te obliga a tocar más de esa línea, déjalo y repórtalo.

### 3. Alinear el front (solo `generatePassword.ts`)
`utils/generatePassword.ts` debe producir **la misma forma** que el backend: 12 chars y símbolos `!@#$%&*` para admin (ya lo hace — verificá y dejá un comentario que apunte a la política del backend como fuente de verdad), 4 dígitos para cajero. Si tu decisión del paso 1 cambió la longitud, actualizá acá también.
Actualizá `ProfilePage.tsx:22` (`min(6)`) para que coincida con el mínimo del rol del usuario logueado.

## Fuera de alcance (no lo hagas)
- ❌ **No cablees `AUTH_PASSWORD_VALIDATORS`.** Está declarado en `settings/base.py:73-78` y verificado que **nunca se ejecuta** (`validate_password` no aparece en ningún `.py`). Activarlo **rompería el PIN de 4 dígitos**. Hay una pregunta abierta con el owner (P-3 en [[2026-08-04-planner-paso0-resync]]). Si lo tocás, el review falla.
- ❌ No toques `create_superadmin.py` (archivo nuevo sin commitear).
- ❌ No cambies el flujo de login, ni `reset_password`/`toggle_active` como endpoints, ni el guard de correo que acabás de entregar.

## Restricciones
- Stack inmutable. Claves de error en español. No cambies el contrato de la API.
- **Doble actualización:** `el_vuelto_backend/CLAUDE.md` — documentá la política **por rol** en una tabla (cajero PIN 4 dígitos / admin 12 chars + símbolos) y decí explícitamente que `AUTH_PASSWORD_VALIDATORS` está declarado pero **no cableado**, y por qué.

## Entregable / verificación
Reporte con **salida real**:
1. `python manage.py makemigrations --check --dry-run` → sin cambios pendientes (pegá la salida).
2. `npm run typecheck` en `el_vuelto_frontend/` → limpio (pegá la salida).
3. Pegá request/respuesta de estos casos:

| # | Caso | Esperado |
|---|---|---|
| 1 | `POST /api/users/` ADMIN con `password` de 4 chars | **400** `{"password": …}` |
| 2 | `POST /api/users/` ADMIN con password de 12 | **201** |
| 3 | `POST /api/users/` CAJERO con PIN de 4 | **201** (no se rompió el cajero) |
| 4 | `PATCH /api/users/{id}/ {"nombre": "X"}` sin `password` | **200**, sin validar password |
| 5 | `POST /api/users/{id_admin}/reset_password/` | password de **12** chars con símbolos de `!@#$%&*` |
| 6 | `POST /api/users/{id_cajero}/reset_password/` | **4 dígitos** |
| 7 | `PATCH /api/auth/me/update/ {"current_password": …, "new_password": "12345"}` como ADMIN | **400** (mínimo del rol) |

4. Veredicto ✅ / 🔴.

> [!warning] Si algo no cuadra con el código que ves
> Pará y reportá la discrepancia con `archivo:línea`. Las anclas se verificaron el 2026-08-04 **después** del fix de la invariante de correo, así que los números ya incluyen ese desplazamiento — pero el código manda.
