---
tags: [riesgo, auth, divergencia]
status: abierto
module: auth
severity: medio
updated: 2026-08-02
---

# Divergencia de longitud mínima de contraseña (login vs auto-cambio)

**Severidad:** 🟡 medio (inconsistencia funcional, atrapa al cajero) · **Estado:** abierto

## Qué pasa
Hay **tres** reglas de longitud de password que no concuerdan:

| dónde | regla | ancla |
|---|---|---|
| Login cajero | `password min_length=4` | `serializers.py:88` |
| PIN generado para CAJERO | exactamente **4 dígitos** | `serializers.py:216-217` (`generate_new_password`) |
| Auto-cambio (`UpdateMeView`) | `new_password` min **6** | `views.py:70` |
| Auto-cambio (front, Zod) | `new_password.min(6)` | `ProfilePage.tsx:22` |

## Consecuencia
Un CAJERO recibe/usa un PIN de **4 dígitos** para entrar (`/auth/login/cashier/` lo acepta), pero si intenta cambiar su contraseña desde `/profile`, tanto el Zod del front como `UpdateMeView` le exigen **≥6 caracteres**. No puede fijarse un PIN de 4. Queda un estado incoherente: el usuario entra con 4 pero no puede *establecer* menos de 6.

Además, si un ADMIN usa `reset_password` (de [[users]]), a un CAJERO se le regenera un PIN de 4 dígitos (`generate_new_password`), reinstaurando el conflicto.

## No es bug de seguridad, es inconsistencia de UX/reglas
El login con min4 no es en sí inseguro respecto al cambio; el problema es que **el sistema genera PINs de 4 pero prohíbe establecerlos manualmente a 4**. La regla de negocio "¿cuál es la longitud mínima real de un PIN de cajero?" no se deduce del código: hay 4 en un lado y 6 en otro.

## Sugerencia (backlog, NO implementada)
Definir una sola política por rol (p.ej. CAJERO→PIN exacto 4 dígitos numéricos; ADMIN→≥8 mixto) y aplicarla consistentemente en login, `generate_new_password` y `UpdateMeView`. Idealmente `UpdateMeView` debería ramificar el mínimo por `user.rol`.

## Anclas
- `apps/users/serializers.py:88`, `:215-228`
- `apps/users/views.py:62-73`
- `el_vuelto_frontend/src/features/users/ProfilePage.tsx:19-28`
