---
tags: [corrida, users, fix, backend, password]
status: 🟢 corrido-ok
module: users
updated: 2026-08-04
---

# RUN 2026-08-04 — Política de contraseñas por rol (users)

**Prompt:** [[PROMPT-FIX-USERS-20260804-politica-password-por-rol]] · **Tarea:** [[USERS-20260802-unificar-reglas-password]]
**Sprint:** [[Sprint-2026-08-04-users-hardening]] (último ítem) · **Veredicto:** ✅ PASÓ

> [!info] Verificación ejecutada por el Planner
> El Dev no adjuntó salida. Corrí `npm run typecheck`, `makemigrations --check`, los **7 casos** del criterio, **3 adversariales** y **6 de regresión** sobre el fix anterior (mismo `validate()`). **16/16 en verde.**

## Diff entregado
**Nuevo:** `apps/users/password_policy.py` (65 líneas). **Modificados:** `apps/users/serializers.py`, `apps/users/views.py`, `el_vuelto_backend/CLAUDE.md`, `src/utils/generatePassword.ts`, `src/features/users/ProfilePage.tsx`.

## Qué hizo
- **Fuente única** (`password_policy.py`): `PIN_LENGTH=4`, `ADMIN_PASSWORD_LENGTH=12`, `ADMIN_SYMBOLS="!@#$%&*"`, más `min_length_for(rol)`, `length_error_for(rol)` y `generate_password(rol)`. El docstring explica **por qué** no se aplana y advierte sobre `AUTH_PASSWORD_VALIDATORS`.
- `UserCreateSerializer.password` pierde el `min_length=4` fijo (el campo no ve el `rol`) y la comprobación pasa a `validate()`, contra el rol ya resuelto del fix anterior. Un `PATCH` sin `password` no valida nada. ✅
- `UpdateMeView`: el `< 6` fijo → `min_length_for(user.rol)`. ✅
- `generate_new_password` queda como alias delgado — mantiene el nombre que importa `views.py`. ✅
- `CashierLoginSerializer.password` ancla su piso en `PIN_LENGTH`. ✅
- Front: `generatePassword.ts` exporta `PIN_LENGTH`/`ADMIN_PASSWORD_LENGTH` y las usa para derivar longitudes; `ProfilePage` construye su Zod con `makePasswordSchema(user?.rol)` vía `useMemo`, con mensajes **literales** a los de `length_error_for`. ✅

> [!decision] Mejora no pedida pero correcta: `random` → `secrets`
> El generador anterior usaba `random` (Mersenne Twister, predecible). El Dev migró a `secrets` + `secrets.SystemRandom().shuffle`. Son credenciales reales que se le entregan a una persona: es la decisión correcta, dentro del alcance ("una sola función de generación") y no es scope creep. Verificado: `grep random\.` en `apps/users/serializers.py` → **0 hits**.

## Verificación (16/16)

`npm run typecheck` → **EXIT=0** · `makemigrations --check --dry-run` → **No changes detected**

**Criterio de aceptación (7/7):**
| # | Caso | Resultado |
|---|---|---|
| 1 | POST admin, password de 4 | **400** `Mínimo 12 caracteres.` |
| 2 | POST admin, password de 12 | **201** |
| 3 | POST cajero, PIN de 4 | **201** — el cajero no se rompió |
| 4 | PATCH `{"nombre"}` sin password | **200**, no valida password |
| 5 | reset ADMIN | **12** chars, con símbolo + dígito + mayúscula (`FEfxs9Uh&yl$`) |
| 6 | reset CAJERO | **4** dígitos (`4205`) |
| 7 | PATCH me `new_password:"12345"` ADMIN | **400** `Mínimo 12 caracteres.` |

**Adversariales (3/3):** POST cajero con PIN de 3 → **400** `El PIN debe tener 4 dígitos.` · PATCH me con 12 chars ADMIN → **200** · PATCH me con PIN de 4 como CAJERO → **200**.

**Regresión sobre [[RUN-20260804-invariante-correo-admin]] (6/6):** PATCH `{"nombre"}` no borra correo ni cédula · `correo:""` → 400 en ambos caminos · correo inválido → 400 · promover CAJERO→ADMIN sin correo → 400. **Nada se rompió.**

## Límites duros: los tres respetados
- ✅ **`AUTH_PASSWORD_VALIDATORS` sigue SIN cablear.** `grep -rn validate_password apps/ elvuelto/` → único hit es el comentario del propio `password_policy.py` que explica por qué no se cablea. La P-3 con el owner sigue abierta y sin forzar.
- ✅ `create_superadmin.py` intacto (mtime 2026-08-03 21:20, anterior a esta sesión).
- ✅ `apps/tenants/serializers.py` sin tocar.

## Checklist de trampas
**#5 naming** ✅ mensajes en español, clave `password` · **#7 errores 400** ✅ por campo · **#8 validación divergente** ✅ **esto la cierra**: front y back derivan de las mismas constantes y los mensajes son literales · **#9 migraciones** ✅ · **#10 doble actualización** ✅ sección "Password policy — per role, one source of truth" en `backend/CLAUDE.md`, con la advertencia de `AUTH_PASSWORD_VALIDATORS` · **#11** ✅ sin git, sin scope creep.

## Residual (no bloquea)
- 🟡 **Queda un 5º generador fuera de la política:** `apps/tenants/serializers.py:72` sigue usando `secrets.token_urlsafe(12)` (~16 chars, alfabeto URL-safe, sin símbolo garantizado de `ADMIN_SYMBOLS`) para el admin inicial de un tenant. El prompt permitía dejarlo. → [[TENANCY-20260804-password-admin-inicial-fuera-de-politica]]
- 🟡 Los usuarios de `seed_dev_data` (`admin123`, 8 chars) quedan por debajo del mínimo nuevo: **siguen pudiendo entrar** (el login no valida longitud) pero no pueden cambiar su contraseña por una parecida. Es dato de dev, no de producción.
