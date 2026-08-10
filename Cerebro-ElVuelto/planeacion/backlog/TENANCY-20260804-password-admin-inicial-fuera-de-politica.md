---
tags: [tarea, tenancy, users, consistencia]
status: 🔴
prioridad: baja
updated: 2026-08-04
---

# TENANCY-20260804-password-admin-inicial-fuera-de-politica — El 5º generador de contraseñas

**Tipo:** consistencia · **Descubierto:** review de [[RUN-20260804-politica-password-por-rol]]

## Problema
[[USERS-20260802-unificar-reglas-password]] unificó la política en `apps/users/password_policy.py` (CAJERO = PIN de 4 dígitos, ADMIN = 12 chars con `!@#$%&*`) y enrutó ahí a los 4 consumidores del app `users`. Pero **el admin inicial de un tenant sigue generándose aparte**:

```python
initial_password = secrets.token_urlsafe(12)   # apps/tenants/serializers.py:72
```

`token_urlsafe(12)` produce ~16 caracteres del alfabeto URL-safe (`A-Za-z0-9-_`) — más largo que la política, pero **sin ningún símbolo de `ADMIN_SYMBOLS` garantizado** y con un alfabeto distinto al que documenta el `CLAUDE.md`. El prompt de la política dejó explícitamente este punto fuera si obligaba a tocar más de esa línea.

No es inseguro (16 chars aleatorios de `secrets` es fuerte); es **incoherente**: el `CLAUDE.md` afirma que `password_policy.py` es "the **only** place the policy lives" y este camino la contradice.

## Criterio de aceptación
El admin inicial de un tenant se genera con `password_policy.generate_password(UserRole.ADMIN)`, o el `CLAUDE.md` deja de afirmar que la política es la única fuente y documenta esta excepción con su razón.

## Notas para el Dev
- Es probablemente un cambio de una línea + el import. Verificá que `TenantCreateSerializer` siga devolviendo `initial_admin_password` en la respuesta y que el PDF de credenciales del front no asuma una longitud fija.
- Relacionado, misma familia: `create_superadmin.py` **no aplica ninguna política** (acepta lo que venga de `--password`/env/`getpass`). Ver [[reglas-password-divergentes]].
