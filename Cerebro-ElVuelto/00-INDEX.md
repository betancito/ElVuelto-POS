---
tags: [indice, router]
status: activo
updated: 2026-08-30
---

# 00-INDEX — Router del cerebro ElVuelto

Punto de entrada para agentes. Delgado a propósito. **Empieza aquí.**

> [!warning] PASO 0 obligatorio (re-sincronización en frío)
> Antes de proponer o escribir nada: (1) lee [[GOBERNANZA]] + el `estado-<mod>` del módulo activo + la última nota de `_sesiones/`; (2) contrasta contra `git log` y los **archivos reales**. El cerebro se desfasa; el código es la verdad.

## Mapa del vault
- [[GOBERNANZA]] — la ley del vault (reglas anti-conflicto, permisos, convenciones).
- [[INIT-AGENTS]] — prompts de arranque de los dos roles (Planner A / Dev B).
- [[README-como-usar]] — para humanos: cómo abrir y navegar en Obsidian.
- **Global:** [[00-global]] — patrones transversales, decisiones (ADR), riesgos.
- **Módulos:** [[00-modulos]] — un módulo por fila (tenancy, auth, users, products, inventory, sales, reports).
- **Conexiones:** [[00-conexiones]] — contratos entre módulos.
- **Planeación:** [[00-planeacion]] — backlog, sprints, épicas.
- **Sesiones:** carpeta `_sesiones/` — handoffs append-only.
- **Plantillas:** carpeta `99-plantillas/`.

## Semáforo
🟢 hecho · 🟡 en proceso · 🔴 pendiente · ⏸️ pospuesto · ❓ por confirmar

## Estado global (2026-08-09)
- Decisión raíz: [[ADR-G-20260802-tenancy-isolation]] — se mantiene filtrado manual; RLS es meta post-estabilización (sigue ⏸️, fuera del alcance cerrado).
- ✅ **Épica [[EPIC-20260802-estabilizacion]] CERRADA 2026-08-09.** Las 4 condiciones de [[CRITERIO-CIERRE-ESTABILIZACION]] se cumplieron. Handoff completo: [[2026-08-09-planner-cierre-estabilizacion]]. **A partir de acá, trabajo nuevo = features**, no hardening — si el owner no dice lo contrario, el próximo PASO 0 debería preguntar qué feature sigue, no seguir buscando bugs.
- Historial de sesiones de hardening (para contexto, ya cerrado): [[2026-08-05-planner-hardening-y-auditoria]] · [[auditoria-adversarial-20260805]] · [[2026-08-09-planner-review-promocion-rol]] · [[2026-08-09-planner-cierre-estabilizacion]].
- ✅ **Primera feature post-estabilización, cerrada 2026-08-09:** [[EPIC-20260809-superadmin-gestion-tenants]] — detalle de negocio (métricas + usuarios + reset password) reemplazando el módulo Usuarios de super-admin. Decisión de acceso: [[ADR-G-20260809-superadmin-acceso-tenant-scoped]] (endpoints dedicados, no impersonación). Backend 13/13 casos ✅ ([[RUN-20260809-endpoints-superadmin-tenant-scoped]]), front 9/9 casos ✅ ([[RUN-20260809-frontend-tenant-detail-page]]) — falta solo que el humano lo confirme a ojo en navegador (sin Chrome conectado en este entorno).
- ✅ **Segunda feature, cerrada 2026-08-10:** [[BACKEND-20260809-compresion-estandar-imagenes]] — comprimir/redimensionar toda imagen subida a Cloudinary (producto, categoría, logo), solo subidas nuevas. Decisión: [[ADR-G-20260809-compresion-estandar-cloudinary]]. 6/6 casos verificados con subidas reales ([[RUN-20260809-compresion-cloudinary]]) — el Dev encontró y arregló un bug real de caché/staleness al reemplazar una imagen, confirmado de forma independiente por el Planner.
- Handoff de ambas features (reconstruido retroactivamente en el PASO 0 del 2026-08-11, no se había escrito al cierre): [[2026-08-09-planner-features-tenant-detail-y-compresion]].
- ✅ **Tercera feature, cerrada 2026-08-11:** [[BACKEND-20260811-docs-swagger-api-key]] — docs Swagger/Redoc (`/docs/`, `/redoc/`, `/api/schema/`) gateadas por `DOCS_API_KEY`, pedida directo al Planner (sin prompt previo — desviación de protocolo reconocida en [[RUN-20260811-docs-swagger-key-gate]]). Decisión: [[ADR-G-20260811-docs-swagger-key-gate]]. 12/12+6/6 casos con servidor real; revisión adversarial (workflow) encontró y se arreglaron 3 hallazgos reales; 2 hallazgos preexistentes del repo (fallback inseguro de `manage.py`, falta HTTPS enforcement en prod) pasaron a backlog nuevo, no tocados.
- ✅ **Cuarta feature, cerrada 2026-08-12:** [[SUPERADMIN-20260812-logo-tenant-desde-panel]] — subir el logo de un tenant desde `TenantDetailPage.tsx`, pedida directo al Planner (con análisis/planeación primero, modo plan). Backend y hook del frontend ya existían — solo faltaba la pantalla. Decisión: [[ADR-TENANCY-20260812-logo-tenant-superadmin-ui]]. Verificado con servidor real: permiso 403/401, validación de archivo 400×3, upsert+versionado de Cloudinary; revisión adversarial (workflow) corrida. Ver [[RUN-20260812-logo-tenant-superadmin-ui]].
- ✅ **Quinta feature, cerrada 2026-08-12:** [[SUPERADMIN-20260812-logo-en-modales-crear-editar]] — el logo también desde los modales de **crear** y **editar** negocio, con subida **diferida** (se aplica al guardar; Cancelar descarta) y la opción de **quitarlo**, que necesitó un endpoint nuevo (`DELETE /api/tenants/{id}/logo/` + helper `destroy_image`). Pedida directo al Planner, con modo plan aprobado. Decisión: [[ADR-TENANCY-20260812-logo-tenant-modales-crear-editar]], que **supersede el punto 1** de la decisión anterior. 15/15 casos contra servidor real; la revisión adversarial (24 agentes) encontró **1 bug real propio** — `destroy_image` no atrapaba el `ValueError` que el SDK de Cloudinary levanta con credenciales vacías, así que el DELETE daba 500 y la fila del logo sobrevivía — arreglado y re-verificado. Ver [[RUN-20260812-logo-tenant-modales-crear-editar]].

