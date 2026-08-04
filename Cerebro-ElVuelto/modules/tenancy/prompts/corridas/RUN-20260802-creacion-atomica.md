---
tags: [corrida, tenancy, review]
status: cerrado
module: tenancy
updated: 2026-08-02
---

# RUN 2026-08-02 — PROMPT-FIX-TENANCY-…-creacion-atomica

**Prompt:** [[PROMPT-FIX-TENANCY-20260802-creacion-atomica]] · **Veredicto:** 🟢 PASÓ · **Cierra:** [[TENANCY-20260802-creacion-tenant-atomica]]

## Qué hizo el Dev (git diff)
- `validate`: pre-check `User.objects.filter(correo=normalize_email(admin_correo)).exists()` → `ValidationError({"admin_correo": ...})` (`apps/tenants/serializers.py:51-63`).
- `create`: envuelto en `with transaction.atomic():` (Tenant + admin juntos) (`:66-75`).
- Imports: `transaction`, `BaseUserManager`. `backend/CLAUDE.md` (Tenants) actualizado.

## Review del Planner
- ✅ Correcto y completo. `normalize_email` es consistente con `UserManager.create_user` (`users/models.py:15-16`), así el pre-check y la creación coinciden (no hay caso donde pase el pre-check y choque al insertar por normalización distinta). Validación en `validate` (antes de crear).
- ✅ Verifiqué `python manage.py makemigrations --check` → **"No changes detected"** (sin cambios de modelo).
- Edge aceptable: en una race de dos requests con el mismo correo, el segundo daría 500 (IntegrityError), pero el `atomic` evita el tenant huérfano; el comentario del Dev lo reconoce.
- ⚠️ Nota: no se adjuntó una corrida de creación de tenant duplicado; verificado por revisión de código + `makemigrations`.

**Veredicto: 🟢 corrido-ok.**
