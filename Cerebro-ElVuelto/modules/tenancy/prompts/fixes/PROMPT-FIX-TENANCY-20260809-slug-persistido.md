---
tags: [prompt, tenancy, users, front, fix]
status: 🔴
module: tenancy
updated: 2026-08-09
---

# TENANCY — Persistir el slug del tenant (decisión del owner: [[ADR-TENANCY-20260809-slug-persistido]])

**Tareas backlog:** [[TENANCY-20260804-slug-tres-implementaciones]] (P-1) + la colisión de slug de [[auditoria-adversarial-20260805]]
**Alcance:** 1 modelo + 1 migración + 2 archivos de backend + 4 de front. No git.

## La invariante

> **El slug de un tenant es un valor que se genera UNA VEZ, se persiste, y todo el sistema lo lee — nadie lo vuelve a calcular.**

## El problema (verificado, con anclas)

Hay tres implementaciones incompatibles de "nombre → slug", ninguna persiste nada:

1. Backend, `apps/tenants/views.py:16-17` (`_nombre_to_slug`) — borra tildes: `"Café Bogotá"` → `"caf-bogot"`.
2. POS al cerrar turno, `el_vuelto_frontend/src/utils/slugify.ts` (usado en `src/features/sales/PosPage.tsx:22,319`) — translitera: `"Café Bogotá"` → `"cafe-bogota"`.
3. Alta de usuario, `el_vuelto_frontend/src/features/users/UsersPage.tsx:32-33,84` (`toSlug`) — borra tildes, igual que el backend.

El backend resuelve con **#1**. El POS redirige con **#2** al cerrar turno. Para cualquier negocio con tilde o `ñ`, #2 ≠ #1 ⇒ el cajero aterriza en un slug que el backend no reconoce ⇒ **"Sucursal no encontrada"**. Reproducible con `seed_dev_data` (tenant "Panadería La Esperanza").

Además, `TenantBySlugView.get` (`views.py:22-46`) recorre **todos** los tenants activos en Python en cada request público y se queda con el primer match — sin `unique` en `nombre`, dos negocios que colapsen al mismo slug se pisan, y el "ganador" ni siquiera es estable entre requests (un `UPDATE` cualquiera puede cambiarlo).

## Qué hacer

### 1. Backend — modelo
En `apps/tenants/models.py`, agregá a `Tenant` (después de `nombre`, antes de `nit` o donde tenga sentido):
```python
slug = models.CharField(max_length=220, unique=True, editable=False)
```
Escribí una función que genere el slug base transliterando (mismo criterio que `slugify.ts`: NFD, sacar marcas diacríticas con `unicodedata`, minúsculas, todo lo que no sea `[a-z0-9]` a `-`, recortar guiones de los bordes). Sobreescribí `Tenant.save()`: si `not self.slug`, generarlo a partir de `self.nombre` y, si colisiona con otro tenant existente (`exclude(pk=self.pk)`), agregar sufijo numérico (`-2`, `-3`, ...) hasta que sea único. **Una vez seteado, no se regenera** — si `nombre` cambia después (PATCH), el slug NO cambia (por diseño: es lo que le da estabilidad a los links ya entregados).