## PASO 0 del 2026-08-30 — el owner commiteó TODO, y el cerebro se quedó tres pasadas atrás (lee esto primero)
- 🟢 **HEAD = `abee9d8`** ("deploy ready commit", 2026-08-27 23:29, **75 archivos, +10838/-165**),
  `main == origin/main`, **árbol de app limpio**, cero archivos sin trackear. Docker (08-26), el `.exe`
  (08-24) y la caja (08-27) **están versionados**. Entorno verde: `tsc --noEmit` exit 0 sin salida,
  `makemigrations --check` → *No changes detected*. Ningún prompt 🟡 en curso.
- 🔴 **Casi todo el índice de arriba estaba desactualizado, no desfasado: falso.** El bloque del 08-27
  dice que "3 de los 7 arreglos no cierran" y que "nada está commiteado". Las **dos** cosas eran ciertas
  a las 18:32 del 27 y dejaron de serlo esa misma noche: hubo una **tercera pasada** (20:14, cerró los
  arreglos 1 y 2) y una **cuarta** (22:10, cerró el 3 contra la térmica real del dueño). Verificado
  contra el código: `IdleScreensaver.tsx:58,221` · `pos.css:1984` · `main.js:143,175-182`.
- 🔴 **Ninguna de esas dos pasadas tiene handoff** ([[GOBERNANZA]] §7). El último archivo de `_sesiones/`
  es del 08-27 18:32; la tercera pasada quedó como anexo dentro del RUN y de la **cuarta**
  `grep -rn "cuarta pasada"` devuelve **una sola línea en todo el vault**. Tampoco tiene sección en el RUN.
- 🔴 **El arreglo del toque trajo una regresión peor que el bug que arregló.** La red de seguridad de 5 s
  quedó **inalcanzable** justo en el escenario para el que existe: `dedoAbajo` solo baja con el
  `pointerup` del mismo `pointerId` (`IdleScreensaver.tsx:182-183`), así que si ese evento no llega,
  `vencer` se re-agenda infinito (`:207-213`) y el tragador de clicks (`:220`) **deja toda la caja sin
  responder hasta recargar la página**. El banco de pruebas da 8/8 porque **sus 8 casos siempre sueltan
  el dedo**; con 3 casos agregados sale 1/4. Ficha: [[POS-20260830-tragador-reposo-puede-trabar-la-caja]].
- 🔴 **Hay un CUARTO trabajo dentro del commit que el cerebro no tiene en ningún lado: un deploy a
  Azure con TLS.** `base.py:70-77` (`DB_SSLMODE`, *"Azure Database for PostgreSQL EXIGE TLS"*),
  `production.py:11-43` (bloque HTTPS entero) y `.env.example:74-89`. `grep -rn "Azure|sslmode"` sobre
  el vault → **0 hits**. Incluye una **decisión de topología sin ADR** (TLS termina en el borde, Caddy,
  que habla HTTP a nginx). Ficha: [[INFRA-20260830-deploy-azure-sin-registro]].
- ⚖️ **Ese bloque cierra a medias un ítem que el backlog daba por abierto.**
  [[BACKEND-20260811-falta-https-enforcement-produccion]] pasa de 🔴 a **🟡**: todo lo que pedía existe,
  pero adentro de un `if SECURE_SSL:` apagado por defecto (`production.py:21`) que
  `docker-compose.prod.yml:44` fija en `0`. De *"no existe"* a *"hay un botón correcto y está en off"*.
