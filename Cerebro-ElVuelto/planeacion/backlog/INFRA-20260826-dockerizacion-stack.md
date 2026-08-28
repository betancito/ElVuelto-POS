---
tags: [tarea, feature, infra, docker, nginx]
status: 🟢
prioridad: feature
updated: 2026-08-26
---

# INFRA-20260826-dockerizacion-stack — Front y back en Docker detrás de nginx

> [!decision] Pedido directo del owner, implementado el 2026-08-26
> Corrida y verificada en dev y prod contra servidor real. Decisión:
> [[ADR-INFRA-20260826-docker-nginx-mismo-origen]] · corrida:
> [[RUN-20260826-dockerizacion-stack]]. ⚠️ Falta la confirmación visual del owner en el celular y el
> commit (nada está versionado).

## Qué se buscaba
Poder **abrir la app desde otro dispositivo de la red local** (celular, el POS de la caja) sin pelear
con CORS ni recompilar el frontend por cada IP. De paso, dejar imágenes reutilizables para el deploy.

## Lo que decidió la arquitectura
El mismo origen. `apiBase.ts` pasa a llamar al API en la ruta **relativa `/api`**, y nginx sirve el SPA
y Django bajo un solo puerto. Sin eso, `localhost:8000` horneado en el bundle significa *el celular*
cuando lo abre el celular.

## Entregado
```
docker-compose.yml · docker-compose.dev.yml · docker-compose.prod.yml
docker/backend/Dockerfile · docker/frontend/Dockerfile · docker/nginx/Dockerfile
docker/nginx/{dev,prod,proxy_common}.conf
scripts/manage-docker.sh   (build up down restart logs ps migrate makemigrations
                            shell bash test createsuperuser collectstatic clean)
.env.example · el_vuelto_{backend,frontend}/.dockerignore · docs/docker.md
```

Topología: **solo nginx publica puertos**. `:5173` = la app en un origen (`/` al front, `/api/`
`/admin/` `/docs/` al back) · `:8000` = passthrough al backend. Los números son los mismos adentro y
afuera de Docker, como pidió el owner.

**Sin servicio `db`:** el Postgres vive en un contenedor de otro proyecto (`naia-postgres`) y el backend
lo alcanza por `host.docker.internal`. Decisión explícita del owner.

## Archivos de app tocados (fuera del setup de Docker)
| archivo | cambio |
|---|---|
| `src/app/apiBase.ts:7` | `?? 'http://localhost:8000/api'` → **`?? '/api'`**. Único call site: hay un solo `createApi` |
| `vite.config.ts` | bloque `server`: `host`, `strictPort`, `hmr.clientPort`, `watch.usePolling`, `allowedHosts`, proxy con target por env |
| `src/vite-env.d.ts` | `VITE_API_URL` / `VITE_APP_NAME` pasan a opcionales (no hay `.env` en el front) |
| `el_vuelto_frontend/.env.example` | deja de forzar la URL absoluta |
| `settings/base.py` | **`CSRF_TRUSTED_ORIGINS` nuevo** — no existía en el repo |
| `requirements.txt` | `+gunicorn==23.0.0` (solo lo usa el stage prod) |
| `.gitignore` | negación del lockfile del front, o `npm ci` no corre en un clon nuevo |
| los 3 `CLAUDE.md` | doble actualización |

## Deuda que nace acá
- 🔴 **La revisión adversarial de [[GOBERNANZA]] §10 no se corrió** (solo revisión propia, 3 defectos
  encontrados y arreglados). El setup toca CSRF y validación de hosts, así que la omisión no es inocua.
  Registrada en el RUN.
- 🟡 **El host y los contenedores no pueden correr a la vez** — usan los mismos puertos a propósito.
- 🟡 **`node_modules` en un volumen que se siembra una sola vez**: al cambiar `package.json` hay que
  correr `clean dev`.
- 🟡 **Sin HTTPS.** Cuando lo haya, hace falta [[BACKEND-20260811-falta-https-enforcement-produccion]];
  el proxy ya manda `X-Forwarded-Proto`.
- 🟡 **Sin CI.** Las imágenes se etiquetan `${IMAGE_PREFIX}-*:${TAG}` a propósito, para que un job las
  pueda empujar sin cambiar nada.

## Enlaces
[[ADR-INFRA-20260826-docker-nginx-mismo-origen]] · [[RUN-20260826-dockerizacion-stack]] ·
[[2026-08-26-planner-paso0-resync]] · [[DESKTOP-20260821-app-escritorio-cajero-exe]] (el `.exe` de caja
apunta a una URL de la LAN — esta es esa URL)
