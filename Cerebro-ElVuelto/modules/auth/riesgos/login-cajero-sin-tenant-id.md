---
tags: [riesgo, auth, seguridad]
status: abierto
module: auth
severity: alto
updated: 2026-08-02
---

# R-2 — Login por cédula sin `tenant_id` cruza tenants

**Severidad:** 🔴 alto (aislamiento multi-tenant) · **Estado:** abierto, por confirmar intención (ver [[preguntas-auth]] P-1)

## Qué pasa
La cédula es única **solo por tenant** (`apps/users/models.py:60-66`, `UniqueConstraint(["tenant","cedula"])` condicional). Ambos serializers de login por cédula aplican `tenant_id` **solo si viene en el request**:

- `CashierLoginSerializer.validate` — `serializers.py:96-99`:
  ```
  qs = User.objects.filter(cedula=cedula)
  if tenant_id:            # opcional
      qs = qs.filter(tenant_id=tenant_id)
  user = qs.first()        # ← primer match entre TODOS los tenants
  ```
- `CustomTokenObtainPairSerializer.validate` (rama cédula) — `serializers.py:37-40`: mismo patrón.

Si dos negocios tienen un cajero con la misma cédula y el request **no** incluye `tenant_id`, `qs.first()` devuelve un usuario arbitrario (orden de BD). Con el password correcto de *ese* usuario, se emite un JWT con el `tenant_id` de un tenant que no es el pretendido → el cajero opera sobre el POS de otro negocio.

## Por qué la API lo permite
- `tenant_id` es `required=False, allow_null=True` (`serializers.py:89`).
- `CashierLoginView` es `AllowAny` + `authentication_classes=[]` (`views.py:23-25`): cualquiera puede pegar al endpoint con cualquier body.
- El endpoint `/auth/login/` (correo) **también** acepta login por cédula encubierto (`serializers.py:32-46`), ampliando la superficie.

## Mitigación actual (parcial, solo happy-path)
`StaffLoginPage.tsx:98` envía `tenant_id: tenantCheck.id` cuando el slug resuelve vía `checkTenantBySlug`. Es decir: **por la UI normal** el `tenant_id` sí viaja. Pero:
- La protección es del cliente, no de la API. Un request directo sin `tenant_id` la salta.
- Si `tenantCheck.id` fuera `null` (slug resuelto pero sin id), el `tenant_id` se omite (`:98`, spread condicional).

## Impacto
Un cajero (o atacante que conozca cédula+PIN de 4 dígitos de otro tenant) podría autenticarse en un tenant equivocado. PINs de 4 dígitos + `AllowAny` hacen viable fuerza bruta.

## Sugerencia (NO implementada aquí — va a backlog)
Hacer `tenant_id` **obligatorio** en `CashierLoginSerializer` (y en la rama cédula de `CustomTokenObtainPairSerializer`), o resolver el tenant server-side y rechazar si hay más de un match. Rate-limit en `CashierLoginView`.

## Anclas
- `apps/users/serializers.py:37-40`, `:88-89`, `:96-99`
- `apps/users/models.py:60-66`
- `apps/users/views.py:23-25`
- `el_vuelto_frontend/src/features/auth/StaffLoginPage.tsx:95-99`
