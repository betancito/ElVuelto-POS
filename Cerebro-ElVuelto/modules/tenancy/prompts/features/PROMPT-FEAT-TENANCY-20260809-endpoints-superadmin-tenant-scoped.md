---
tags: [prompt, tenancy, users, super-admin, feature]
status: 🔴
module: tenancy
updated: 2026-08-09
---

# Feature DEV — 3 endpoints para que SUPERADMIN vea/gestione usuarios de UN tenant

**Tarea:** [[SUPERADMIN-20260809-pagina-detalle-negocio]] (fase 1 de 2 — esta es solo backend)
**Decisión:** [[ADR-G-20260809-superadmin-acceso-tenant-scoped]]
**Alcance:** backend únicamente. Probablemente 2-3 archivos: `apps/tenants/views.py`, `apps/tenants/urls.py`, y quizás `apps/tenants/serializers.py` si te hace falta un serializer nuevo para las métricas. No toques el front todavía (viene en un prompt aparte, después de este). No git.

## Contexto — por qué esto no existía

Verificado hoy: `UserViewSet.get_queryset()` (`apps/users/views.py`) filtra por `require_tenant(self.request)`. Para un SUPERADMIN, `request.tenant` siempre es `None` (su JWT no lleva `tenant_id`) → `require_tenant` tira **403**. No hay ningún endpoint hoy que le deje a un SUPERADMIN leer datos de un tenant elegido por id. Es intencional (ver [[ADR-G-20260802-modelo-de-acceso-por-rol]]) — la superficie que agregás acá es la excepción explícita y acotada que decidió el owner, no un bypass general.

## Qué hacer — 3 endpoints nuevos, todos `IsSuperAdmin`, todos tomando `tenant_id` de la URL (nunca de `request.tenant`)

Te recomiendo standalone `APIView`s registradas a mano en `apps/tenants/urls.py` (mismo patrón que ya existe para `TenantBySlugView` — no dependas del truco de anidar rutas dentro de un `@action` de `TenantViewSet`, que con el router de DRF puede ser frágil). Elegí vos la forma exacta, pero **verificá con una request real que la URL resuelve** antes de dar por hecho que el patrón elegido funciona.

### 1. `GET /api/tenants/{tenant_id}/users/`
- `IsSuperAdmin` únicamente.
- `tenant = get_object_or_404(Tenant, pk=tenant_id)` (o similar) — 404 si el tenant no existe, no 500.
- `User.objects.filter(tenant=tenant).order_by("nombre")`, serializado con el `UserSerializer` que ya existe (`apps/users/serializers.py`) — mismos campos que ya usa `/api/users/` para no inventar un shape nuevo.

### 2. `POST /api/tenants/{tenant_id}/users/{user_id}/reset_password/`
- `IsSuperAdmin` únicamente.
- **Guard obligatorio, es el punto de seguridad de todo este prompt:** el usuario a resetear tiene que pertenecer a ESE tenant. `User.objects.filter(pk=user_id, tenant_id=tenant_id).first()` — si no existe (porque el `user_id` es de otro tenant, o no existe), **404**, nunca un reset silencioso del usuario equivocado.
- Reusá `generate_new_password(user.rol)` (`apps/users/serializers.py`, ya existe — es lo mismo que usa `UserViewSet.reset_password`). Mismo response shape: `{"new_password": "<la nueva>"}`. Guardala con `user.set_password(...)` + `user.save()`.
- Esto también dispara `CHECK_REVOKE_TOKEN` (ya activo) — cualquier token viejo de ese usuario queda inválido, gratis, sin que tengas que hacer nada extra.

### 3. `GET /api/tenants/{tenant_id}/metrics/`
- `IsSuperAdmin` únicamente. 404 si el tenant no existe.
- Devolvé:
  - `ventas_mes`: suma de `Sale.total` de ESE tenant en el mes calendario actual (zona horaria `America/Bogota` — mismo criterio que ya usa `apps/reports/views.py`, leelo para copiar el patrón de fecha/zona horaria, no inventes uno nuevo).
  - `ventas_hoy`: suma de `Sale.total` de ESE tenant, hoy.
  - `num_admins`: `User.objects.filter(tenant=tenant, rol=UserRole.ADMIN).count()`.
  - `num_cajeros`: `User.objects.filter(tenant=tenant, rol=UserRole.CAJERO).count()`.
  - `fecha_alta`: `tenant.created_at`.
  - `activo`: `tenant.activo`.
- Si no hay ventas en el período, que sea `0` (o `"0.00"`), no `null` ni un error.

## Restricciones
- Los tres son de **SOLO SUPERADMIN**. No los uses para nada que un ADMIN de tenant normal deba poder ver — esto no reemplaza ni modifica `/api/users/` ni los 5 endpoints de `/api/reports/`.
- No toques `require_tenant`, `TenantModelViewSet`, ni ningún guard existente — esta es superficie **nueva**, no una relajación de las reglas actuales.
- No implementes impersonación, no emitas ningún token nuevo — nada de esto le da al SUPERADMIN una sesión "como" el tenant.
- No toques el front en este prompt.

## Entregable / verificación
1. `python manage.py makemigrations --check --dry-run` → sin cambios (no debería tocar modelos).
2. Pegá request/respuesta reales (logueado como el superadmin del seed):

| # | Caso | Esperado |
|---|---|---|
| 1 | `GET /api/tenants/{id}/users/` con un tenant real (ej. el de `seed_dev_data`) | 200, lista de sus usuarios (nombre, rol, correo/cedula) |
| 2 | Mismo endpoint, logueado como ADMIN (no superadmin) | 403 |
| 3 | `POST /api/tenants/{id}/users/{user_id}/reset_password/` con un `user_id` que SÍ pertenece a ese tenant | 200, `{"new_password": "..."}`, y el login viejo del usuario deja de servir |
| 4 | Mismo endpoint pero con un `user_id` que pertenece a OTRO tenant (probalo con 2 tenants reales) | **404**, la contraseña del usuario ajeno NO cambió (confirmalo) |
| 5 | `GET /api/tenants/{id}/metrics/` | 200, números que coincidan con lo que hay en la BD para ese tenant (contá vos mismo los admins/cajeros y las ventas para comparar) |
| 6 | Cualquiera de los tres con un `tenant_id` que no existe | 404, no 500 |
| 7 | Cualquiera de los tres logueado como CAJERO | 403 |

3. Veredicto ✅ / 🔴.

**Doble actualización:** `el_vuelto_backend/CLAUDE.md` — sección de Tenants/API Endpoints: documentar los 3 endpoints nuevos, que son SUPERADMIN-only, y por qué existen (enlazá la idea del [[ADR-G-20260809-superadmin-acceso-tenant-scoped]] en tus propias palabras: acceso acotado, no impersonación).

> [!warning] Si algo no cuadra
> Pará y reportá con `archivo:línea`. Esto es una feature nueva, no un fix — si te parece que hay una forma mejor de estructurar las URLs o el guard del punto 2, decilo en el reporte en vez de improvisar silenciosamente; el punto de seguridad (que el reset no cruce tenants) no es negociable, la forma de la URL sí.