- 🔴 **Un 500 nuevo en el endpoint más expuesto**, salido de atacar el relevamiento de
  [[BACKEND-20260805-residuos-del-triaje]] (que se hizo con `grep query_params.get` y por eso lo perdió):
  `POST /api/auth/login/` es público y `AllowAny`, y `apps/users/serializers.py:72` lee `tenant_id`
  **crudo** → un no-UUID revienta en **500 HTML**. El hermano `CashierLoginSerializer:162` lo declara
  bien con `UUIDField`. Ficha: [[BACKEND-20260830-login-publico-500-tenant-id-no-uuid]].
- ⚠️ **`vite.config.js` entró al commit y no es basura inerte: GANA sobre el `.ts`.**
  `vite/dist/node/constants.js:33-40` pone el `.js` primero en `DEFAULT_CONFIG_FILES`. Desde hoy, editar
  `vite.config.ts` es invisible para `npm run dev` hasta el próximo `npm run build`. Armado, no
  disparado (los dos archivos coinciden). Ficha: [[FRONT-20260830-vite-config-js-pisa-al-ts]].
- 📐 **Toda ancla a un `CLAUDE.md` anterior al 08-27 está corrida** (+48 raíz / +23 back / +69 front).
  De las 14 mentiras de [[DOCS-20260813-claudemd-drift-post-features]], **11 siguen y 3 se cayeron**
  (las de recibos/credenciales, corregidas de rebote por el run de la caja) — y se suman **2 puntos
  nuevos**, los dos nacidos del propio commit.
- 🟢 **Lo que sigue igual:** [[BACKEND-20260813-docstring-tenancy-miente-aislamiento]] intacto
  (`abee9d8` **no tocó ni un archivo** bajo `el_vuelto_backend/apps/`), con un dato nuevo que la ficha no
  tenía: de **11 vistas tenant-scoped, `CategoryViewSet` es la única** que recibe el filtro automático —
  `ProductViewSet` pisa `get_queryset()`. "Impossible at the API layer" describe **1 de 11**.
- 🧹 **El `.venv` ahora está desalineado en las dos direcciones:** le sobra `python-escpos 3.1` (con
  Pillow colgando de él) y le **falta** `gunicorn`, que `requirements.txt:11` declara desde este commit.
- ⚠️ **Entorno frío hoy:** Docker daemon caído y Postgres no responde en `5432`. Cualquier prueba contra
  servidor real hay que levantarla primero.
- Detalle: [[2026-08-30-planner-paso0-resync]].

## 2026-08-27 — la caja, rediseñada para el cajero real (lee esto primero)
- 🟢 **Cinco tareas en una noche**, pedido directo del owner con una ronda de preguntas y ejecución
  autónoma: POS usable en **1366×768**, `.exe` en **pantalla completa**, **modo reposo** con
  salvapantallas, **recibo térmico legible** y **vaciar el carrito con confirmación**. Decisión:
  [[ADR-POS-20260827-caja-para-adulto-mayor-en-1366x768]] · corrida:
  [[RUN-20260827-caja-adulto-mayor-y-recibo]] · ficha: [[POS-20260827-caja-1366x768-y-reposo]].
- 🎯 **Las cinco tareas son una sola.** Al responder las preguntas el owner agregó el criterio que las
  ordena: la caja la manejan **adultos mayores** sobre una pantalla táctil. Eso explica por qué venía
  fallando — está construida con la densidad de una app de escritorio para alguien con mouse.
- 🔴 **Lo que estaba roto no era estético.** El modal donde se digita el efectivo medía **~871px de
  alto sin `max-height` ni scroll**, y el backdrop lo centra: se recortaban ~50px arriba y ~50px abajo.
  **Abajo vive el botón Confirmar** — el cajero no podía verlo ni alcanzarlo. Y el botón que **borraba
  la venta entera** medía 24px, sin fondo y sin confirmación. Las tres media queries que existían eran
  todas de **ancho**; el problema siempre fue el **alto**.
- ⚖️ **El workflow de mapeo previo se pagó solo:** halló 3 defectos que la lectura directa no vio (el
  carrito vacío empujando el pago fuera, el numpad flotante abriéndose fuera de pantalla, el reposo a
  punto de tapar el aviso de stock negativo) **y corrigió un cálculo mío que hacía desaparecer el
  precio de las tarjetas**.
- 🔴 **La revisión adversarial (7 lentes, 61 hallazgos, 3 escépticos cada uno) encontró cosas peores en
  mi propio trabajo de la noche**: el toque que despierta se colaba y **agregaba un producto al
  carrito**; mi anti-escaneo solo se tragaba la primera tecla de trece; `restaurarFullscreen` era una
  variable muerta; `transform: scale()` no recuperaba un píxel de alto; el modal de **cada venta**
  quedó fuera del pase de altura; y **mi propia afirmación en el `CLAUDE.md` era falsa** (lo probé:
  `tsc` sale 0).
