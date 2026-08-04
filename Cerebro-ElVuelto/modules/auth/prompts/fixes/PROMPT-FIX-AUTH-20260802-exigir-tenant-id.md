---
tags: [prompt, auth, fix, seguridad]
status: 🔴
updated: 2026-08-02
---

# Prompt DEV — Exigir tenant_id en el login por cédula

**Tarea backlog:** [[AUTH-20260802-exigir-tenant-id-login-cajero]] · **Riesgo:** [[login-cajero-sin-tenant-id]]
**Alcance:** UNA cosa. No scope creep. No git.

## Contexto mínimo necesario
- Leer: `apps/users/serializers.py` (`CashierLoginSerializer` `:86-126`, y la rama cédula de `CustomTokenObtainPairSerializer` `:32-46`), `apps/users/models.py:60-66` (cédula única **por tenant**), [[tenants--users--auth]], [[patron-jwt-refresh]].
- **Bug:** el login por cédula aplica `tenant_id` solo si viene (`serializers.py:89,97-98` y `:36-39`). Como la cédula es única por tenant, si dos negocios repiten cédula y no se manda `tenant_id`, `qs.first()` puede autenticar en el **tenant equivocado**.
- El front ya manda `tenant_id` (`StaffLoginPage` lo resuelve por slug), así que exigirlo **no rompe** el flujo actual.

## Qué hacer
1. En `CashierLoginSerializer` (`serializers.py:86-126`): hacer `tenant_id` **requerido** (`required=True`, quitar `allow_null`). Si falta → 400 claro.
2. En la rama cédula de `CustomTokenObtainPairSerializer` (`:32-46`): exigir `tenant_id` igualmente **si esa rama sigue en uso**. Primero `grep` en el front quién llama a `/api/auth/login/` con `cedula` (del inventario: el staff usa `POST /api/auth/login/cashier/`, no `/login/`). Si nadie usa la rama cédula de `/login/`, endurécela igual (defensa) y anótalo.
3. Filtrar SIEMPRE por `tenant_id`: `User.objects.filter(cedula=..., tenant_id=tenant_id)`.

## Restricciones
- No cambiar el login por **correo** (admin/superadmin).
- No romper `StaffLoginPage`: verificar que sigue mandando `tenant_id`.

## Entregable / verificación
- Prueba manual:
  - Login cajero **sin** `tenant_id` → **400**.
  - Login cajero con `tenant_id` correcto → **200** + tokens.
  - Cédula válida pero `tenant_id` de otro negocio → **401** ("Credenciales incorrectas").
- Pegar salida REAL. **Doble actualización:** `backend/CLAUDE.md` (Authentication). Veredicto ✅/🔴.
