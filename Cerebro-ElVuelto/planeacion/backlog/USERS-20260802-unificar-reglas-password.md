---
tags: [tarea, users, mejora]
status: 🟢
prioridad: media
updated: 2026-08-04
---

> [!done] Cerrado 2026-08-04 — ✅ [[RUN-20260804-politica-password-por-rol]]
> La política vive ahora en `apps/users/password_policy.py` (fuente única): CAJERO = PIN de 4 dígitos, ADMIN/SUPERADMIN = 12 chars con `!@#$%&*`. Consumen de ahí `UserCreateSerializer.validate`, `UpdateMeView`, `generate_new_password` y `CashierLoginSerializer`; el front deriva sus mínimos de `generatePassword.ts` y `ProfilePage` arma el Zod según el rol. Se resolvió la incoherencia crear(4)↔perfil(6) y la de 12↔10 chars. Generación migrada de `random` a `secrets`.
> **`AUTH_PASSWORD_VALIDATORS` sigue deliberadamente sin cablear** (rompería el PIN) — documentado en el `CLAUDE.md`; la P-3 con el owner queda abierta.
> Residual: el admin inicial de un tenant sigue fuera de la política → [[TENANCY-20260804-password-admin-inicial-fuera-de-politica]].

# USERS-20260802-unificar-reglas-password — Unificar reglas de contraseña

**Tipo:** mejora / consistencia

## Problema
Reglas de longitud de password divergentes en 3 caminos:
- `UserCreateSerializer.password` → mín **4** (`apps/users/serializers.py:148`).
- `UpdateMeView.new_password` → mín **6** (`apps/users/views.py:70`).
- Reset de cajero → 4 dígitos; admin → 10 chars (`generate_new_password`, `serializers.py:215-228`).

Además `UpdateMeView` valida a mano (dict crudo, sin serializer). Ver [[patron-jwt-refresh]].

## Decisión del owner (2026-08-02)
El **PIN de 4 dígitos del cajero es intencional** (pantalla táctil sin teclado; simplicidad). **No se aplana** la política: se deja **coherente por rol** (cajero = PIN 4 dígitos numérico; admin = contraseña fuerte) y se **documenta**.

## Criterio de aceptación
Política de password **coherente y documentada por rol**: cajero PIN 4 dígitos; admin contraseña fuerte. Se elimina la incoherencia entre `min 4` (crear) y `min 6` (`UpdateMeView`) alineándolas a la política por rol. `UpdateMeView` idealmente pasa por un serializer.

## Notas para el Dev
- No romper el PIN de 4 dígitos del cajero.
- Doble actualización: `backend/CLAUDE.md` (Serializers / Auth) + [[patron-jwt-refresh]] (el planner ajusta el cerebro).
