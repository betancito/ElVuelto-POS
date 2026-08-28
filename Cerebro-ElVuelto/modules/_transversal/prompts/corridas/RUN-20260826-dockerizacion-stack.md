---
tags: [corrida, run, infra, docker, transversal]
status: 🟢
updated: 2026-08-26
---

# RUN-20260826 — Dockerización del stack (pedido directo)

Pedido directo del owner en el chat ([[GOBERNANZA]] §10), con Discovery y decisiones aprobadas antes de
tocar código. Decisión: [[ADR-INFRA-20260826-docker-nginx-mismo-origen]] ·
ficha: [[INFRA-20260826-dockerizacion-stack]].

## Qué pidió
Meter front y back en contenedores detrás de un nginx, con un `scripts/manage-docker.sh` de un solo
comando, para poder **abrir la app desde otro dispositivo de la red local**. Especificó el esquema de
puertos: *"dentro de docker front sera 5173 y nginx expondra ese en mi computadora exactamente en ese
mismo puerto… el back en 8000 y nginx lo expone en el 8000 de mi pc"*, y pidió explícitamente
*"dime si algo no cuadra"*.

Sobre la base de datos: *"no hacer nada, usar la misma db… esa funciona bien"*.

## Lo que no cuadraba, y cómo se concilió
Dos puertos publicados = **dos orígenes** = vuelve el CORS y el bundle tiene que volver a saber el
`host:port` del backend, que es justo lo que rompe el acceso desde el celular.

Se le dijo antes de escribir nada y se resolvió sin negociarle los números: **nginx escucha en los dos
puertos**. El `:5173` sirve la app completa en un solo origen (`/` al front, `/api/` al back) y el
`:8000` es un passthrough directo al backend. Aceptado.

## Hallazgos del Discovery que cambiaron el plan
1. 🔴 **El Postgres del proyecto es de otro proyecto.** El 5432 del host no es un Postgres nativo: lo
   tiene el contenedor `naia-postgres` (`postgres:16`) de `naia-app`, y la base `elvuelto` (9.5 MB,
   1 tenant / 4 usuarios / 3 productos / 1 venta) vive adentro. ElVuelto le pide la BD prestada a otro
   proyecto. El owner decidió dejarlo así.
2. ⚖️ **El repo ya tenía el camino de mismo origen construido — y desandado.** `vite.config.ts:19-23`
   tenía el proxy `/api → 127.0.0.1:8000` con un comentario que menciona un nginx en
   `192.168.1.9:5173`, pero **no hay `.env` en el frontend**, así que `VITE_API_URL` quedaba `undefined`
   y ganaba el fallback absoluto de `apiBase.ts:7`. El proxy era código muerto.
3. 🔴 **`CSRF_TRUSTED_ORIGINS` no existía** en ninguno de los tres settings (cero hits). Sin él, el
   login del admin desde la LAN da 403.
4. 🔴 **`gunicorn` no estaba en `requirements.txt`.** Hubo que agregarlo para el stage de prod.
5. 🔴 **`.gitignore:16` ignora `package-lock.json` en todo el repo** → `npm ci` no puede correr en un
   clon nuevo. Es la misma deuda que el PASO 0 de esta mañana anotó para `el_vuelto_desktop`
   (ver [[2026-08-26-planner-paso0-resync]], Hallazgo 6), acá convertida en blocker real.
6. ✅ Los 10 paquetes del backend tienen wheels arm64 (`psycopg2-binary` incluido): **ningún servicio
   necesita `platform: linux/amd64`**. El backend es WSGI plano — sin Channels, sin ASGI: el único
   WebSocket del sistema es el HMR de Vite.

## Verificación con salida real
Corrida en puertos temporales `15173/18000` porque el owner tenía sus servidores del host ocupando
5173/8000 (no se mataron sin permiso); después repetida en los puertos definitivos.

### Dev
```
GET :5173/                                   -> 200  (SPA)
GET :5173/api/                               -> 401  ← Django, NO 502
GET :5173/api/tenants/check-by-slug/bambipan/-> 200  {"exists":true,"nombre":"BambiPan",...}
GET :5173/admin/                             -> 302
GET :5173/healthz                            -> 200 "ok"
GET :8000/admin/  (passthrough)              -> 302
```
- **Lectura real de la BD** a través del proxy: el JSON de arriba sale de `naia-postgres` vía
  `host.docker.internal`. La conexión funciona.
- **Desde `192.168.1.75`**: los mismos 200, y **sin un solo header `Access-Control-*`** — no hay CORS
  porque no hay dos orígenes.
- **HMR**: handshake WebSocket por nginx → `HTTP/1.1 101 Switching Protocols`, igual desde la LAN.
- **Hot reload `.tsx`**: `[vite] hmr update /src/features/auth/StaffLoginPage.tsx` (update real, no
  page reload).
