---
tags: [adr, global, docs, seguridad]
status: activo
updated: 2026-08-11
---

# ADR-G-20260811 — Docs de API (Swagger/Redoc) gateadas por una API key estática

**Contexto:** el owner pidió exponer `/docs/` (Swagger), `/redoc/` y `/api/schema/` para explorar y
probar los endpoints, protegidos por una key configurada en `.env` — no un JWT de usuario.

**Decisión:**
1. `DOCS_API_KEY` (env var) gatea únicamente la **visibilidad de los docs**, nunca los endpoints de
   negocio reales — verificado en vivo: `GET /api/products/pos/` sigue en 401 con la sesión de docs
   activa. Dentro de `/docs/`, el botón "Authorize" documenta el JWT real (`jwtAuth`, vía
   `drf_spectacular.contrib.rest_framework_simplejwt`) para probar endpoints de verdad.
2. **Acceso por navegador = formulario de login, no parámetro en la URL** (ver actualización abajo).
   **Acceso programático (curl/Postman/CI) = header** `X-Docs-Api-Key`.
3. **Falla cerrado**: `DOCS_API_KEY` sin configurar = nadie entra, nunca "vacío = abierto".
4. Assets de Swagger/Redoc self-hosted vía `drf-spectacular-sidecar`, no CDN.
5. Las 3 respuestas llevan `Cache-Control: no-store`.

**Implementación:** `elvuelto/docs_auth.py` (permiso `HasDocsApiKey`, `key_matches`,
`hmac.compare_digest`), `elvuelto/docs_views.py` (vistas + login form + `Cache-Control`),
`elvuelto/urls.py`, `SPECTACULAR_SETTINGS` en `settings/base.py`. Detalle de la corrida y de la
revisión adversarial: [[RUN-20260811-docs-swagger-key-gate]].

**Hallado como efecto colateral, NO arreglado acá (fuera de alcance, requiere decisión del owner):**
[[BACKEND-20260811-manage-py-settings-fallback-inseguro]] y
[[BACKEND-20260811-falta-https-enforcement-produccion]].

> [!decision] Actualización 2026-08-11 (misma sesión) — de `?key=` en la URL a login por sesión
> Versión original de este ADR aceptaba la key también por `?key=` en la URL (necesario porque el
> primer fetch del schema de Swagger UI ocurre antes de que la página lea ningún security scheme, y
> "Authorize" no puede alcanzar ese fetch). El owner pidió explícitamente que el navegador pida la key
> por **interfaz gráfica**, no por parámetro de una petición HTTP. Reemplazado por `DocsLoginView`
> (`/docs/login/`): un form HTML que valida la key y, si coincide, deja `request.session["docs_authorized"]
> = True` (sesión de Django, cookie ya existente en el proyecto — nada nuevo que instalar). La cookie
> viaja sola en cada request posterior, **incluido el fetch JS del schema que hace Swagger UI** — ya no
> hace falta reinyectar nada en ninguna URL. `next` validado con `url_has_allowed_host_and_scheme`
> contra open-redirect (verificado en vivo con un `next` a un host externo).
>
> Efecto colateral: esto **resuelve** dos de los hallazgos del review adversarial original — la key ya
> no viaja en una URL, así que no queda en logs de proxy/servidor ni se filtra en la página de error
> `DEBUG=True` de Django (que antes volcaba `request.GET` sin redactar). El trade-off aceptado que
> mencionaba la versión anterior de este ADR ya no aplica.
