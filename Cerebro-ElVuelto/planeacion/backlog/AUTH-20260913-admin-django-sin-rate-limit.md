---
tags: [tarea, auth, seguridad, backend, infra, produccion]
status: 🔴
prioridad: alta
updated: 2026-09-13
---

# AUTH-20260913-admin-django-sin-rate-limit — `/admin/login/` quedó fuera del throttling, y ahora está en internet

> [!danger] El throttling de login es de DRF. El admin de Django **no pasa por DRF**.
> Se hizo un trabajo cuidadoso de rate limiting en [[AUTH-20260805-sin-throttling-en-login]] y cubre lo
> que tenía que cubrir. Pero `admin.site.urls` sirve **su propio formulario de login**, fuera de DRF, y
> ninguna de las clases de throttle lo toca. Hasta el 2026-08-30 eso era un formulario en una LAN. Hoy
> es `https://elvuelto.online/admin/login/`, abierto a internet y sin límite de intentos.

## Anclas
| pieza | ancla | qué dice |
|---|---|---|
| la ruta | `el_vuelto_backend/elvuelto/urls.py:9` | `path("admin/", admin.site.urls),` |
| el opt-in deliberado | `elvuelto/settings/base.py:113-115` | *"no `DEFAULT_THROTTLE_CLASSES` on purpose. Throttling is opt-in, applied only by the authentication views"* |
| los únicos `throttle_classes` | `apps/users/views.py:41`, `:48`, `:60`, `apps/tenants/views.py:44` | las vistas DRF de auth y `check-by-slug` |
| nginx | `docker/nginx/prod.conf:52-55` | proxea `/admin/` **sin** `limit_req` y sin `allow`/`deny` |
| verificación externa | `GET https://elvuelto.online/admin/login/` | **200**, con `csrftoken` y formulario |

`django-axes` no está instalado (`requirements.txt` tiene 11 líneas y ninguna es axes).

## Por qué alta y no crítica
Dos atenuantes **verificados**, no supuestos:
- **`is_staff` está restringido a SUPERADMIN.** `apps/tenants/serializers.py:87-90` dice literalmente
  *"NO `is_staff`: a tenant admin administers their business…"*, y la migración
  `users.0005_clear_is_staff_on_tenant_admins` lo limpió retroactivamente. Así que la superficie es
  **una sola cuenta**, no una por negocio.
- Esa cuenta se crea con `manage.py create_superadmin` y la política de
  `password_policy.ADMIN_PASSWORD_LENGTH` (12 caracteres, con símbolo) — no es un PIN de 4 dígitos.

Lo que queda igual: un formulario de login sin límite de intentos, público, contra la cuenta que ve
**todos los tenants** y que además **bypassea DRF entero** (sin serializer, sin `require_tenant`, sin
regla por rol — como advierte `el_vuelto_backend/CLAUDE.md` en su propia sección de `is_staff`).

## Opciones (decisión del owner)
1. **Cerrar `/admin/` en el borde** — un `allow`/`deny` por IP en `docker/nginx/prod.conf:52-55`, o
   sacarlo del `Caddyfile`. Es la más barata y la más efectiva: el admin es una herramienta de
   operación, no una pantalla de producto.
2. **`django-axes`** — bloqueo por intentos fallidos, cubre el admin y de paso todo lo demás. Suma una
   dependencia y una tabla.
3. **`limit_req` de nginx** sobre `location /admin/login/` — sin dependencias nuevas, pero es por IP, y
   la caja de un negocio sale por NAT (la misma razón por la que el throttling de la app se hizo **por
   identidad**, ver `base.py:116-125`).

Recomendación: **la 1**, y si el owner quiere entrar desde cualquier lado, la 1 sobre el túnel SSH que
ya existe para la base (`docs/azure-deploy.md`) en vez de abrirlo a internet.

## Criterio de aceptación
`/admin/login/` deja de ser alcanzable desde una IP cualquiera de internet, **o** un intento repetido
de login falla con bloqueo antes de los ~20 intentos. Verificable desde afuera.

## Enlaces
[[AUTH-20260805-sin-throttling-en-login]] · [[INFRA-20260913-el-deploy-a-azure-ya-corrio]] ·
[[patron-permisos-roles]] · [[ADR-INFRA-20260830-deploy-azure-tls-en-el-borde]] ·
[[2026-09-13-planner-paso0-resync]]