- ⛔ **CORREGIDO EL 2026-08-27 (sesión siguiente): la línea de arriba decía "Todo corregido" y era
  falso.** ⚠️ **Y este bloque, a su vez, quedó falso esa misma noche — ver la sección del 2026-08-30:
  los 3 SÍ se cerraron en la tercera y cuarta pasada.** La madrugada se quedó sin tokens antes de anexar el resultado al RUN, y ese "todo
  corregido" se escribió sin verificar. Al re-verificar contra el código real (7 verificadores + 1
  escéptico cada uno), **4 de los 7 arreglos aguantan y 3 no**: el toque que despierta **todavía agrega
  el producto** (los 400 ms se cuentan desde el `pointerdown`, no desde el `pointerup`, y por Pointer
  Events L3 el `preventDefault()` no suprime el `click`); en el `SuccessModal` la barra sticky sujeta
  solo los dos botones **secundarios** y **"Nueva Venta" sigue cayendo bajo el fold**; y el arreglo del
  rollo **mide el viewport, no el recibo** (piso constante de 154,3 mm — el ahorro es ≈28,5 m/día, no
  los ~34 m que escribí). Ficha: [[POS-20260827-tres-arreglos-a-medias]]. Detalle con anclas: la
  sección "Resultado" del [[RUN-20260827-caja-adulto-mayor-y-recibo]].
- 🧠 **Y una lección sobre el propio cerebro:** el "antes roto" de 5 de los 7 hallazgos **no es
  verificable en git** — `el_vuelto_desktop/` está sin trackear, `IdleScreensaver.tsx` es archivo nuevo
  y los bloques `@media (max-height: …)` no existen en ningún commit. Eran iteraciones **dentro** de la
  misma sesión, no defectos que hayan vivido en el repo. Un comentario del autor no es evidencia.
- 🖨️ **Un hallazgo que ahorra plata:** la opción "Forzar 80 mm" del wrapper fijaba la página en
  **297 mm** — casi 30 cm de rollo por recibo. Ahora se mide el alto real: **~34 metros de papel al día**
  en un negocio de 200 ventas.
- 📄 **Dos afirmaciones falsas de [[DOCS-20260813-claudemd-drift-post-features]] quedaron corregidas**
  de paso (el `generateReceipt.ts` que "usa jsPDF" y el `downloadCredentials.ts` que "exporta `.txt`").
- ⚠️ **Nada se pudo ver en pantalla** — sin navegador en el entorno. Para el recibo quedó
  `temp/recibo-antes-y-despues.html` (se abre y va a la térmica con Ctrl+P); para el resto **falta el
  ojo del owner**. ~~Y **nada está commiteado**.~~ → **el owner commiteó todo el 08-27 23:29 (`abee9d8`)**.
- Detalle: [[2026-08-27-planner-cierre-run-caja]] (cierre y re-verificación) · la madrugada quedó
  anexada en [[2026-08-26-planner-paso0-resync]].

## 2026-08-26 (tarde) — el stack corre en Docker (lee esto primero)
- 🟢 **Front + back + nginx en contenedores**, arrancables con `./scripts/manage-docker.sh up dev`.
  Pedido directo del owner, con Discovery y decisiones aprobadas antes de tocar código. Decisión:
  [[ADR-INFRA-20260826-docker-nginx-mismo-origen]] · corrida: [[RUN-20260826-dockerizacion-stack]] ·
  ficha: [[INFRA-20260826-dockerizacion-stack]].
- 🎯 **Lo que decidió la arquitectura fue el MISMO ORIGEN.** `apiBase.ts` ahora llama al API en la ruta
  relativa `/api`; nginx sirve el SPA y Django bajo un solo puerto. Sin eso, `localhost:8000` horneado
  en el bundle significa *el celular* cuando lo abre el celular.
- ⚖️ **El pedido de puertos del owner no cuadraba y se concilió sin negociárselo.** Pidió front en
  `:5173` y back en `:8000`, mismo número adentro y afuera — que literalmente son **dos orígenes**.
  Solución: **nginx escucha en los dos**. `:5173` = la app completa en un origen · `:8000` = passthrough
  al backend. **Solo nginx publica puertos.**
- 🔴 **Sin servicio `db`, por decisión del owner.** El Postgres es de OTRO proyecto suyo
  (`naia-postgres`) y tiene la base `elvuelto` viva adentro; el backend la alcanza por
  `host.docker.internal`. Para prod se cambia `DB_HOST` y nada más.
