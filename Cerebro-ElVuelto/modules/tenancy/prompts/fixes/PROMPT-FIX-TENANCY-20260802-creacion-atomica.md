---
tags: [prompt, tenancy, fix]
status: 🔴
updated: 2026-08-02
---

# Prompt DEV — Creación de tenant atómica + 400 en correo duplicado

**Tarea backlog:** [[TENANCY-20260802-creacion-tenant-atomica]] · **Decisión:** [[ADR-TENANCY-20260802-correo-admin-unico-global]]
**Alcance:** UNA cosa. No scope creep. No git.

## Contexto mínimo necesario
- Leer: `apps/tenants/serializers.py` (`TenantCreateSerializer`), `apps/users/models.py` (User.correo unique), [[tenants--users--auth]].
- **Bug:** `TenantCreateSerializer.create` (`apps/tenants/serializers.py:49-69`) crea el `Tenant` y luego el `User` ADMIN **sin `transaction.atomic`**. Si `admin_correo` ya existe (correo único global, `users/models.py:42`), `create_user` lanza `IntegrityError` → **500** + `Tenant` huérfano.
- **Decisión owner:** correo **único global**; `admin_correo` duplicado → **400 por campo**, atómico, sin huérfano.

## Qué hacer
1. Importar `from django.db import transaction`.
2. Envolver el cuerpo de `create` en `with transaction.atomic():` (Tenant + admin en la misma transacción).
3. En `validate` (o al inicio de `create`), pre-validar: si `User.objects.filter(correo=admin_correo).exists()` → `raise serializers.ValidationError({"admin_correo": "Ya existe un usuario con este correo."})`.
4. (Opcional defensivo) normalizar `admin_correo` con `BaseUserManager.normalize_email` antes de comparar.

## Restricciones
- **Mantener el correo único global** (no cambiar el modelo `User`).
- No cambiar la firma de la API ni los campos de entrada (`admin_nombre`, `admin_correo`).
- No tocar el logo ni otras acciones del `TenantViewSet`.

## Entregable / verificación
- `python manage.py makemigrations --check` → sin cambios de modelo (no debería haber migraciones nuevas).
- Prueba manual:
  - `POST /api/tenants/` con `admin_correo` nuevo → **201** (+ `initial_admin_password`).
  - `POST /api/tenants/` con `admin_correo` ya existente → **400** `{"admin_correo": ...}`.
  - En Django shell, confirmar que tras el 400 **NO** quedó un `Tenant` nuevo (sin huérfano).
- Pegar salida REAL. **Doble actualización:** `backend/CLAUDE.md` (Tenants). Veredicto ✅/🔴.
