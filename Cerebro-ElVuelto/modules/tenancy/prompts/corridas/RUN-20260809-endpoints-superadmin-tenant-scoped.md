---
tags: [corrida, tenancy, users, super-admin, feature]
status: 🟢 corrido-ok
module: tenancy
updated: 2026-08-09
---

# RUN 2026-08-09 — 3 endpoints SUPERADMIN tenant-scoped (fase 1/2: backend)

**Prompt:** [[PROMPT-FEAT-TENANCY-20260809-endpoints-superadmin-tenant-scoped]]
**Tarea:** [[SUPERADMIN-20260809-pagina-detalle-negocio]] · **Épica:** [[EPIC-20260809-superadmin-gestion-tenants]]
**Decisión:** [[ADR-G-20260809-superadmin-acceso-tenant-scoped]]
**Veredicto:** ✅ **PASÓ** — 13 casos verificados con requests HTTP reales (`APIClient`, con rollback), incluyendo el caso límite de zona horaria y el guard de seguridad cross-tenant en ambas direcciones.

## Qué se entregó
- `SuperAdminTenantScopedView` (base) + `TenantUsersView`, `TenantUserResetPasswordView`, `TenantMetricsView` en `apps/tenants/views.py`.
- Rutas nuevas en `apps/tenants/urls.py`: `GET /tenants/{id}/users/`, `POST /tenants/{id}/users/{uid}/reset_password/`, `GET /tenants/{id}/metrics/` — `APIView`s standalone (no `@action` anidado), con `<uuid:...>` en los converters de URL.
- Doble actualización completa y precisa en `el_vuelto_backend/CLAUDE.md`.

## Decisiones de diseño del Dev, mejores que lo literal del prompt
- **Guard cross-tenant en una sola query**: `User.objects.filter(pk=user_id, tenant=tenant).first()` en vez de "buscar por pk y después chequear el tenant". El prompt sugería esto último como aceptable; el Dev eligió la forma donde la query misma no puede expresar el resultado equivocado — más difícil de romper por accidente en el futuro.
- **`<uuid:tenant_id>` en el URLconf** en vez de validar el formato a mano: un `tenant_id` no-UUID nunca llega al ORM, evitando exactamente la clase de bug 500 que el propio `CLAUDE.md` ya documentaba como conocida en otros endpoints (`?user=<no-uuid>`).
- Verificó explícitamente (documentado en el propio código) que el orden de declaración de las rutas nuevas contra `router.urls` no importa, porque la ruta de detalle del router está anclada con `$`.

## Verificación ejecutada — 13 casos, HTTP real, con rollback
```
1)  login superadmin                                         → 200
2)  GET /tenants/{t1}/users/ (superadmin)                     → 200, ['Admin1','Cajero1']
3)  mismo endpoint como ADMIN (no superadmin)                 → 403
4)  POST reset password de un usuario DE t1, vía t1           → 200 {"new_password": "3968"}
5)  PIN viejo (1111) después del reset                        → check_password = False
6)  PIN nuevo                                                 → check_password = True
7)  POST reset de un usuario DE t2, vía el endpoint de t1      → 404 (guard cross-tenant)
8)  PIN de ese usuario de t2 tras el intento                  → SIN CAMBIOS (confirmado)
9)  GET /tenants/{t1}/metrics/                                → 200, números correctos
10) GET metrics con un tenant_id que no existe                → 404
11) GET metrics con un tenant_id NO-UUID en la URL            → 404 (no 500)
12) Re-login del cajero con el PIN nuevo                      → 200 (regresión: el reset es usable)
13) GET /tenants/{t1}/users/ como CAJERO                      → 403
```

**Caso límite de zona horaria, verificado a propósito:** se forzó una venta a `created_at = 21:00 America/Bogota` de HOY, que en UTC ya es `02:00` del día SIGUIENTE (confirmado: `s2.created_at.date() != hoy_bogota` → `True`). El endpoint de métricas la contó correctamente en `ventas_hoy` **y** `ventas_mes` — si hubiera usado UTC ingenuamente en vez de `America/Bogota`, esa venta habría quedado fuera de "hoy". Coincide con el criterio que ya usa `apps/reports/views.py` (confirmado por grep, mismo patrón `created_at__date` + `BOGOTA_TZ`).

`makemigrations --check --dry-run` → sin cambios (no toca modelos, como se esperaba).

## Checklist de trampas
**#1 tenancy**: superficie nueva, explícitamente acotada — no relaja ningún guard existente; verificado que `/api/users/` y los 5 de `/api/reports/` siguen sin tocarse. **#4 permisos**: `IsSuperAdmin` en los 3, verificado con ADMIN (403) y CAJERO (403). **#9 migraciones**: confirmado sin cambios. **#10 doble actualización**: ✅, completa. **#11**: sin git, sin scope creep, front no tocado (confirmado).

## Cierra
Fase 1/2 de [[SUPERADMIN-20260809-pagina-detalle-negocio]]. Sigue la fase 2 (frontend): [[PROMPT-FEAT-TENANCY-20260809-frontend-tenant-detail-page]].
