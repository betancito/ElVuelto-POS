---
tags: [prompt, auth, seguridad, fix]
status: 🔴
module: auth
updated: 2026-08-09
---

# 🔒 Prompt DEV — Activar `CHECK_REVOKE_TOKEN`: que cambiar la contraseña revoque tokens ya emitidos

**Tarea backlog:** [[BACKEND-20260805-sin-revocacion-de-sesiones]]
**Decisión:** [[ADR-G-20260809-revocacion-check-revoke-token]]
**Alcance:** 1 línea de settings + verificación. Probablemente **cero** líneas de código de aplicación — leé la sección "Por qué no hace falta tocar nada más" antes de tocar cualquier archivo. No git.

## La invariante

> **Cambiar la contraseña de un usuario (por `reset_password` o cualquier otro camino) invalida, de inmediato, todo token emitido antes del cambio.**

## El problema

`reset_password` cambia el hash pero ningún token ya emitido se entera. Verificado de punta a punta en [[BACKEND-20260805-sin-revocacion-de-sesiones]]:
```
1. admin resetea el PIN del cajero                  → 200 {"new_password": "1663"}
2. el PIN viejo ya no sirve para logins nuevos      → True
3. token ROBADO (previo al reset) POST /api/sales/  → 201  ← VENTA CREADA
```
`reset_password`/`toggle_active` son la única remediación real contra un PIN comprometido, y hoy solo cortan **logins nuevos** — no la sesión que ya está viva.

## Qué hacer

En `el_vuelto_backend/elvuelto/settings/base.py:147-154`, en el diccionario `SIMPLE_JWT`, agregá:
```python
"CHECK_REVOKE_TOKEN": True,
```
(el default de `REVOKE_TOKEN_CLAIM` es `"hash_password"` — no hace falta declararlo salvo que quieras otro nombre de claim).

## Por qué no hace falta tocar nada más (verificado en el código instalado de `djangorestframework-simplejwt==5.3.1`, no asumido)

- `Token.for_user()` (`tokens.py:197-215`) — cuando `CHECK_REVOKE_TOKEN` es `True`, mete un claim `hash_password` = MD5 del `user.password` **al momento de emitir el token**. Los tres caminos de login de esta app pasan por acá: `CustomTokenObtainPairSerializer.get_token` → `super().get_token(user)` → `TokenObtainPairSerializer.get_token` → `RefreshToken.for_user(user)`; y `CashierLoginSerializer.validate` (`apps/users/serializers.py:150`) llama **directamente** `CustomTokenObtainPairSerializer.get_token(user)` — mismo camino. Ningún serializer de esta app construye un token "a mano" evitando `for_user()`.
- `JWTAuthentication.get_user()` (`authentication.py:120-144`) — en **cada** request autenticado, si `CHECK_REVOKE_TOKEN` es `True`, compara el claim del token contra `get_md5_hash_password(user.password)` **actual**; si no coincide (la contraseña cambió después de que el token se emitió) → `AuthenticationFailed("The user's password has been changed.", code="password_changed")` → **401**. Esta es la función que YA se ejecuta en cada request para chequear `is_active` — no es un camino nuevo.
- `RefreshToken.access_token` (`tokens.py:335-356`) — al refrescar, **copia** todos los claims del refresh token al access token nuevo, `hash_password` incluido. Un refresh token emitido *antes* de un cambio de contraseña sigue llevando el hash *viejo* para siempre → todo access token que genere después también lo lleva → sigue siendo rechazado por `get_user()`. La revocación se propaga sola a través del refresh, sin tocar `ActiveUserTokenRefreshSerializer`.

**Sobre el costo (la condición no negociable del ADR):** `JWTAuthentication.get_user()` YA hace `self.user_model.objects.get(...)` en **cada** request autenticado hoy — es como valida `is_active` ahora mismo. `CHECK_REVOKE_TOKEN` no agrega una query nueva: agrega un `hashlib.md5(user.password...)` en memoria sobre un objeto que ya se cargó. La suposición original de "una query extra por request" (en el ítem del backlog) no se sostiene leyendo el código instalado — confirmalo vos también antes de medir, y medí igual (ver verificación).

## Restricciones
- Si después de leer `authentication.py`/`tokens.py` en tu entorno ves algo distinto a lo descrito arriba (versión de paquete distinta, override que no vi), **parate y reportá** — no fuerces el cambio igual.
- No instales `token_blacklist` ni cambies `ROTATE_REFRESH_TOKENS` — eso es la alternativa que el ADR descartó por ahora.
- No toques `password_policy.py`, throttles, guards de tenancy, ni nada del fix de slug recién entregado.

## Entregable / verificación

1. `python manage.py makemigrations --check --dry-run` → sin cambios (esto no toca modelos).
2. Reproducí el escenario exacto de arriba y confirmá que ahora corta:

| # | Caso | Esperado |
|---|---|---|
| 1 | Login normal (admin o cajero) | 200, funciona igual que hoy (regresión) |
| 2 | `POST /api/users/{id}/reset_password/` sobre un cajero, y **el token viejo de ese cajero** hace `POST /api/sales/` | **401** `password_changed` (el caso que hoy da 201 — esto es lo que hay que cerrar) |
| 3 | Mismo caso 2 pero con el **refresh token viejo** intentando `POST /auth/refresh/` | **401** (no debe entregar un access nuevo válido) |
| 4 | Un usuario que **no** cambió su contraseña sigue usando su sesión normalmente durante varios requests seguidos | 200/201 en todos (regresión — no se cae nadie sin motivo) |
| 5 | **Costo real en el POS**: loguéate como cajero y hacé ~40 requests seguidos a `/api/products/pos/` y ~10 `POST /api/sales/` | Sin degradación perceptible, sin 401 espurios (mismo criterio que ya se usó para verificar el throttling) |
| 6 | Login de SUPERADMIN (sin tenant) | Sigue funcionando igual (regresión) |

3. Efecto secundario esperado, decilo en el reporte para que quede documentado: **todas las sesiones activas en este momento se invalidan de una** apenas se despliega el cambio (ningún token emitido antes de hoy tiene el claim `hash_password`, así que el primer request de cada uno falla el chequeo). En dev no importa; es un dato para el futuro deploy a producción.
4. Veredicto ✅ / 🔴.

**Doble actualización:** `el_vuelto_backend/CLAUDE.md` — la nota actual dice *"reset_password revokes nothing"* (sección Refreshing / la advertencia sobre revocación). Corregirla: ahora sí revoca, vía `CHECK_REVOKE_TOKEN`, y explicar el mecanismo (claim `hash_password`, sin query extra, efecto en refresh).

> [!warning] Si algo no cuadra
> Pará y reportá con `archivo:línea`. La investigación de esta vez fue leyendo el código **instalado** de `simplejwt` en este mismo entorno (`.venv/lib/python3.12/site-packages/rest_framework_simplejwt/`), no la documentación pública — si tu `pip show djangorestframework-simplejwt` da una versión distinta a 5.3.1, revisá el código vos mismo antes de asumir que este prompt sigue siendo exacto.
