---
tags: [tarea, users, mejora]
status: 🔴
prioridad: media
updated: 2026-08-02
---

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
