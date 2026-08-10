---
tags: [modulo, estado]
status: vivo
module: users
updated: 2026-08-09
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
- Riesgos: [[reglas-password-divergentes]] · [[errores-silenciosos-formularios-usuarios]] · [[patch-nulifica-campos-omitidos]] · 🔒 [[perfil-nulifica-correo-admin]]
- Prompts y corridas: [[00-registro-users]]
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
_(estado re-verificado contra código el 2026-08-04 en el PASO 0)_
- 🟢 ~~**ALTA** — "Mi Perfil" deja al ADMIN sin login~~ — **cerrado 2026-08-04**: `UpdateMeView` exige correo para ADMIN y valida formato antes de `save()` (`views.py:54-74`). → [[RUN-20260804-invariante-correo-admin]] · [[perfil-nulifica-correo-admin]]
- 🟢 ~~**R-5 contraseñas divergentes**~~ — **mitigado 2026-08-04**: fuente única en `apps/users/password_policy.py` (CAJERO PIN 4 / ADMIN 12 chars), consumida por back y front. Queda fuera el admin inicial de tenant y `create_superadmin.py`; `AUTH_PASSWORD_VALIDATORS` sigue sin cablear a propósito (P-3). → [[reglas-password-divergentes]] · [[RUN-20260804-politica-password-por-rol]]
- 🟢 ~~Errores del 400 tragados en crear/editar usuario~~ — **cerrado**: ambos `catch` usan `applyServerErrors` (`UsersPage.tsx:137,165`). Queda la deuda de que el error de un campo **no montado** no se pinta → [[USERS-20260804-error-400-campo-no-montado]].
- 🟢 ~~Zod no condiciona requeridos por rol~~ — **cerrado 2026-08-04**: `superRefine` en ambos schemas (`UsersPage.tsx:35-65`). → [[RUN-20260804-zod-requeridos-por-rol]]
- 🟢 ~~`PATCH` que omita `correo`/`cedula` los nulifica~~ — **cerrado 2026-08-04**: `validate()` solo escribe la clave si vino; si no, cae al valor de la instancia. Arreglado también el `rol` por defecto. → [[patch-nulifica-campos-omitidos]]
- 🟢 ~~Promover un cajero a ADMIN dejaba el PIN de 4 dígitos vigente~~ — **backend cerrado 2026-08-09**, verificado ejecutando: un `PATCH` que sube el mínimo de contraseña sin mandar `password` rota la credencial (`UserCreateSerializer`, `serializers.py:222-231,299-317`). → [[RUN-20260806-promocion-no-rota-credencial]]
- 🟢 ~~Hallazgo relacionado: la contraseña rotada arriba nunca se mostraba~~ — **cerrado 2026-08-09**: `onEditSubmit` ahora abre `UserCredentialsModal` cuando `new_password` viene poblado (`UsersPage.tsx`), verificado con typecheck+build reales + trazado de los 5 casos + búsqueda adversarial de regresiones (0). → [[RUN-20260809-mostrar-password-rotado-en-edicion]]
- 🟡 `DELETE /api/users/{id}/` (destroy) queda expuesto, **sin caller front**, con FK `PROTECT` en ventas/inventario → posible 500. → P-1 en [[preguntas-users]]
- 🟡 Interface TS `User.rol` solo `ADMIN|CAJERO` (`usersApi.ts:6`), sin `SUPERADMIN` ni `updated_at`/`tenant`; no rompe porque el queryset del admin nunca devuelve superadmins.