- **Reload `.py`**: `/app/apps/sales/views.py changed, reloading.` + arranque nuevo del server.
- **CSRF desde la LAN**: POST a `/admin/login/` con `Origin: http://192.168.1.75:5173` → **200**, y
  `grep "CSRF verification failed"` → **0 ocurrencias**.
- `migrate dev` → *No migrations to apply.* · healthcheck de nginx → `healthy, fallos=0` ·
  `down dev` → 0 contenedores.

### Prod
```
GET :5173/                    -> 200, sirve /assets/index-BcHPfXif.js  (dist hasheado)
GET /login/bambipan           -> 200  (fallback SPA de React Router)
GET /static/admin/css/base.css-> 200  (nginx desde el volumen, con DEBUG=False)
404 de la API                 -> sin traceback  (DEBUG=False confirmado)
backend                       -> gunicorn, 3 workers, uid=1001(elvuelto) NO-root
desde 192.168.1.75            -> 200
```

## Revisión adversarial propia — 3 defectos, los 3 arreglados
Salieron de correr el stack, no de leerlo:

1. 🔴 **El healthcheck nunca podía pasar, por dos razones a la vez.** Usaba `wget --tries --spider`
   (opciones de GNU) contra el **busybox** de Alpine, que no las tiene; y apuntaba a `localhost`, que
   adentro del contenedor resuelve a `::1` mientras nginx escucha IPv4 → *Connection refused*. Quedó
   `wget -q -O- http://127.0.0.1:5173/healthz`. Ahora `healthy, fallos=0`.
2. 🔴 **`build prod` iba a pisar las imágenes de dev.** `.env` fijaba `TAG=dev` y el override de prod
   usa `${TAG:-prod}`, así que el valor del `.env` ganaba para los dos entornos. `TAG` pasa a ir sin
   setear y cada entorno pone su default (`:dev` / `:prod`), verificado con `compose config`.
3. 🔴 **El lockfile ignorado rompía el criterio de "clean checkout"** (hallazgo 5 de arriba). Se agregó
   una negación puntual: `!el_vuelto_frontend/package-lock.json`.

## Doble actualización
- `CLAUDE.md` raíz: sección **Docker** — topología, los dos puertos, el porqué del mismo origen, la
  ausencia de servicio `db` y las dos trampas (`$http_host`, bind a `0.0.0.0`).
- `el_vuelto_frontend/CLAUDE.md`: la sección **Environment** decía `VITE_API_URL=http://localhost:8000/api`
  como si fuera lo correcto. Ahora explica que la ruta relativa `/api` es el default y por qué poner una
  URL absoluta ahí es exactamente lo que rompe el acceso desde la LAN.
- `el_vuelto_backend/CLAUDE.md`: `CSRF_TRUSTED_ORIGINS` en las env vars con la explicación de las dos
  mitades (la lista y el `Host` con puerto), `gunicorn` en dependencias y la nota de `DB_HOST` en Docker.
- `docs/docker.md`: guía completa — comandos, puertos, IP de la LAN, el aviso de firewall de macOS y el
  troubleshooting de los tres fallos probables (502, WebSocket del HMR, 403 de CSRF).
- Cerebro: este RUN + [[ADR-INFRA-20260826-docker-nginx-mismo-origen]] + ficha + índices.

## ⚠️ Desviación de protocolo, anotada y no escondida
[[GOBERNANZA]] §10 pide tres compensaciones cuando el Planner implementa un pedido directo:
1. **Testing real contra código en ejecución** — ✅ hecho, todo lo de arriba es salida real de `curl` y
   de los logs de los contenedores.
2. **Revisión adversarial con workflow de varios lentes** — 🔴 **NO se corrió.** Solo hubo revisión
   propia (los 3 defectos de arriba). El owner no la pidió y el trabajo es de infraestructura, no de
   tenancy/dinero/permisos; pero el setup **sí toca CSRF y validación de hosts**, así que la omisión no
   es inocua y queda registrada acá.
3. **Doble actualización** — ✅ hecha, arriba.

## Lo que NO se probó
- **Abrir la app en el celular a ojo.** Se probó con `curl` desde la IP de la LAN (200 en todas las
  rutas, WebSocket 101), pero no hay navegador en este entorno. Falta la confirmación visual del owner
  — la misma deuda que arrastran las features del 08-15/08-16.
- **`up prod` en un servidor real.** Se verificó en el Mac; el deploy no existe todavía.

## Veredicto
✅ **Los dos entornos verificados de punta a punta contra servidor real.** Falta que el owner lo abra en
el celular y, cuando quiera, el commit — nada de esto está versionado todavía.
