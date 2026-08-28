---
tags: [adr, infra, docker, nginx, global]
status: aceptado
updated: 2026-08-26
---

# ADR-INFRA-20260826 — Stack en Docker con nginx y un solo origen

## Contexto
Hasta hoy backend y frontend corrían **sueltos en el host**: `runserver` en `127.0.0.1:8000` y Vite en
`5173`. Eso alcanza para trabajar en el Mac y no alcanza para nada más. El owner necesitaba
**abrir la app a su red local** — probarla desde el celular y desde el POS — y ahí el arreglo suelto
se cae por dos lados a la vez:

1. `src/app/apiBase.ts:7` tenía `import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api'`.
   **`localhost` en el celular es el celular.** Cualquier dispositivo que no fuera el Mac cargaba la
   página y no podía hablar con el API.
2. Frontend y backend en puertos distintos = **dos orígenes** = preflight de CORS en cada llamada, y la
   lista de orígenes permitidos habría que editarla cada vez que cambia una IP.

Había además una contradicción vieja en el repo, encontrada en el PASO 0 de esta misma tarea:
`vite.config.ts:19-23` **ya tenía** un proxy `/api → 127.0.0.1:8000` con un comentario que hablaba de
un nginx en `192.168.1.9:5173` — pero como no existe `.env` en el frontend, `VITE_API_URL` quedaba
`undefined` y ganaba el fallback absoluto. **El camino de mismo origen estaba construido y desandado
por su propio default.**

> [!info] El pedido literal del owner sobre los puertos
> *"dentro de docker front sera 5173 y nginx expondra ese en mi computadora exactamente en ese mismo
> puerto… y el back corre en contenedor separado en 8000 y nginx toma puerto 8000 de docker y lo expone
> en el 8000 de mi pc."*
>
> Tal cual, eso son **dos orígenes** y devuelve el problema 2. La decisión de abajo respeta los números
> al pie de la letra sin perder el mismo origen.

## Decisión
Aprobada por el owner el 2026-08-26 ([[GOBERNANZA]] §10, pedido directo).

1. **Tres servicios: `backend`, `frontend`, `nginx`.** Solo **nginx publica puertos**; los otros dos
   se hablan por la red interna de compose, por nombre de servicio.
2. **nginx escucha en DOS puertos**, y ahí está el truco que concilia el pedido con el mismo origen:
   - **`:5173`** — la app completa en **un solo origen**: `/` → `frontend:5173`, y `/api/` `/admin/`
     `/docs/` `/redoc/` `/static/` `/media/` → `backend:8000`. **Esta es la URL de la LAN.**
   - **`:8000`** — passthrough directo al backend, para `curl`, Postman, Swagger y el admin.
   Los números publicados son **los mismos que usan los servicios adentro**, como pidió el owner.
3. **El frontend llama al API en la ruta relativa `/api`.** `apiBase.ts` pasa a
   `?? '/api'`. Es lo único que hace que el mismo bundle sirva en `localhost`, en `192.168.1.75` y en
   un dominio futuro **sin recompilar y sin CORS**.
4. **NO se agrega un servicio `db`.** El Postgres del proyecto ya corre como contenedor **fuera** de
   este stack (`naia-postgres`, de otro proyecto del owner) y tiene la base `elvuelto` viva. El backend
   lo alcanza por `DB_HOST=host.docker.internal`. Decisión explícita del owner:
   *"no hacer nada, usar la misma db… para prod se crea una por separado y solo hay que cambiar link de
   conexión"*. `clean` nunca la toca.
5. **`proxy_set_header Host $http_host`, NUNCA `$host`.** Ver abajo — es la decisión menos obvia y la
   que más caro se paga.
6. **`CSRF_TRUSTED_ORIGINS` se crea** (no existía en el repo: cero hits en los tres settings), leído por
   env en `settings/base.py`.
