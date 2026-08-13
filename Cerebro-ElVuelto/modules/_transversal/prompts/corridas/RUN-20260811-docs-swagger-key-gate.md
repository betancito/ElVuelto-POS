---
tags: [corrida, transversal, docs, seguridad]
status: activo
updated: 2026-08-11
---

# RUN-20260811 — Docs Swagger/Redoc gateadas por API key

> [!info] Desviación de protocolo, reconocida
> El owner pidió esto directamente al Planner en la misma sesión ("habilita docs tipo swagger...").
> No hubo prompt previo del Planner al Dev — el Planner ejecutó el código directamente (salió del rol
> estricto de solo-cerebro), y luego se auto-revisó con un workflow adversarial de 3 lentes + síntesis
> en vez de un review humano-a-diff independiente. Registrado acá para que el cerebro no mienta sobre
> cómo se hizo. Ver [[ADR-G-20260811-docs-swagger-key-gate]] para la decisión.

## Qué se implementó
`drf-spectacular==0.30.0` + `drf-spectacular-sidecar==2026.8.1`. Archivos nuevos:
`elvuelto/docs_auth.py`, `elvuelto/docs_views.py`. Tocados: `elvuelto/urls.py`,
`elvuelto/settings/base.py`, `requirements.txt`, `.env`/`.env.example`, `CLAUDE.md` (backend).

## Verificación real ejecutada (servidor real, `--noreload`, curl)
- `check` limpio, `makemigrations --check --dry-run` sin cambios.
- Los 3 endpoints (`/docs/`, `/redoc/`, `/api/schema/`) × 4 casos: sin key → 403, key incorrecta → 403,
  key correcta por header → 200, key correcta por `?key=` → 200. **12/12 ✅.**
- `HasDocsApiKey` testeado directo (sin HTTP) para el caso "fail closed": `DOCS_API_KEY` vacío + sin
  key / key vacía / cualquier header → los 3 en `False`. **Nunca "vacío = abierto". 6/6 ✅.**
- `GET /api/products/pos/` con la docs key puesta (header o query) → sigue en **401**: la key de docs
  no abre endpoints de negocio. Verificado antes y después de los fixes.
- Schema válido: `securitySchemes: ['jwtAuth']` (confirma que el registro del scheme JWT funciona),
  33 paths reales documentados.

## Bug real encontrado y arreglado durante la implementación (no en el review)
Importar `drf_spectacular.contrib.rest_framework_simplejwt` desde dentro de `settings/base.py`
dispara una carga reentrante de settings de Django: el submódulo de `drf_spectacular` lee
`django.conf.settings` en el momento de importarse, y si eso pasa mientras `settings/base.py` **se
está terminando de ejecutar**, Django le entrega un módulo parcial (solo los nombres definidos arriba
de esa línea) — el singleton de settings de `drf_spectacular` queda congelado con sus defaults
(`SERVE_PERMISSIONS = AllowAny`) para siempre, aunque `django.conf.settings.SPECTACULAR_SETTINGS`
termine correcto. Se manifestó como `/docs/` respondiendo **200 sin ninguna key**. Fix: ese import se
movió a `docs_views.py` (se importa recién cuando carga `urls.py`, siempre después de que settings
terminó). Comentario largo dejado en `settings/base.py` para que no se reintroduzca.

## Revisión adversarial (workflow, 3 lentes + síntesis, 4 agentes, ~695s, 374k tokens)
Lentes: bypass de auth, fuga de secreto/info, drift de config prod/dev. 14 hallazgos crudos → 7 tras
deduplicar. De esos:
- **3 arreglados en esta misma corrida** (verificados de nuevo en vivo tras el fix):
  1. La key se reinyectaba en la URL del schema **incluso cuando llegaba por header** → ahora solo se
     reinyecta si llegó por `?key=`.
  2. Swagger/Redoc cargaban JS desde CDN sin pin de versión (`@latest`) → self-hosted vía
     `drf-spectacular-sidecar`.
  3. Sin `Cache-Control: no-store` → agregado a las 3 vistas.