- ⚠️ **La trampa que más caro se paga:** `proxy_set_header Host $http_host`, **nunca `$host`** — `$host`
  descarta el puerto, `get_host()` deja de coincidir con el `Origin` y **todo POST desde la LAN muere en
  403 CSRF** sin que ninguna entrada de `CSRF_TRUSTED_ORIGINS` pueda arreglarlo. (`CSRF_TRUSTED_ORIGINS`
  tampoco existía en el repo: se creó acá.)
- 🔴 **Revisión propia → 3 defectos, 3 arreglados.** El healthcheck no podía pasar nunca (opciones de
  GNU `wget` contra busybox + `localhost` resolviendo a `::1` con nginx en IPv4); `build prod` iba a
  **pisar las imágenes de dev** (`TAG=dev` en `.env` ganaba en los dos entornos); y el `.gitignore`
  ignoraba `package-lock.json`, así que **`npm ci` no corría en un clon nuevo**.
- 🔴 **Desviación de protocolo anotada:** [[GOBERNANZA]] §10.2 pide revisión adversarial y **no se
  corrió**. El setup toca CSRF y validación de hosts, así que no es inocua.
- ⚠️ **Falta el ojo del owner en el celular** (se probó con `curl` desde `192.168.1.75`: 200 en todo,
  WebSocket del HMR 101). ~~Falta el commit~~ → **commiteado en `abee9d8`**.

## PASO 0 del 2026-08-26 — lee esto primero
- 🟢 **Código quieto, entorno verde.** HEAD = **`eacaae0`** y **`main` == `origin/main`**.
  `makemigrations --check` → *No changes detected* (exit 0); `tsc --noEmit` → exit 0, cero salida.
  **Ningún prompt 🟡 en curso** en los 7 registros. La app web no se toca desde el **2026-08-16 17:50**.
- ~~🔴 **El árbol de app YA NO está limpio: la beta del `.exe` lleva dos días sin commitear.**~~ **RESUELTO** — Cinco
  entradas sucias — `el_vuelto_desktop/` (15 archivos que sí entrarían al commit), `printReceipt.ts`,
  los dos `CLAUDE.md` y `.gitignore`. Commitear es del owner ([[GOBERNANZA]] §0).
- 🔴 **Los 5 ítems de peso siguen abiertos**, verificados hoy contra código y **sin una sola ancla
  corrida** (`viewsets.py:19-21`, front `CLAUDE.md:330-331`, `manage.py:8`, `production.py` con **0**
  hits de `SECURE_*`, `sales/views.py:43,52`, `products/models.py:87`). **Ningún ítem nuevo** — no se
  salió a buscar.
- ⚖️ **El arreglo del `.gitignore` del 08-24 se auditó y aguanta:** `git check-ignore` archivo por
  archivo confirma que `tools/elvuelto.ico` y `tools/patch-exe.js` **sí** entran al commit; lo único
  ignorado es lo que debe estarlo (`dist/`, `node_modules/`, `app/config.json`, `urls.json`).
- 🧩 **Observación sin ficha:** `.gitignore:16` ignora `package-lock.json` en todo el repo, así que el
  generador del `.exe` no es reproducible al 100% en un clon nuevo — `electron` está clavado en
  `44.0.0`, pero `@electron/packager` y `resedit` flotan con `^`. Decisión del owner si amerita excepción.
- ~~❓ **Un cambio de repo sin dueño:** `.gitignore` tiene `+temp.md` sin commitear~~ — cerrado el
  2026-08-30: entró en `abee9d8`, y eran **dos** líneas (`.gitignore:78 temp.md` y `:79 temp/`), no una.
- 🎯 **Lo primero que corresponde no es código:** correr `ElVuelto-<slug>.exe` en Windows contra la
  térmica. La fase 2 no arranca antes. Siguen esperando el ojo del owner las tres features del
  08-15/08-16 (once días).
- Detalle: [[2026-08-26-planner-paso0-resync]].

## 2026-08-24 — beta manual del `.exe` de caja (lee esto primero)
- 🟡 **Fase 1 de [[DESKTOP-20260821-app-escritorio-cajero-exe]] IMPLEMENTADA**, como pedido directo del
  owner: `el_vuelto_desktop/` con `build.py` (pregunta Test/Prod → IP → tenant → `.exe`), wrapper
  Electron, puente de impresión silenciosa y **selector de impresora en el primer arranque**. Decisión:
  [[ADR-DESKTOP-20260824-wrapper-electron-y-generador-manual]] · corrida:
  [[RUN-20260824-beta-manual-exe-caja]].
- ⚖️ **Se cayó un supuesto de la ficha:** decía que desde macOS *"no se genera un `.exe` confiable"* y
  que hacía falta CI en Windows. **Falso** — `@electron/packager` + **`resedit`** (JS puro) produjeron un
  `PE32+ executable (GUI) x86-64` real, con ícono y metadatos, **sin wine**. Lo que exigía wine era
  `rcedit`. El CI servirá para **firmar**, no para producir.