Poné la función generadora en un lugar reusable por la migración (ver #2) — una migración de datos no puede importar el modelo actual, así que vas a tener que **inlinear** la misma lógica ahí (mismo patrón que `apps/users/migrations/0005_clear_is_staff_on_tenant_admins.py`, que ya explica por qué en su docstring).

### 2. Backend — migración
Nueva migración en `apps/tenants/migrations/` (después de `0003_...`):
- Agregar el campo `slug` (sin `unique` todavía, para poder backfillear).
- `RunPython` que recorra `Tenant.objects.all().order_by('created_at')` y le asigne un slug único a cada uno (mismo algoritmo, inlineado). El orden por `created_at` es importante: hace el backfill determinístico si corre más de una vez en distintos entornos.
- Alterar el campo para agregar `unique=True` (y sacar el default/blank si usaste alguno para el paso intermedio).
- `reverse_code=migrations.RunPython.noop` en el backfill (no hay vuelta atrás sensata).

### 3. Backend — endpoint público
`TenantBySlugView.get` (`views.py`) — reemplazá el loop Python por `Tenant.objects.filter(slug=slug, activo=True).first()`. Borrá `_nombre_to_slug` si ya no lo usa nadie más (confirmá con `grep`).

### 4. Backend — exponer el slug al login
En `apps/users/serializers.py`, `CustomTokenObtainPairSerializer.validate` construye el dict `user` en **dos lugares** (rama `cedula`, líneas ~57-72, y rama correo, después de `super().validate`, líneas ~76-91) — son casi idénticos. Agregá `"tenant_slug": user.tenant.slug if user.tenant_id else None,` en **ambos**. (Si te da paja la duplicación y querés extraer un helper compartido, adelante — pero no es parte del criterio de aceptación, no te desvíes por eso.)

Opcional: agregá `slug` como campo de solo lectura en `TenantSerializer` (`apps/tenants/serializers.py`) si te parece que suma visibilidad para el superadmin — no es requisito.

### 5. Front — tipos y mapeo
- `el_vuelto_frontend/src/features/auth/authSlice.ts` — agregá `tenantSlug: string | null` a `AuthUser`.
- `el_vuelto_frontend/src/features/auth/authApi.ts` — agregá `tenant_slug: string | null` a `LoginResponse['user']`, y mapealo a `tenantSlug: data.user.tenant_slug` en los **dos** `setCredentials(...)` (uno en `loginSuperAdmin`, otro en `loginWorker`, líneas ~44-61 y ~72-89).

### 6. Front — consumir el slug persistido, no recalcularlo
- `PosPage.tsx:319` — cambiá `const slug = user?.tenantNombre ? slugify(user.tenantNombre) : null` por `const slug = user?.tenantSlug ?? null`. Sacá el `import { slugify } from '@/utils/slugify'` (línea 22) si ya no se usa — confirmá con `grep -rn slugify src/`.
- `UsersPage.tsx:84` — cambiá `` `${window.location.origin}/login/${toSlug(tenantNombre)}` `` para usar el `tenantSlug` del usuario logueado (mismo `useAppSelector` que ya trae `tenantNombre` en este archivo — agregale `tenantSlug`). Borrá la función local `toSlug` (líneas 32-34) si ya no se usa.

## Restricciones
- No toques `password_policy.py`, throttles, guards de tenancy en otros módulos, ni nada de lo ya entregado en users/auth.
- El slug **nunca se recalcula** después de creado — ni por un PATCH de `nombre`, ni por nada. Si en algún punto tenés la tentación de "regenerarlo para que quede más lindo", pará: eso es exactamente el bug que estás arreglando.
- La migración de datos tiene que ser segura de correr en un entorno con tenants reales ya cargados (no asumas que la BD está vacía).

## Entregable / verificación
1. `python manage.py makemigrations --check --dry-run` → **debe mostrar cambios** antes de que generes la migración a mano, y **sin cambios** después de generarla y aplicarla (`python manage.py migrate`).
2. `npm run typecheck` y `npm run build` → limpios.
3. Verificación real (no solo lectura):

| # | Caso | Esperado |
|---|---|---|
| 1 | Crear un tenant nuevo con nombre `"Café Bogotá"` (API o admin) | `tenant.slug == "cafe-bogota"` |
| 2 | `GET /api/tenants/check-by-slug/cafe-bogota/` (o la ruta real del endpoint) | `exists: true`, datos del tenant correcto |
| 3 | Crear un segundo tenant con nombre que colisione con el mismo slug base | Su `slug` lleva sufijo (`cafe-bogota-2`), **no** pisa al primero |
| 4 | `PATCH` el `nombre` de un tenant existente | Su `slug` **no cambia** |
| 5 | Login de un cajero de un tenant con tilde (usá `seed_dev_data` o el tenant del caso 1) | La respuesta de login trae `tenant_slug` correcto |
| 6 | Cerrar turno desde el POS logueado como ese cajero | Redirige a `/login/{slug real}` y esa página **resuelve** (no "Sucursal no encontrada") |
| 7 | Login de staff con el link que muestra `UsersPage` para ese tenant | Coincide con el slug persistido, funciona |
| 8 | Backfill: corré la migración sobre datos existentes (`seed_dev_data` + al menos 2 tenants) | Todos terminan con `slug` no nulo, único, sin excepciones |

4. Pegá los outputs reales de los comandos y de al menos los casos 1, 3, 4 y 6 (el que reproduce el bug original).
5. Veredicto ✅ / 🔴.

**Doble actualización:** `el_vuelto_backend/CLAUDE.md` (sección Multi-Tenancy o Models — que `Tenant.slug` es persistido, único, generado una vez, y que `TenantBySlugView` ya no escanea) + `el_vuelto_frontend/CLAUDE.md` (sección `features/tenants/` o `features/users/` — que el slug viene del login, no se recalcula en el cliente).

> [!warning] Si algo no cuadra
> Pará y reportá con `archivo:línea`. Las líneas de este prompt están ancladas a lo que leí hoy (2026-08-09) — si el código cambió desde entonces, el código manda.
