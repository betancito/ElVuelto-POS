---
tags: [modulo, riesgo]
status: vivo
module: tenancy
severity: alta
updated: 2026-08-02
---

# Riesgo — Creación de tenant + ADMIN no es atómica

**Ancla:** `el_vuelto_backend/apps/tenants/serializers.py:49-69`

## Qué pasa
`TenantCreateSerializer.create` (`serializers.py:49`) ejecuta en secuencia:
1. `tenant = super().create(validated_data)` → INSERT del Tenant (ya persistido).
2. `_create_initial_admin(...)` → `User.objects.create_user(correo=admin_correo, ...)` (`serializers.py:62`).

**No hay `@transaction.atomic`.** Si el paso 2 falla, el paso 1 ya quedó comprometido.

## Cómo falla en la práctica
`admin_correo` colisiona con un `User.correo` existente (correo es `unique` global en el modelo User). `create_user` no pre-valida unicidad ⇒ la BD lanza `IntegrityError` ⇒ respuesta **500**. Resultado:
- El **Tenant queda creado** (huérfano, sin admin).
- El super-admin ve un error 500 genérico y probablemente reintenta ⇒ ahora choca el `nit`/`correo` del tenant (400) y no entiende por qué.
- Estado inconsistente: tenant sin usuario administrador, imposible de loguear.

## Impacto
Integridad de datos + UX confusa en un flujo crítico (alta de cliente SaaS). Además genera tenants basura que ensucian `listTenants` y `check-by-slug`.

## Recomendación (no aplicar aquí)
Envolver `create` en `transaction.atomic()` y pre-validar `admin_correo` (unicidad) en `validate_admin_correo` para devolver 400 por campo en vez de 500. Relacionado con [[riesgo-errores-400-silenciados]]. Ver [[preguntas-tenancy]] P-2.