- 🎯 **Windows y nada más:** el owner descartó explícitamente probar en Mac y pidió que **Test no asuma
  `localhost`** — la IP del servidor (que monta en una máquina Linux de su red) la provee quien corre el
  comando. Ambas cosas están implementadas y verificadas.
- ⚠️ **Lo que NO se probó: la impresión.** Este Mac no tiene impresoras (`lpstat -p` → *No destinations
  added*). Que el recibo salga en la térmica sin diálogo lo valida el owner en Windows. Traza para
  diagnosticar: `set ELVUELTO_DEBUG=1 && ElVuelto-<slug>.exe`.
- 🔴 **Revisión adversarial propia → 5 hallazgos reales, 5 arreglados.** Los dos peores: la pantalla
  de impresoras leía `isDefault`/`status`, campos que **no existen** en `PrinterInfo` de Electron 44 (el
  botón Guardar quedaba deshabilitado); y el `.gitignore` raíz (`build/`) se tragaba el ícono y el
  parcheador del `.exe`, así que en un clon nuevo el generador se rompía.

## PASO 0 del 2026-08-24 — nada se movió
- 🟢 **Estado congelado y sano.** HEAD = **`eacaae0`** y **`main` == `origin/main`** (el commit está
  **pusheado**, no solo local). Árbol de app **limpio**. Último archivo de app tocado: **2026-08-16
  17:50** — ocho días de silencio en el código; el cerebro, tres días.
- 🟢 **Entorno verde:** `makemigrations --check` → *No changes detected* (exit 0); `tsc --noEmit` → exit
  0, cero salida. **Ningún prompt 🟡 en curso** en los 7 registros.
- 🔴 **Los 5 ítems de peso siguen abiertos**, verificados hoy contra código — y esta vez **sin una sola
  ancla corrida**, porque el código no se tocó (`viewsets.py:20-21`, front `CLAUDE.md:330-331`,
  `manage.py:8`, `production.py` con **0** hits de `SECURE_*`, `sales/views.py:43,52`,
  `products/models.py:87`). **No se abrió ningún ítem nuevo** — no se salió a buscar.
- ⚖️ **La corrección del 08-21 se auditó a sí misma y es cierta:** [[patron-impresion-recibos]] ahora
  acierta (`generateReceipt.ts` sin un solo hit de jspdf; `downloadCredentials.ts:1,130,239` sí arma el
  PDF). También confirmadas las anclas de la app de escritorio: `printReceipt.ts:13` (`win.print()`) y
  `UsersPage.tsx:235` (`ta-url-card`).
- 📐 **Un dato de la nota del 08-21 quedó corregido:** decía que el cerebro tenía sin commitear lo del
  08-13/08-15/08-20 — `eacaae0` se llevó el cerebro **completo** hasta el 08-20 (61 archivos). Sin
  commitear hoy: **solo los 5 archivos del 08-21**.
- 🟡 **Sigue pendiente lo mismo:** la fase 1 de [[DESKTOP-20260821-app-escritorio-cajero-exe]] (nada
  implementado) y la **confirmación visual del owner** de las tres features del 08-15/08-16, que ya
  arrastra nueve días.
- Detalle: [[2026-08-24-planner-paso0-resync]].

