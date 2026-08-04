---
tags: [corrida, auth, review, seguridad]
status: cerrado
module: auth
updated: 2026-08-02
---

# RUN 2026-08-02 — PROMPT-FIX-AUTH-…-exigir-tenant-id

**Prompt:** [[PROMPT-FIX-AUTH-20260802-exigir-tenant-id]] · **Veredicto:** 🟢 PASÓ · **Cierra:** [[AUTH-20260802-exigir-tenant-id-login-cajero]]

## Qué hizo el Dev (git diff)
- `CashierLoginSerializer`: `tenant_id` → `required=True`; `validate` filtra `User.objects.filter(cedula=..., tenant_id=...)` (`apps/users/serializers.py:89-101`). Falta `tenant_id` → **400**.
- `CustomTokenObtainPairSerializer` (rama cédula): exige `tenant_id` (`raise ValidationError`) y filtra por tenant (`:34-44`). Defensivo — el front no usa esta rama.
- `backend/CLAUDE.md`: tabla de auth (`Cedula + tenant_id + password`) + párrafo explicando el guard.

## Review del Planner
- ✅ Backend correcto y completo; login por correo intacto.
- ✅ Front: `StaffLoginPage.tsx:98` manda `tenant_id` (resuelto por slug) en el flujo válido → happy path OK.
- Observación menor (no bloquea): el spread `...(tenantCheck.id ? { tenant_id } : {})` omite `tenant_id` si el slug no resolvió → ahora eso da 400 (aceptable). Ligado a la divergencia ya registrada de `check-by-slug` que omite `id` en la rama "no existe".
- ⚠️ Nota: sin salida de pruebas manuales adjunta; verificado por revisión de código + semántica DRF.

**Veredicto: 🟢 corrido-ok.**
