---
tags: [modulo, estado]
status: vivo
module: users
updated: 2026-08-02
---

# Users — Estado

**Semáforo:** 🟢 documentado (scope: CRUD usuarios + perfil propio)
**App back:** `apps/users` · **Feature front:** `features/users` · **Complejidad:** 🟡

> [!info] Scope de esta nota
> Cubre **solo** gestión de usuarios (CRUD por el ADMIN) y edición del perfil propio: `UserSerializer`, `UserCreateSerializer`, `UserViewSet`, `MeView`, `UpdateMeView`, `permissions`, generación de contraseñas, `UsersPage`, `ProfilePage`.
> Los **logins** (`CustomTokenObtainPairSerializer`, `CashierLoginSerializer`, `CashierLoginView`, `CustomTokenObtainPairView`) viven en `serializers.py`/`views.py` del mismo app pero son de **[[estado-auth]]** — aquí NO se documentan.

## Punteros
- Código: [[mapa-users]] · Endpoints: [[contratos-users]] · Datos: [[datos-users]] · Formularios: [[formularios-users]]
- Preguntas abiertas: [[preguntas-users]]
- Riesgos: [[reglas-password-divergentes]] · [[errores-silenciosos-formularios-usuarios]] · [[patch-nulifica-campos-omitidos]]
- Conexiones: [[users--auth]] · [[users--tenants]] · [[users--inventory]]

## Qué es (3-5 líneas)
`User` es un `AbstractBaseUser` con PK UUID, `USERNAME_FIELD = correo` y multi-tenant vía FK `tenant` **nullable** (`models.py:34-40,51`). El ADMIN gestiona usuarios de **su** tenant desde `UsersPage`: crea ADMIN/CAJERO, edita, activa/desactiva y restablece contraseña (`UserViewSet`, `views.py:80-106`). Cada usuario edita su propio nombre/correo/contraseña en `ProfilePage` vía `PATCH /auth/me/update/` (`UpdateMeView`, `views.py:38-77`). Las contraseñas se **autogeneran** (nunca las teclea el admin) y se muestran una sola vez en `UserCredentialsModal`.

## Reglas de negocio clave (ancladas)
- CAJERO exige `cedula`; ADMIN exige `correo` — validado **solo** en `serializers.py:169-172` (no en Zod, no en BD).
- `correo` único **global** (BD `unique=True`, `models.py:42`); `cedula` única **por tenant** (constraint condicional, `models.py:60-66`).
- No se puede crear `SUPERADMIN` por API (`serializers.py:157-162`).
- `lead_cashier` (CAJERO) habilita registrar entradas de inventario desde el POS — se **aplica** en `inventory/views.py:35` (ver [[users--inventory]]).
- Filtro de tenant en usuarios es **manual** (`views.py:86`), no vía `TenantModelViewSet` (el modelo `User` no usa `TenantMixin`).

## Pendientes / drift doc↔código
- 🔴 **R-5 contraseñas divergentes**: crear admin front = 12 chars, reset admin back = 10 chars, min crear serializer = 4, min perfil = 6. → [[reglas-password-divergentes]]
- 🔴 **Errores del 400 tragados** en crear/editar usuario (`UsersPage.tsx:118,144` `catch {}`). → [[errores-silenciosos-formularios-usuarios]]
- 🟡 `PATCH` que omita `correo`/`cedula` los **nulifica** (`serializers.py:190-191`); mitigado porque el form manda el campo del rol. → [[patch-nulifica-campos-omitidos]]
- 🟡 `DELETE /api/users/{id}/` (destroy) queda expuesto, **sin caller front**, con FK `PROTECT` en ventas/inventario → posible 500. → P-1 en [[preguntas-users]]
- 🟡 Interface TS `User.rol` solo `ADMIN|CAJERO` (`usersApi.ts:6`), sin `SUPERADMIN` ni `updated_at`/`tenant`; no rompe porque el queryset del admin nunca devuelve superadmins.
