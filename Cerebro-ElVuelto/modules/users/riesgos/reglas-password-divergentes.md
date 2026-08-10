---
tags: [riesgo, users]
status: mitigado
module: users
severidad: media
updated: 2026-08-04
---

> [!done] Mitigado el 2026-08-04 — ✅ [[RUN-20260804-politica-password-por-rol]]
> La política vive ahora en **`apps/users/password_policy.py`** (fuente única): `PIN_LENGTH=4` para CAJERO, `ADMIN_PASSWORD_LENGTH=12` + `ADMIN_SYMBOLS="!@#$%&*"` para ADMIN/SUPERADMIN, con `min_length_for`, `length_error_for` y `generate_password`. Consumen de ahí `UserCreateSerializer.validate`, `UpdateMeView`, `generate_new_password` y `CashierLoginSerializer`; el front deriva sus mínimos de `generatePassword.ts` y `ProfilePage` arma el Zod por rol. Resueltas las divergencias crear(4)↔perfil(6) y 12↔10 chars, y unificado el set de símbolos. Generación migrada de `random` a `secrets`.
>
> **Queda abierto (por eso "mitigado" y no "cerrado"):**
> - `apps/tenants/serializers.py:72` — el admin inicial de un tenant sigue con `secrets.token_urlsafe(12)`. → [[TENANCY-20260804-password-admin-inicial-fuera-de-politica]]
> - `create_superadmin.py` no aplica ninguna política.
> - **`AUTH_PASSWORD_VALIDATORS` sigue declarado y sin ejecutarse** — decisión pendiente del owner (P-3). Documentado como tal en el `CLAUDE.md`.

> [!info] Re-verificado el 2026-08-04 (PASO 0) — sigue ABIERTO, con 3 datos que faltaban
> - **Drift de líneas:** hoy son `serializers.py:150` (no :148) y `:217-230` (no :215-228). Contenido idéntico.
> - **Hay un 4º y un 5º generador**, no 4 reglas: el admin inicial de un tenant se genera con ~16 chars en `apps/tenants/serializers.py:72-74`, y `apps/users/management/commands/create_superadmin.py:58-95` (archivo nuevo, sin commitear) **no aplica ninguna política**: acepta la password tal cual venga de `--password`/`SUPERADMIN_PASSWORD`/`getpass`.
> - 🔑 **`AUTH_PASSWORD_VALIDATORS` está declarado (`settings/base.py:73-78`) pero NUNCA se ejecuta**: `validate_password` no aparece en ningún `.py` del backend. Hoy no valida nada — y si alguien lo cablea sin más, **rompe el PIN de 4 dígitos del cajero**, que el owner decidió mantener. Quien tome esta tarea tiene que decidir esto explícitamente.
> - El único par coherente front↔back es `ProfilePage.tsx:22` ↔ `views.py:70` (ambos 6).

# Riesgo R-5 — Reglas de contraseña divergentes

**Resumen:** No existe una política única de contraseñas. Cuatro puntos del código imponen reglas distintas de longitud/forma, sin fuente de verdad compartida.

## Evidencia (anclada)

| punto | regla | archivo:línea |
|---|---|---|
| Crear usuario — validación DRF | `password` `min_length=4` | `apps/users/serializers.py:148` |
| Generar al crear (ADMIN, front) | **12** chars (4 obligatorios + 8), symbols `!@#$%&*` | `el_vuelto_frontend/src/utils/generatePassword.ts:11-22` |
| Generar al crear (CAJERO, front) | 4 dígitos (`generatePin`) | `utils/generatePassword.ts:24-26` |
| Reset (ADMIN, back) | **10** chars (4 obligatorios + 6), symbols `!@#$%` | `apps/users/serializers.py:216-228` |
| Reset (CAJERO, back) | 4 dígitos | `apps/users/serializers.py:216-217` |
| Cambio en perfil | `new_password` **min 6** (front y back) | `ProfilePage.tsx:23` · `apps/users/views.py:70` |

## Por qué importa
- **Longitud inconsistente** de la contraseña autogenerada de ADMIN: 12 al crear vs 10 al restablecer. El usuario percibe dos "estándares" distintos.
- **Conjunto de símbolos distinto**: front usa `!@#$%&*`, back usa `!@#$%`.
- **Mínimos incoherentes**: se puede crear un usuario con password de 4 (`ser:148`) pero al cambiarla en su perfil el mínimo sube a 6 (`views.py:70`). Un CAJERO con PIN de 4 dígitos que intente cambiarlo por el perfil chocaría con el `min6` (aunque su UI de perfil está tras guard ADMIN, `router.tsx:90`).
- Ninguna regla vive en el **modelo** (`models.py` no tiene validadores de password ni `AUTH_PASSWORD_VALIDATORS` verificados en este scope).

## Mitigación propuesta (no se aplica aquí)
- Definir una constante/policy única (longitud, símbolos, mínimos) y reusarla en `generate_new_password`, `generatePassword.ts`, `UserCreateSerializer` y `UpdateMeView`.
- Decidir si el mínimo de creación (4) y de cambio (6) deben igualarse.
→ backlog + posible ADR. Ver P-3 en [[preguntas-users]].