- **1 documentado como trade-off aceptado, no arreglado en código**: fuga de la key en la página de
  error 500 de Django cuando `DEBUG=True` y el request llevaba `?key=` (Django no redacta
  `request.GET`). Ver ADR.
- **2 preexistentes del repo, fuera de este cambio, pasados a backlog nuevo** (no tocados):
  [[BACKEND-20260811-manage-py-settings-fallback-inseguro]] (alta) y
  [[BACKEND-20260811-falta-https-enforcement-produccion]] (media).
- **1 descartado**: pedir un test de regresión — el repo no tiene framework de tests configurado
  (documentado en `CLAUDE.md`), agregar uno solo para esto sería scope creep; el comentario largo en
  `settings/base.py` es la mitigación elegida, consistente con cómo este repo ya documenta otras
  trampas (`AUTH_PASSWORD_VALIDATORS`, `request.tenant is None`, etc.).

## Veredicto (primera vuelta)
✅ Pasó. 12/12 + 6/6 casos con ejecución real, bug real encontrado y arreglado en el camino, 3/7
hallazgos del review real y arreglados con re-verificación, 1 documentado como trade-off, 2 registrados
como backlog nuevo, 1 descartado con justificación. Doble actualización: `CLAUDE.md` backend ✅, cerebro
✅ (este archivo + ADR + backlog).

## Actualización — el owner pidió GUI en vez de parámetro HTTP (misma sesión)
El owner pidió explícitamente que la key se ingrese por una interfaz gráfica, no por un parámetro de
una petición HTTP — correcto: escribir `?key=...` en la barra del navegador sigue siendo "pasarla por
HTTP", nomás con más pasos. Reemplacé el modo `?key=` por un login real: `DocsLoginView` en
`/docs/login/`, formulario HTML, `POST` valida la key y deja `request.session["docs_authorized"] =
True` (sesión de Django, cookie — infraestructura que ya estaba, no se agregó nada nuevo). `/docs/` y
`/redoc/` redirigen (302) a `/docs/login/?next=<ruta original>` cuando no hay sesión ni header válido,
en vez de un 403 plano.

**Verificación real (servidor real, cookie jar de curl), 9/9 ✅:**
1. `/docs/` sin sesión → **302** a `/docs/login/?next=/docs/`.
2. `GET /docs/login/` → 200, trae CSRF token real.
3. `POST` con key incorrecta → **401**, sin sesión seteada.
4. `/docs/` con esa cookie (login fallido) → sigue redirigiendo.
5. `POST` con key correcta → **302** a `/docs/`, cookie de sesión seteada.
6. Con esa misma cookie: `/docs/`, `/redoc/`, `/api/schema/` → **200 los 3**, sin la key en ninguna URL.
7. HTML de `/docs/` ya autenticado: `schema_url` es `"/api/schema/"` — limpio, sin key.
8. Header `X-Docs-Api-Key` (sin cookie) sigue dando 200 en `/api/schema/` — acceso programático intacto.
9. `GET /api/products/pos/` con la sesión de docs activa → sigue **401** (la sesión de docs no toca
   endpoints de negocio).

Más: `next` a un host externo (`https://evil.example.com`) se ignora y cae a `/docs/` (protección
open-redirect, `url_has_allowed_host_and_scheme`) — verificado en vivo. `GET /docs/login/` ya
autenticado redirige directo sin re-mostrar el form — verificado. Fail-closed re-testeado directo sobre
`key_matches` (4/4 casos) tras el cambio — sigue intacto.

**Efecto colateral positivo:** esto resuelve, sin buscarlo, el trade-off que había quedado aceptado
(fuga de la key en la página de error `DEBUG=True` de Django) — ya no hay ningún `?key=` que pueda
aparecer en `request.GET` para que esa página filtre. Ver actualización en
[[ADR-G-20260811-docs-swagger-key-gate]].

## Veredicto final
✅ Pasó, incluyendo el cambio de diseño pedido después. 12/12 + 6/6 + 9/9 casos con ejecución real en
total. Doble actualización otra vez: `CLAUDE.md` backend ✅, cerebro ✅ (este archivo + ADR, editados en
la misma sesión en vez de duplicados — es la misma feature evolucionando, no un hecho nuevo).
