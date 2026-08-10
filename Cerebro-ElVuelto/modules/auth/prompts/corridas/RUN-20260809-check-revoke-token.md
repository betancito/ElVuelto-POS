---
tags: [corrida, auth, seguridad]
status: 🟢 corrido-ok
module: auth
updated: 2026-08-09
---

# RUN 2026-08-09 — `CHECK_REVOKE_TOKEN`: cambiar la contraseña revoca tokens ya emitidos

**Prompt:** [[PROMPT-FIX-AUTH-20260809-check-revoke-token]]
**Tarea:** [[BACKEND-20260805-sin-revocacion-de-sesiones]]
**Decisión:** [[ADR-G-20260809-revocacion-check-revoke-token]]
**Veredicto:** ✅ **PASÓ** — verificado con requests HTTP reales de punta a punta (`APIClient`, con rollback) + medición real de costo.

## Qué se entregó
- `SIMPLE_JWT["CHECK_REVOKE_TOKEN"] = True` (`elvuelto/settings/base.py`) — 1 línea + comentario.
- `ActiveUserTokenRefreshSerializer.validate()` (`apps/users/serializers.py`) — el Dev **extendió** el chequeo existente de `is_active` para que también compare el claim `hash_password` contra el actual, guardado detrás de `if api_settings.CHECK_REVOKE_TOKEN`. Esto **no estaba pedido explícitamente** en el prompt (que asumía que el setting solo bastaba), pero es correcto y necesario: leyendo `simplejwt` se confirma que `TokenRefreshSerializer.validate()` base **nunca llama** `JWTAuthentication.get_user()` — solo copia claims al access token nuevo vía `RefreshToken.access_token`. Sin este agregado, `POST /auth/refresh/` con un refresh viejo seguía devolviendo **200** (con un access ya condenado, pero 200 al fin), y por la misma razón documentada para `is_active`, eso mantiene inalcanzable la rama de `logout()` del front.
- `el_vuelto_backend/CLAUDE.md` — doble actualización completa y exacta: tabla del mecanismo, advertencia de despliegue (invalida todas las sesiones activas una vez), y el número real de costo medido.

## 👏 Otra vez, el Dev verificó en vez de asumir
Mi prompt decía "probablemente cero líneas de código" basado en leer `tokens.py`/`authentication.py`. El Dev leyó también `serializers.py` de simplejwt (`TokenRefreshSerializer.validate`) y encontró que la propagación al refresh **no es automática a nivel de respuesta HTTP** — solo a nivel de claim copiado. Es la segunda corrida seguida en la que el Dev corrige una asunción mía leyendo el código en vez de seguir el prompt literal. Patrón a repetir: mis prompts declaran la investigación que hice, no una verdad cerrada — "si ves algo distinto, parate y reportá" está funcionando.

## Verificación ejecutada — HTTP real, de punta a punta (`APIClient`, rollback)
```
1) login cajero                                    → 200
2) access token funciona antes del reset            → 200
3) reset de password (set_password + save)
4) MISMO access token viejo → GET /products/pos/    → 401 {"password_changed"} (mensaje de simplejwt)
5) MISMO refresh token viejo → POST /auth/refresh/  → 401 {"password_changed", "La contraseña fue cambiada..."}
6) re-login con la password nueva                   → 200
7) access token nuevo funciona                       → 200
8) 5 requests seguidos de una sesión NO afectada     → 200 en las 5 (regresión: nadie se cae sin motivo)
9) costo real: CaptureQueriesContext en /products/pos/, mismo request, flag ON vs OFF (override_settings)
   → 3 queries CON el flag, 3 SIN el flag. Cero queries extra — confirma la afirmación del Dev empíricamente.
```
`makemigrations --check --dry-run` → sin cambios (no toca modelos, como se esperaba).

## Checklist de trampas
**#4 permisos**: no aplica (no hay endpoint nuevo). **#7 errores**: mensaje en español, `code: password_changed`, consistente con el patrón ya usado para `user_inactive`. **#9 migraciones**: confirmado sin cambios. **#10 doble actualización**: ✅, y con un número medido, no una suposición. **#11**: sin git, sin scope creep — el único archivo tocado fuera de lo mínimo (`serializers.py`) es la extensión necesaria del mismo serializer que el prompt ya sabía que existía, para la misma invariante.

## Cierra
[[BACKEND-20260805-sin-revocacion-de-sesiones]] → 🟢. Con esto, **[[CRITERIO-CIERRE-ESTABILIZACION]] queda con las 4 condiciones cumplidas.**
