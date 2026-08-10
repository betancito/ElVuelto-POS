---
tags: [tarea, backend, users, auth, seguridad]
status: 🟢
prioridad: alta
updated: 2026-08-05
---

> [!done] Cerrado 2026-08-05 — ✅ [[RUN-20260805-residuos-users-auth]]
> Migración `0005_clear_is_staff_on_tenant_admins` aplicada (ADMIN con `is_staff` → **0**, SUPERADMIN intactos). `UpdateMeView` normaliza el blanco a `None` antes de decidir y el guard se generalizó: ADMIN/SUPERADMIN siempre, y cualquier otro que no tenga `cedula` + `tenant_id`. Verificado 11/11.

# 🔒 BACKEND-20260805-cerrar-residuos-users-auth — Tres huecos que quedaron a medias en users/auth

**Tipo:** seguridad / integridad · **Descubierto:** review de [[RUN-20260805-cerrar-puertas-traseras]] + [[auditoria-adversarial-20260805]]
**Los tres verificados por el Planner ejecutando.**

Tres cosas de la misma zona (`UpdateMeView` y el flag `is_staff`) que quedaron abiertas: dos porque el guard se escribió mirando solo a `UserRole.ADMIN`, una porque el fix no fue retroactivo.

## 1. El fix de `is_staff` no alcanzó a las filas existentes
[[RUN-20260805-cerrar-puertas-traseras]] quitó `is_staff=True` de `_create_initial_admin`, pero **solo para admins nuevos**. Verificado en la BD de dev: **1 de 2** admins de tenant conserva `is_staff=True` (`juan@laesperanza.com`).

En dev es una fila. En un despliegue real serían **todos los admins de tenant creados hasta hoy** — exactamente las cuentas cuya exposición motivó el ticket. `is_staff` es lo que Django mira para dejar entrar a `/admin/`, el sitio que evade todos los serializers.

**Falta:** una migración de datos (o un comando) que ponga `is_staff=False` en todo `User` con `rol=ADMIN`. ⚠️ **Sin tocar** los SUPERADMIN, que lo necesitan.

## 2. `UpdateMeView` deja al SUPERADMIN borrarse su propio correo
El guard es `if user.rol == UserRole.ADMIN and not correo` (`apps/users/views.py`). El SUPERADMIN no entra en esa comparación — pero su `correo` **también** es `USERNAME_FIELD` y es su **única** vía de login (no tiene `tenant_id` para el login por cédula).

Verificado:
```
PATCH /api/auth/me/update/ {"correo": ""} como SUPERADMIN → 200
correo quedó en: None
```
El administrador de la plataforma queda **fuera, sin forma de volver a entrar** salvo por shell o BD. Hoy no es alcanzable desde la UI (el super-admin no tiene pantalla de perfil), pero la API está abierta.

## 3. Espacios en blanco guardan `""` en vez de `NULL` → `IntegrityError` 500
`correo = data["correo"].strip() if data["correo"] else None`: `"   "` es truthy, `.strip()` da `""`, y se guarda la **cadena vacía** — no `NULL`. Como `correo` es `unique`, el **segundo** usuario que lo haga colisiona.

Verificado:
```
cajero 1: PATCH /me/update/ {"correo": "   "} → 200, correo en BD: ''
cajero 2: PATCH /me/update/ {"correo": "   "} → IntegrityError:
          duplicate key value violates unique constraint "users_correo_key"
          DETAIL: Key (correo)=() already exists.
```
DRF no mapea `IntegrityError` ⇒ **500** en producción.

## Criterio de aceptación
1. Ningún `User` con `rol=ADMIN` conserva `is_staff=True`; los SUPERADMIN sí lo mantienen.
2. Un SUPERADMIN **no puede** dejar su `correo` vacío por la API → 400.
3. Mandar `"   "` como correo guarda **`NULL`**, nunca `""`; dos usuarios pueden hacerlo sin colisionar.

## Notas para el Dev
- Los puntos 2 y 3 son el mismo bloque de `UpdateMeView`: el guard debe cubrir **todo rol cuyo login dependa del correo** (ADMIN **y** SUPERADMIN), y la normalización debe colapsar el blanco a `None` antes de decidir.
- El punto 1 pide migración de datos: pegá el `makemigrations` y contá **cuántas filas** toca.
- ⚠️ No rompas: `User.clean()`, PUT deshabilitado, la invariante del correo, el seed.
- Doble actualización: `el_vuelto_backend/CLAUDE.md`.
