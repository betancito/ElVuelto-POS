---
tags: [tarea, backend, seguridad, config]
status: 🔴
prioridad: media
updated: 2026-08-15
---

# BACKEND-20260811-falta-https-enforcement-produccion — sin `SECURE_SSL_REDIRECT`/cookies seguras en prod

**Tipo:** robustez/seguridad · **Encontrado en:** review adversarial de
[[ADR-G-20260811-docs-swagger-key-gate]] (lente config-drift, workflow) · verificado con `grep` real:
`SECURE_SSL_REDIRECT`, `SESSION_COOKIE_SECURE`, `CSRF_COOKIE_SECURE`, `SECURE_PROXY_SSL_HEADER` — cero
resultados en todo `elvuelto/settings/`.

## El problema
`settings/production.py` (`DEBUG=False`) no fija ninguno de los settings de Django que fuerzan HTTPS o
marcan cookies como seguras — quedan en los defaults inseguros de Django. Si el borde del deploy
(load balancer, proxy) no termina y fuerza TLS de forma independiente, cualquier credencial de la app
— JWTs de `Authorization`, cookies de sesión/CSRF, incluida la **cookie de sesión del gate de docs**
(`elvuelto/docs_views.py:115`) y su token CSRF (`docs_views.py:129`) — puede capturarse en texto plano
en tránsito. No es específico de la feature de docs: es un gap de toda la app, que la nueva feature
simplemente hace un poco más visible.

## Por qué no se arregló junto con la feature de docs
Preexistente, alcance de toda la app — no algo que la feature de docs introdujo. Requiere saber cómo
está armado el borde real del deploy (¿dónde termina TLS?) antes de fijar `SECURE_PROXY_SSL_HEADER`
correctamente — pregunta para el owner sobre la infraestructura de producción real, no derivable del
código.

## Criterio de aceptación
`settings/production.py` fija `SECURE_SSL_REDIRECT=True`, `SESSION_COOKIE_SECURE=True`,
`CSRF_COOKIE_SECURE=True`, **`SECURE_HSTS_SECONDS`** (agregado 2026-08-15), y `SECURE_PROXY_SSL_HEADER`
coherente con el proxy real que termina TLS. Verificable con `manage.py check --deploy`: hoy dispara
**W004 · W008 · W012 · W016**; el criterio es que no dispare ninguno.

> [!info] Re-verificado en el PASO 0 del 2026-08-15 — ya no es solo un `grep`
> `production.py` tiene **34 líneas** y solo contiene `DEBUG` (`:4`), `ALLOWED_HOSTS` (`:5-9`) y
> `LOGGING` (`:11-33`): **cero** flags de seguridad, ni ahí ni en `base.py` (218 líneas). Se corrió
> `check --deploy` con `settings.production` en vivo y dispara los cuatro warnings de HTTPS que Django
> tiene: **W004** (HSTS), **W008** (SSL_REDIRECT), **W012** (SESSION_COOKIE_SECURE), **W016**
> (CSRF_COOKIE_SECURE).
> - `SecurityMiddleware` (`base.py:31`), `SessionMiddleware` (`:33`) y `CsrfViewMiddleware` (`:35`) **sí**
>   están montados — quedan inertes porque ningún setting los activa.
> - **HSTS va del lado bloqueado**, con `SECURE_SSL_REDIRECT`: no tiene sentido sin TLS terminando en el
>   borde. La mitad que se puede hacer ya sigue siendo `SESSION_COOKIE_SECURE` + `CSRF_COOKIE_SECURE`.
> - Precisión sobre el texto de arriba: en `docs_views.py:115` **no se setea ninguna cookie ni ningún
>   flag** — es `request.session[DOCS_SESSION_KEY] = True`. La cookie `sessionid` la emite
>   `SessionMiddleware` con los flags **globales** (hoy `Secure=False` por default de Django). El punto
>   del ítem no cambia; la mecánica sí.
> - Sigue en pie el bloqueo real: **no hay nada de infraestructura de deploy en el repo** (ni Dockerfile,
>   ni docker-compose, ni nginx.conf, ni Procfile, ni fly/render/railway, ni `.tf`), así que "dónde
>   termina TLS" no es derivable del código. La pregunta al owner sigue abierta.

> [!info] Precisión agregada en el PASO 0 del 2026-08-13
> El ítem **se puede partir en dos**: `SESSION_COOKIE_SECURE` y `CSRF_COOKIE_SECURE` **no dependen de la
> topología** y se pueden fijar ya, sin consultarle nada al owner. Solo `SECURE_SSL_REDIRECT` y
> `SECURE_PROXY_SSL_HEADER` quedan bloqueados por "¿dónde termina TLS?".
> También se corrigió arriba un dato desfasado: la nota decía que `DOCS_API_KEY` viaja como `?key=`.
> **Ese modo ya no existe** — hoy es un formulario (`docs_views.py:113-117`, la key sale de
> `request.POST.get("key")` en `:114`) o el header `X-Docs-Api-Key`; `docs_auth.py:21-26` documenta la
> eliminación. El cambio **refuerza** el ítem: el secreto de docs ahora vive en una cookie que necesita
> el flag `Secure`. Ver [[2026-08-13-planner-paso0-resync]].

## Notas para el Dev (para cuando se tome, no ahora)
- `SECURE_PROXY_SSL_HEADER` mal configurado (o configurado sin que el proxy real lo esté enviando)
  puede causar un loop de redirect — no es un cambio "siempre seguro" sin confirmar primero la
  topología real del deploy con el owner.
