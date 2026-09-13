---
tags: [tarea, infra, deploy, produccion, gobernanza, seguridad]
status: 🟡
prioridad: alta
updated: 2026-09-13
---

# INFRA-20260913-el-deploy-a-azure-ya-corrio — hay producción pública viva, y el cerebro la daba por no desplegada

> [!danger] Contesta la **P-2** que quedó abierta el 2026-08-30
> La pregunta era: *"¿el deploy a Azure ya corrió, o quedó preparado nomás?"*. La hipótesis del cerebro
> era **"está preparado, no desplegado"**. Es **falsa**. `https://elvuelto.online` está viva, sirviendo
> la app, con certificado válido, desde el **2026-08-30**. Y nadie lo registró.

## La evidencia (verificada el 2026-09-13, todo con peticiones GET/HEAD reales)
| chequeo | resultado |
|---|---|
| `GET https://elvuelto.online/` | **HTTP/2 200**, `via: 1.1 Caddy`, `server: nginx/1.31.4` |
| certificado | Let's Encrypt, `CN=elvuelto.online`, emitido **2026-08-30 18:59 GMT**, vence **2026-11-28 18:59 GMT** |
| `last-modified` del `index.html` | **2026-08-30 19:16 GMT** — o sea **28 minutos después** de `89d3f41` (2026-08-30 18:48 GMT). **Lo desplegado es HEAD.** |
| `http://<ip>/` con `Host: elvuelto.online` | `308 → https://`, `Server: Caddy` |
| `GET /api/` | **401** (la API responde y exige auth) |
| `GET /docs/` | **302** (el gate de `DOCS_API_KEY` funciona) |
| `GET /admin/login/` | 200, `x-frame-options: DENY`, `referrer-policy: same-origin` |
| `GET /api/<ruta-inexistente>/` | **404 plano de 179 bytes**, sin traceback → **`DEBUG=False` confirmado desde afuera** |
| `el_vuelto_desktop/app/config.json` (mtime 2026-08-31 04:13) | `{"env":"prod","baseUrl":"https://elvuelto.online","slug":"bambipan","displayName":"BambiPan"}` |

La topología del [[ADR-INFRA-20260830-deploy-azure-tls-en-el-borde]] **no es intención: está corriendo**.
Caddy en el borde, nginx detrás, exactamente como lo declaraba el comentario de `production.py:17-20`.

## Lo que esto cambia en el tablero
1. **[[INFRA-20260830-deploy-azure-sin-registro]] punto 4 quedó falso.** Dice *"El owner todavía no
   desplegó"*. Hay que corregirlo: desplegó, y el RUN de la corrida real **sigue faltando**.
2. **`SECURE_SSL=1` está prendido en la VM.** No hace falta entrar al servidor para saberlo: la cookie
   `csrftoken` de `/admin/login/` vuelve con el flag **`Secure`**, y `CSRF_COOKIE_SECURE` solo se fija
   dentro del `if SECURE_SSL:` (`production.py:23,33`). O sea que
   [[BACKEND-20260811-falta-https-enforcement-produccion]] está **mucho más cerrado de lo que dice la
   ficha** — ver abajo.
3. **El `.exe` del cajero ya apunta a producción** (`config.json` → `https://elvuelto.online`, tenant
   `bambipan`). La beta del `.exe` dejó de ser un experimento de laboratorio: está configurada contra
   la caja real de un negocio real.
4. Y por eso **[[POS-20260830-tragador-reposo-puede-trabar-la-caja]] sube de urgencia**: un POS que deja
   de responder ya no es un riesgo hipotético en el Mac del Planner.

## El estado real de HTTPS, medido (no leído)
`production.py` fija, adentro del `if SECURE_SSL:`:

| setting | línea | ¿activo en prod? | evidencia |
|---|---|---|---|
| `SECURE_PROXY_SSL_HEADER` | `:29` | sí | **demostrado**: con `SECURE_SSL_REDIRECT=True`, si `request.is_secure()` fuera `False` Django devolvería `301`, no `200`. Devuelve 200 ⇒ el `X-Forwarded-Proto` llega hasta gunicorn |
| `SECURE_SSL_REDIRECT` | `:31` | sí | (Caddy ya redirige antes con su 308, así que no se observa directo) |
| `SESSION_COOKIE_SECURE` | `:32` | sí | mismo bloque que el de abajo |
| `CSRF_COOKIE_SECURE` | `:33` | **sí — observado** | `set-cookie: csrftoken=…; SameSite=Lax; **Secure**` |
| `SECURE_HSTS_SECONDS` | `:39` | **NO** | **no aparece** `strict-transport-security` en ninguna respuesta |

O sea: de los cuatro warnings del criterio de aceptación de
[[BACKEND-20260811-falta-https-enforcement-produccion]] (**W004** HSTS · **W008** SSL_REDIRECT ·
**W012** SESSION_COOKIE_SECURE · **W016** CSRF_COOKIE_SECURE), **tres están cerrados en el deploy real
y queda W004**, porque `SECURE_HSTS_SECONDS` arranca en `0` y se sube **a mano**.

