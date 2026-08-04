---
tags: [riesgo, users]
status: abierto
module: users
severidad: media
updated: 2026-08-02
---

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