## 2026-08-21 — commit hecho + feature evaluada (histórico; sigue vigente)
- 🟢 **El owner commiteó.** HEAD real = **`eacaae0`** ("feat(pos): stock negativo, teclado numérico del
  cajero y pegar logo con ⌘V", 2026-08-20 20:43). La migración `products/0004_alter_product_stock_actual`
  **ya está en git** y el árbol quedó **limpio fuera del cerebro**. Todo el bloque de riesgo que abría el
  PASO 0 del 08-20 (8 días sin commit, migración solo local) **está resuelto**.
- 🔴 **Feature nueva evaluada, no arrancada:** [[DESKTOP-20260821-app-escritorio-cajero-exe]] — app de
  escritorio descargable desde el dashboard del tenant admin que abre `/login/<slug>` del negocio. El
  owner pidió dejarla documentada porque **la va a hacer "sí o sí"**. Factibilidad ✅, con la trampa de
  que **no se genera un `.exe` por tenant en el servidor** y que lo caro no es el código (firma,
  hosting, CI en Windows). Propuesta técnica: **Electron** — la PWA queda descartada por la impresión
  silenciosa. Fase 1 (wrapper + puente de impresión, validable en Mac) **no depende del deploy**.
- ⚖️ **El cerebro repetía una mentira que él mismo denuncia:** [[patron-impresion-recibos]] decía que
  `generateReceipt.ts` genera PDF con jsPDF y que `downloadCredentials.ts` exporta `.txt` — los dos
  archivos descritos **al revés**, exactamente los puntos 2 y 3 de
  [[DOCS-20260813-claudemd-drift-post-features]]. Escrito así desde el 2026-08-02. **Corregido hoy** y
  re-anclado contra `eacaae0`. Salió de evaluar la feature de escritorio, no de buscar.
- Detalle: [[2026-08-20-planner-paso0-resync]] (sección del 08-21).

## PASO 0 del 2026-08-20 — histórico (el bloque del commit pendiente YA se resolvió; lo demás sigue vigente)
- 🔴 **El árbol de app YA NO está limpio, y la nota anterior dice que sí.** HEAD sigue en `9727c03`
  (2026-08-12) — **ocho días sin commit** — con **19 archivos de app modificados + 3 sin trackear**: las
  features 6, 7 y 8 (pegar logo ⌘V, teclado numérico, stock negativo) más la doble actualización de los
  dos `CLAUDE.md`. La sección "por dónde retomar" de [[2026-08-15-planner-paso0-resync]] se escribió
  **antes** de esas features; su "árbol de app limpio" quedó falso el mismo día.
- ⚠️ **Lo más riesgoso: `products/migrations/0004_alter_product_stock_actual.py` está APLICADA en la BD
  local pero NO está en git.** El cambio de regla de [[ADR-SALES-20260816-stock-negativo-permitido]]
  (`stock_actual` sin piso) vive solo en esta máquina. Otro clon del repo tiene el código nuevo con el
  `PositiveIntegerField` viejo. **Commitear es acción del owner** ([[GOBERNANZA]] §0).
- 🟢 **Entorno verde igual:** `makemigrations --check` → *No changes detected*; `tsc --noEmit` → exit 0;
  ningún prompt 🟡 en curso en los 7 registros. Nada tocado desde el 2026-08-16 17:50 (4 días).
- 🔴 **Los 5 ítems de peso siguen abiertos**, verificados hoy contra código (no heredados de la nota).
- 📐 **7 anclas de línea corregidas** — y esta vez sí se habían corrido: las features del 08-16 crecieron
  `el_vuelto_frontend/CLAUDE.md` +42 líneas y `el_vuelto_backend/CLAUDE.md` +9, y tocaron
  `sales/views.py` y `products/models.py`. [[DOCS-20260813-claudemd-drift-post-features]] (front
  `:292→:330`, `:293→:331`, `:145→:172`, `:135→:162`; back `:573-586→:578-592`) y
  [[BACKEND-20260805-residuos-del-triaje]] (`sales/views.py:42,51→:43,52`, `products/models.py:78→:87`)
  ya están al día. Las mentiras del `CLAUDE.md` **raíz** no se movieron: ese archivo no se tocó.
- 🟡 **Tres features 🟢 siguen esperando el ojo del owner** (pegar logo, teclado numérico, stock
  negativo): ninguna se pudo confirmar en navegador desde este entorno. Es la deuda más barata del tablero.
- Detalle completo: [[2026-08-20-planner-paso0-resync]].

## PASO 0 del 2026-08-15 — histórico (superado por el de arriba; sus hallazgos siguen vigentes)
- 🟢 **Nada se movió en el código.** HEAD sigue en `9727c03`; **cero** archivos de app modificados desde
  ese commit; `makemigrations --check` → *No changes detected*; `npm run typecheck` → exit 0. Los 15
  archivos sucios del árbol son **todos del cerebro** (el PASO 0 del 08-13 sin commitear + lo de hoy).
- 🔴 **Los 5 ítems de peso siguen abiertos**, re-verificados contra código real (6 verificadores + 1
  crítico, 137 tool calls) — y esta vez **sin una sola línea corrida**, porque el código no se tocó.
- ⚖️ **Contradicción resuelta:** [[BACKEND-20260813-docstring-tenancy-miente-aislamiento]] y
  [[DOCS-20260813-claudemd-drift-post-features]] **se fusionan en un solo bloque** ("la doc miente"),
  severidad **alta**. No se puede usar "el `CLAUDE.md` dice la verdad" como mitigación del docstring
  cuando el otro ítem prueba que ese archivo miente en renglones contiguos (`:49` verdadera vs `:51`
  falsa).
- 🔓 **[[GLOBAL-20260802-migracion-rls-postgres]] ya no está bloqueado:** su prerrequisito ("épica de
  estabilización cerrada") se cumplió el 2026-08-09 y el índice arrastró ⏸️ 6 días. Hoy es decisión del
  owner, no un bloqueo — y es el arreglo estructural del ítem del docstring.
- 🔴 **Un ítem nuevo**, salido de verificar otro (no de buscar):
  [[BACKEND-20260815-docs-login-key-en-traceback-debug]] (baja).
- 🧹 **El `.venv` está sucio** (`python-escpos` sigue instalado aunque salió de `requirements.txt` en
  `a15f6cc`; `Pillow` declarado pero muerto) — eso volvió falsas dos líneas de [[INIT-AGENTS]], ya
  corregidas.
- Detalle completo: [[2026-08-15-planner-paso0-resync]].
- ✅ **Octava feature, cerrada 2026-08-16 — y es un CAMBIO DE REGLA DE NEGOCIO, no una pantalla:** [[SALES-20260816-stock-negativo-permitido]] — **una venta ya no se rechaza por falta de stock**; el stock queda negativo y eso *es* la deuda de una ENTRADA pendiente. Decisión: [[ADR-SALES-20260816-stock-negativo-permitido]]. Arrastró tres cosas que no se ven en el pedido: el guard de inventario tuvo que volverse **direccional** (si no, una entrada parcial sobre stock negativo quedaba rechazada y no había salida del hueco), `stock_actual` perdió su piso pero pasó a **read-only con `update_fields`** (cerrando un *lost update* que un PATCH concurrente sí podía provocar), y el desborde de `Sale.total` pasó de 500 a 400. **Dos** rondas adversariales (45 agentes) → 19 hallazgos y **2 arreglos míos que estaban mal**. ⚠️ Falta confirmación visual del owner. Ver [[RUN-20260816-stock-negativo-permitido]].
- ✅ **Séptima feature, cerrada 2026-08-16:** [[AUTH-20260816-teclado-numerico-staff-login]] — **teclado numérico en pantalla** para el login del cajero (`/login/<slug>`), que corre en un POS táctil. Pedida directo al Planner, con modo plan. Decisión: [[ADR-AUTH-20260816-teclado-numerico-staff-login]]. **Dos** rondas adversariales (39 agentes): la 1ª encontró 15 hallazgos reales, y la 2ª —apuntada a los arreglos— cazó **2 regresiones que introdujeron mis propios arreglos** (tocar el `<label>` dejaba el campo sin ningún teclado; el flag de "teclado físico" era un latch que un lector de códigos de barras HID trababa para siempre). ⚠️ **El gesto táctil no se pudo ejecutar** (sin navegador): falta que el owner lo confirme a ojo. Ver [[RUN-20260816-teclado-numerico-staff-login]].
- ✅ **Sexta feature, cerrada 2026-08-15 (después del PASO 0):** [[SUPERADMIN-20260815-pegar-logo-portapapeles]] — pegar el logo con **⌘V / Ctrl+V** en los modales de crear y editar negocio, además del upload. Pedida directo al Planner, con modo plan. Decisión: [[ADR-TENANCY-20260815-pegar-logo-portapapeles]]. El repo ya tenía el gesto en `ProductsPage` y **copiarlo habría sido el error** (su `onPaste` en el `<form>` no dispara sin foco previo, y no valida) — los dos huecos quedaron en backlog. Revisión adversarial de 19 agentes → 3 sobrevivientes con una sola raíz → 1 arreglo propio. ⚠️ **El ⌘V real no se pudo ejecutar** (sin navegador en el entorno): falta que el owner lo confirme a ojo. Ver [[RUN-20260815-pegar-logo-portapapeles]].

## PASO 0 del 2026-08-13 — histórico (superado por el de arriba, sigue siendo cierto en lo suyo)
- 🟢 **El owner commiteó todo.** HEAD real = `9727c03` ("feat(tenants): added tenant logo management…",
  2026-08-12 22:21), working tree **limpio**, 69 archivos, las 5 features post-estabilización + el
  cerebro entero adentro. Las notas de sesión del 08-12 decían "HEAD sigue en `a15f6cc`, 5 features sin
  commitear" — eso ya es historia, no estado. Sin migraciones pendientes (`makemigrations --check` → *No
  changes detected*).
- 🔴 **Backlog: 12/12 ítems abiertos siguen abiertos**, re-verificados uno por uno contra el código real
  (no contra la nota). Ninguno se resolvió solo. Ver [[2026-08-13-planner-paso0-resync]].
- 🔴 **Dos ítems nuevos**, de la verificación misma:
  [[BACKEND-20260813-docstring-tenancy-miente-aislamiento]] (alta — la mentira del aislamiento
  automático reapareció en un docstring de `viewsets.py`, el peor lugar posible) y
  [[DOCS-20260813-claudemd-drift-post-features]] (media — 14 afirmaciones falsas en los 3 `CLAUDE.md`).
- ✅ La quinta feature (logo en modales) se re-verificó contra el código: **5/5 puntos confirmados**,
  sin divergencias.

> [!warning] Regla de review — primero `mtime`, después el código
> El registro de prompts y el disco se desfasan seguido en este proyecto. Al 2026-08-04 van **2 corridas vacías** ("dev finished" con 0 archivos tocados: DOCS-drift el 08-03, hardening-params el 08-04) y **4 corridas sin reporte del Dev** (todas ✅, pero verificadas por el Planner).
> **Antes de leer una línea de código en un review, corré `find <dirs> -newermt '-30 minutes'` o `stat` sobre los archivos que la tarea debía tocar.** Detecta la corrida vacía en segundos y evita un review fantasma. Detalle en [[RUN-20260804-hardening-params-CORRIDA-VACIA]].