7. **Dev y prod comparten topología**, solo cambia el upstream detrás de `/`: Vite en dev, una imagen
   `nginx:alpine` con el `dist/` construido en prod. Así `dev.conf` y `prod.conf` difieren en poco y no
   hay carrera de volumen en el primer arranque.
8. **`BIND_HOST`** (default `0.0.0.0`) parametriza la interfaz. Existe para que, si algún día el owner
   pone un nginx propio del host adelante, los contenedores puedan pasar a `127.0.0.1` y quedar
   privados.

## La decisión no obvia: `$http_host` y no `$host`
La receta que circula en todos lados es `proxy_set_header Host $host`. **Acá está mal.**

`$host` **descarta el puerto**. Entrando por `http://192.168.1.75:5173`, el navegador manda
`Origin: http://192.168.1.75:5173` pero nginx reenviaría `Host: 192.168.1.75`. Django arma entonces
`request.get_host()` sin puerto, ya no coincide con el `Origin`, y `CsrfViewMiddleware` rechaza **todo
POST** con 403 — incluido el login del admin. Y no hay entrada de `CSRF_TRUSTED_ORIGINS` que lo salve,
porque el problema es que los dos strings que se comparan ya no pueden ser iguales.

`$http_host` reenvía el `Host` exactamente como lo mandó el cliente, con puerto. Verificado con un POST
real al admin desde el origen de la LAN: 200, cero ocurrencias de *"CSRF verification failed"*.

## Alternativas descartadas
| opción | veredicto |
|---|---|
| **Un solo puerto publicado** (lo que pedía el brief original) | ❌ El owner pidió explícitamente 5173 y 8000, "el mismo adentro y afuera". El doble listener le da sus números **y** el mismo origen |
| **Publicar también `backend` y `frontend`** | ❌ Choca: nginx ya tiene el 8000 del host, el stack no arrancaría (`address already in use`). Y un `frontend` publicado sería un **segundo origen que sirve el SPA sin el ruteo de `/api/`** — la página carga y toda llamada da 404 |
| **Servicio `db` en el compose** | ❌ Decisión del owner: la base actual funciona y para prod se apunta a otra. Migrar datos era trabajo sin beneficio |
| **`VITE_API_URL` absoluto con la IP de la LAN** | ❌ Hornea la IP en el bundle: cambia la red, hay que recompilar. Es exactamente el problema que esto viene a resolver |

## Consecuencias
- ✅ La app sirve en `http://<ip-lan>:5173` desde cualquier dispositivo de la red, **sin CORS y sin
  recompilar**. Verificado con `curl` real desde `192.168.1.75`.
- ✅ Las imágenes son las mismas que se pueden empujar a un registry: `${IMAGE_PREFIX}-*:${TAG}`.
- ⚠️ **El host y los contenedores no pueden correr a la vez.** Usan los mismos números a propósito;
  hay que bajar el `npm run dev` y el `runserver` del host antes de `up dev`. Pasó en la verificación.
- ⚠️ `node_modules` vive en un volumen que **se siembra una sola vez**: al cambiar `package.json` hay
  que correr `clean dev`.
- ⚠️ Fijar la IP explícita en el mapeo perdió el binding IPv6 (`tcp46` → `tcp4`). Irrelevante para una
  LAN IPv4; `BIND_HOST=::` lo devuelve.
- 📌 `django-cors-headers` queda instalado y configurado pero **sin trabajo real**: lo que resuelve la
  LAN es el mismo origen, no la lista de CORS. Se deja para clientes de API en otro origen.

## Enlaces
[[RUN-20260826-dockerizacion-stack]] · [[INFRA-20260826-dockerizacion-stack]] ·
[[BACKEND-20260811-falta-https-enforcement-produccion]] (cuando haya HTTPS, el proxy tiene que mandar
`X-Forwarded-Proto` — ya lo manda) · [[DESKTOP-20260821-app-escritorio-cajero-exe]] (el `.exe` de caja
apunta a una URL de la LAN: esta es esa URL)
