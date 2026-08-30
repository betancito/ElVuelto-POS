---
tags: [tarea, backend, seguridad, config]
status: 🟡
prioridad: media
updated: 2026-08-30
---

# BACKEND-20260811-falta-https-enforcement-produccion — sin `SECURE_SSL_REDIRECT`/cookies seguras en prod

**Tipo:** robustez/seguridad · **Encontrado en:** review adversarial de
[[ADR-G-20260811-docs-swagger-key-gate]] (lente config-drift, workflow) · verificado con `grep` real:
`SECURE_SSL_REDIRECT`, `SESSION_COOKIE_SECURE`, `CSRF_COOKIE_SECURE`, `SECURE_PROXY_SSL_HEADER` — cero
resultados en todo `elvuelto/settings/`.

> [!warning] RE-CLASIFICADO 🟡 el 2026-08-30 — el commit `abee9d8` lo implementó, pero viene APAGADO
> Todo lo que pedía el criterio de aceptación **existe hoy** en
> `elvuelto/settings/production.py:11-43` — y encima el commit contestó la pregunta de infra que lo
> bloqueaba. Pero está entero adentro de un `if SECURE_SSL:` (`:23`) con
> `SECURE_SSL = config("SECURE_SSL", default=False, cast=bool)` (`:21`), y `docker-compose.prod.yml:44`
> lo fija en `${SECURE_SSL:-0}`. **Un deploy con `settings.production` sin setear `SECURE_SSL` queda
> exactamente igual de expuesto que antes**: mismos W004, W008, W012, W016.
>
> Y aun con `SECURE_SSL=1`, **W004 sigue disparando**: `SECURE_HSTS_SECONDS` arranca en `0`
> (`production.py:39`), que es falsy para el check de Django
> (`django/core/checks/security/base.py:168-170`).
>
> El apagado por defecto **está bien argumentado** (`production.py:12-15`: el mismo settings module
> corre el stack de prod en la LAN por HTTP con `manage-docker.sh up prod`, donde un
> `SECURE_SSL_REDIRECT` dejaría la app inalcanzable). O sea: pasó de *"no existe"* a *"hay un botón
> correcto y está en off"*. **No es lo mismo que estar protegido**, y por eso no se marca 🟢.

> [!info] Anclas de hoy (las de esta ficha estaban desfasadas)
> | afirmación vieja | realidad al 2026-08-30 |
> |---|---|
> | «cero flags de seguridad, `grep` → 0 resultados» | `production.py:29` proxy header, `:31` SSL_REDIRECT, `:32` SESSION_COOKIE_SECURE, `:33` CSRF_COOKIE_SECURE, `:39-43` HSTS |
> | «`production.py` tiene 34 líneas» | **67 líneas** |
> | «no hay NADA de infraestructura de deploy en el repo» | **falsa**: `docker-compose{,.dev,.prod}.yml`, `docker/backend/Dockerfile`, `docker/nginx/*`, `docs/docker.md` |
> | «la pregunta de dónde termina TLS sigue abierta» | contestada en `production.py:17-20`: en el borde (**Caddy**), que habla HTTP a nginx en la red privada |
> | «cookies Secure se pueden fijar ya, no dependen de la topología» | **sí dependen acá**: sobre HTTP en LAN el navegador no devuelve una cookie `Secure` y se caen el login del admin y el gate de `/docs/` |
>
> Plumbing verificado: `docker/nginx/proxy_common.conf:25`
> `proxy_set_header X-Forwarded-Proto $forwarded_proto` + `docker/nginx/prod.conf:14-17`
> (`map` que **respeta** el valor del borde en vez de pisarlo con `$scheme` — que es justo la trampa
> del bucle de redirect).
>
> ⚠️ **Caddy no está en el repo**: `find . -iname "*caddy*"` → 0 hits fuera de `node_modules`/`.venv`.
> Hoy **nginx ES el borde** (`proxy_common.conf:24`). O sea que la mitad
> «`SECURE_PROXY_SSL_HEADER` coherente con el proxy real» **no es verificable desde este repo**.
>
> Nada de esto está registrado en el cerebro → [[INFRA-20260830-deploy-azure-sin-registro]].

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
