---
tags: [tarea, auth, seguridad]
status: 🟢
prioridad: alta
updated: 2026-08-02
---

# AUTH-20260802-exigir-tenant-id-login-cajero — Exigir tenant_id en login por cédula

**Tipo:** seguridad · **Sprint:** [[Sprint-2026-08-02-estabilizacion-doc]] · **Decisión:** D-3

## Problema
El login por cédula no exige `tenant_id`: `CashierLoginSerializer` (`apps/users/serializers.py:89,97-98`) y la rama cédula de `CustomTokenObtainPairSerializer` (`serializers.py:36-39`) aplican `tenant_id` solo si viene. Como la cédula es única **por tenant** (`users/models.py:60-66`), si dos negocios repiten cédula, un cajero podría autenticarse en el tenant equivocado (`qs.first()` arbitrario). Ver [[tenants--users--auth]].

## Criterio de aceptación
Login por cédula **sin** `tenant_id` → 400/401 con mensaje claro. Con `tenant_id` correcto funciona igual. El front ya lo envía (`StaffLoginPage` lo resuelve por slug), así que no debería romper el flujo actual.

## Notas para el Dev
- Hacer `tenant_id` requerido en `CashierLoginSerializer` y en la rama cédula del `CustomTokenObtainPairSerializer`.
- Verificar `StaffLoginPage.tsx` y `authApi.loginWorker` (`salesApi`/`authApi`) que sí manden `tenant_id`.
- Doble actualización: `backend/CLAUDE.md` (Authentication) + [[patron-jwt-refresh]] (el planner ajusta el cerebro).

## Resuelto (2026-08-02) 🟢
`tenant_id` requerido en `CashierLoginSerializer` y en la rama cédula del `CustomTokenObtainPairSerializer`; front manda `tenant_id`. Ver [[RUN-20260802-exigir-tenant-id]].
