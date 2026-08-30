---
tags: [tarea, infra, deploy, docs, seguridad, gobernanza]
status: 🟡
prioridad: alta
updated: 2026-08-30
---

# INFRA-20260830-deploy-azure-sin-registro — hay un cuarto trabajo dentro de `abee9d8` que el cerebro no tiene

> [!danger] No es doc que se desfasó: es trabajo entero que nunca entró al cerebro
> `grep -rn "Azure\|sslmode\|DB_SSLMODE" Cerebro-ElVuelto/` → **0 hits**. Ni RUN, ni ADR, ni ficha, ni
> nota de sesión. La única traza es el mensaje del commit: *"deploy ready commit"*.

## Qué se hizo, y dónde vive
El commit `abee9d8` (2026-08-27 23:29) trae, además de Docker (`RUN-20260826`), el `.exe`
(`RUN-20260824`) y la caja (`RUN-20260827`), un **pase de preparación para deploy público con TLS**.
Tres piezas que se explican entre sí:

| pieza | ancla | qué hace |
|---|---|---|
| TLS a la base | `el_vuelto_backend/elvuelto/settings/base.py:70-77` | `"OPTIONS": {"sslmode": config("DB_SSLMODE", default="prefer")}`, con el comentario *"Azure Database for PostgreSQL EXIGE TLS"* |
| HTTPS de Django | `el_vuelto_backend/elvuelto/settings/production.py:11-43` | todo el bloque `SECURE_*` detrás del flag `SECURE_SSL` |
| documentación operativa | `.env.example:74-89` | sección *"Deploy público con dominio y HTTPS"* (`SECURE_SSL=1`, `SECURE_HSTS_SECONDS`, `DB_SSLMODE=require`) |

## La decisión de topología que quedó sin ADR
`production.py:17-20` dice literal: *"Cierra `BACKEND-20260811-falta-https-enforcement-produccion`, que
estaba bloqueado por una pregunta de infraestructura: «¿dónde termina TLS?». La respuesta del deploy de
Azure es: en el borde (**Caddy**), que le habla a nginx por HTTP dentro de la red privada."*

Eso es una **decisión de arquitectura** — responde la pregunta que bloqueaba un ítem alta desde el
2026-08-11 — y vive solo en un comentario de código. [[ADR-INFRA-20260826-docker-nginx-mismo-origen]]
todavía la deja abierta en su línea 99 (*"cuando haya HTTPS, el proxy tiene que mandar…"*).

> [!warning] Caddy no está en el repo
> `find . -iname "*caddy*"` (fuera de `node_modules`/`.venv`) → **cero resultados**. Todas las menciones
> son comentarios (`production.py:19`, `.env.example:77`, `docker/nginx/prod.conf:12`, `dev.conf:27`,
> `proxy_common.conf:17`). Hoy **nginx ES el borde** (`proxy_common.conf:24`). La topología con Caddy
> adelante es **intención declarada, no configuración presente** — o sea que
> `SECURE_PROXY_SSL_HEADER` no es verificable desde este repo.

## Qué hay que hacer
1. ✅ **ADR escrito el 2026-08-30** → [[ADR-INFRA-20260830-deploy-azure-tls-en-el-borde]]. Registra la
   topología (TLS en Caddy, HTTP a nginx en la red privada), por qué `SECURE_SSL` viene apagado, y las
   cuatro alternativas descartadas con el número que las descarta.
2. ✅ **Guía escrita** → `docs/azure-deploy.md` (no existía; el owner la pidió creyendo que sí).
   Y la **pieza que faltaba** se implementó: `docker/caddy/` + servicio `caddy` con `profiles: ["edge"]`.
3. ✅ **Reclasificado** [[BACKEND-20260811-falta-https-enforcement-produccion]] de 🔴 a 🟡.
4. 🔴 **Sigue pendiente el RUN de la corrida real.** El owner todavía no desplegó: no se ejecutó nada
   contra su suscripción (`az` no está instalado en el entorno del Planner, no hay credenciales) y la
   imagen de Caddy no se pudo construir (daemon de Docker apagado). El RUN se escribe cuando el deploy
   corra de verdad.
5. 🔴 **La desviación de [[GOBERNANZA]] §10.2 sigue anotada**: el pase de Azure de `abee9d8` —que toca
   TLS, cookies de sesión y validación de hosts— nunca tuvo revisión adversarial. La guía del 08-30 sí
   salió de una investigación de 5 agentes con verificación contra `learn.microsoft.com`, pero eso es
   investigación, no revisión adversarial del código.

> [!warning] Lo irreversible que salió de investigar, y que el owner tiene que mirar HOY
> **El modo de red del Flexible Server no se puede cambiar después de creado.** Si quedó con VNet
> integration, nunca va a tener endpoint público ni private endpoints. Si quedó en public access, sí
> admite agregarle un Private Endpoint después. El paso 0 de la guía es averiguarlo.
> Lo mismo con la **geo-redundancia de backups**: solo se configura al crear el servidor.

## Anclas
- `el_vuelto_backend/elvuelto/settings/base.py:70-77`
- `el_vuelto_backend/elvuelto/settings/production.py:11-43` (comentario de topología en `:17-20`)
- `.env.example:74-89`
- `docker-compose.prod.yml:36-47`
- `docker/nginx/prod.conf:14-17` · `docker/nginx/proxy_common.conf:24-25`

## Enlaces
[[BACKEND-20260811-falta-https-enforcement-produccion]] · [[ADR-INFRA-20260826-docker-nginx-mismo-origen]] ·
[[INFRA-20260826-dockerizacion-stack]] · [[GOBERNANZA]] · [[2026-08-30-planner-paso0-resync]] ·
[[ADR-INFRA-20260830-deploy-azure-tls-en-el-borde]]