> [!decision] Y el motivo para no subirlo ya se cumplió
> El comentario de `production.py:35-38` dice que HSTS se sube *"DESPUÉS de confirmar que el dominio
> sirve bien por https"*, porque un valor alto puesto antes de tiempo **no se puede deshacer del lado
> del servidor**. Ese "después" ya llegó: el dominio sirve bien por https hace **catorce días**.
> Subirlo es poner `SECURE_HSTS_SECONDS` en el `.env` de la VM — arrancar corto (por ejemplo `3600`),
> verificar, y recién ahí subir a un año. ⚠️ Antes hay que resolver
> [[INFRA-20260913-dominio-apunta-tambien-al-parking]]: con el registro A del parking todavía puesto,
> un HSTS largo se cachea en el navegador del cliente y el 50% que cae en el parking —que **no escucha
> en 443**— deja de tener siquiera la opción de cargar por http.

## Deuda de gobernanza que deja este hallazgo
Según [[GOBERNANZA]] §7 y §9, falta:
- **`_sesiones/`**: el último archivo es `2026-08-30-planner-paso0-resync.md`. Todo lo del 08-30 por la
  tarde/noche —la guía de Azure, la feature de factura electrónica y **el deploy real**— no tiene nota
  de sesión.
- **`corridas/`**: no existe ningún `RUN-20260830-*`. La feature de factura electrónica está registrada
  como 🟢 corrido-ok en `00-registro-tenancy` pero su columna de reporte apunta al **ADR**, no a un RUN.
  El deploy no tiene RUN de ninguna clase.
- **Revisión adversarial ([[GOBERNANZA]] §10.2)** del pase de Azure: sigue sin correrse, y ahora el
  código que no se revisó está **expuesto a internet**.

## Qué hay que hacer
1. 🔴 Escribir el **RUN del deploy real** con lo que de verdad pasó en la VM (qué comandos, qué falló,
   cómo quedó Caddy: ¿en contenedor con el perfil `edge` o en el host?). El cambio sin commitear de
   `docker-compose.prod.yml` sugiere **en el host** — hay que confirmarlo con el owner.
2. 🔴 Resolver [[INFRA-20260913-clave-ssh-de-la-vm-sin-ignorar]] — es lo más urgente de todo el tablero.
3. 🔴 Resolver [[INFRA-20260913-dominio-apunta-tambien-al-parking]].
4. 🟡 Subir `SECURE_HSTS_SECONDS` (después del punto 3) y cerrar
   [[BACKEND-20260811-falta-https-enforcement-produccion]].
5. 🔴 **Commitear `docker-compose.prod.yml` — y antes corregir `.env.example:96`.** El cambio sin
   versionar no es cosmético: arregla un bug **reproducido**.
   - **En HEAD**, `docker-compose.prod.yml:88-89` usa `${DOMAIN:?…}` / `${ACME_EMAIL:?…}`. Compose
     **interpola el YAML entero ANTES de filtrar por `profiles`**, y `manage-docker.sh:90` pasa siempre
     los dos `-f`, así que **todo** subcomando prod (`build`, `up`, `down`, `logs`, `migrate`, `ps`)
     revienta si el `.env` de la raíz no tiene `DOMAIN` — **aunque el perfil `edge` esté apagado**.
     Eso rompe justo el caso de uso que el propio archivo promete en `:71-74`: *"el mismo `up prod` se
     usa para correr en la LAN por HTTP"*.
   - El working tree lo cambia a `${DOMAIN:-}` / `${ACME_EMAIL:-}`: el servicio queda dormido y, si
     alguien prende `edge` sin definirlas, Caddy falla al arrancar con un error legible — que es donde
     corresponde fallar.
   - ⚠️ **El fix deja mintiendo a `.env.example:96`**, que dice *"el compose las declara con `:?`"*.
     Se arregla gratis si se corrige el renglón **antes** de commitear.
   - Y el comentario nuevo (`:82-84`) mete una **topología alternativa** —Caddy en el host— que
     `docs/azure-deploy.md` §9 no contempla: la guía solo documenta el contenedor con perfil `edge`.
     Hay que confirmar con el owner cuál se usó y alinear la guía.

## Enlaces
[[INFRA-20260913-clave-ssh-de-la-vm-sin-ignorar]] · [[INFRA-20260913-dominio-apunta-tambien-al-parking]] ·
[[INFRA-20260830-deploy-azure-sin-registro]] · [[ADR-INFRA-20260830-deploy-azure-tls-en-el-borde]] ·
[[BACKEND-20260811-falta-https-enforcement-produccion]] · [[POS-20260830-tragador-reposo-puede-trabar-la-caja]] ·
[[GOBERNANZA]] · [[2026-09-13-planner-paso0-resync]]
