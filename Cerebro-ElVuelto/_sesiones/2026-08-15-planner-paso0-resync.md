---
tags: [sesion, planner, paso0, resync]
status: activo
updated: 2026-08-15
---

# Sesión 2026-08-15 — planner — PASO 0 en frío

Arranque nuevo del Planner con [[INIT-AGENTS]]. Esta nota cubre el PASO 0; lo que se haga después se
agrega abajo.

## Qué se leyó
[[00-INDEX]] + [[GOBERNANZA]] + [[estado-tenancy]] + la última nota de sesión
([[2026-08-13-planner-paso0-resync]]) + [[00-planeacion]] + [[00-global]] + [[00-modulos]] + los 7
`00-registro-<mod>`.

## Método — no se confió en la nota del 08-13
La nota anterior cierra diciendo *"el backlog está verificado al 2026-08-13: se puede confiar en los
estados 🔴 sin re-verificarlos"*. Se tomó como hipótesis, no como hecho. Se corrió un workflow de **6
verificadores de solo lectura + 1 crítico de completitud** (137 tool calls contra código real) sobre los
5 ítems de más peso + el entorno. Resultado: la nota aguanta, pero con matices que sí cambian cosas.

## Hallazgo 1 — nada se movió en el código desde el 08-12
- HEAD sigue en **`9727c03`** (2026-08-12 22:21:10). `main` al día con `origin/main`.
- **Cero archivos de app** modificados después de ese commit (`find -newermt` + `git status` filtrado):
  los 15 archivos sucios del árbol son **todos del cerebro**, las ediciones del PASO 0 del 08-13 que el
  owner todavía no commiteó.
- `makemigrations --check --dry-run` → *No changes detected* (exit 0). Ninguna migración nueva.
- `npm run typecheck` → **exit 0, cero errores**.
- Ningún prompt 🟡 en curso en los 7 registros.

## Hallazgo 2 — los 5 ítems de peso siguen abiertos, con referencias exactas
Verificados uno por uno contra el código de hoy (no contra la nota):

| ítem | estado | anclas de la nota |
|---|---|---|
| [[BACKEND-20260813-docstring-tenancy-miente-aislamiento]] | 🔴 SIGUE-ABIERTO | exactas (`viewsets.py:20-21`, `products/views.py:57-60`, `:18`, `:53`) |
| [[DOCS-20260813-claudemd-drift-post-features]] | 🔴 SIGUE-ABIERTO | exactas (5/5 de las más peligrosas re-confirmadas) |
| [[BACKEND-20260811-manage-py-settings-fallback-inseguro]] | 🔴 SIGUE-ABIERTO | exactas (`manage.py:8`, `wsgi.py:5`) |
| [[BACKEND-20260811-falta-https-enforcement-produccion]] | 🔴 SIGUE-ABIERTO | exactas (`docs_views.py:114,115,129`) |
| [[BACKEND-20260805-residuos-del-triaje]] | 🔴 SIGUE-ABIERTO (4/4) | exactas, sin corrimiento |

Ninguna línea corrida esta vez — el código no se tocó, así que el cerebro no se desfasó. Los 7 ítems
🔴 de prioridad baja **no** se re-verificaron a propósito: hacerlo es exactamente el "seguir buscando
trabajo" que el owner pidió no hacer ([[elvuelto-cierre-estabilizacion]]).

Dos cosas se pudieron **subir de nivel de evidencia**:
- `manage.py` ya no es análisis estático: se **reprodujo en proceso** con `env -u
  DJANGO_SETTINGS_MODULE` → `DEBUG=True`, `ALLOWED_HOSTS=['*']`. Y se confirmó leyendo
  `decouple.py:86-87` que `python-decouple` **solo lee** `os.environ`, nunca lo escribe: la línea
  `DJANGO_SETTINGS_MODULE=...` del `.env` es **inerte** frente al `setdefault`.
- HTTPS ya no es solo un `grep`: `manage.py check --deploy` con `settings.production` dispara **W004,
  W008, W012, W016** — los cuatro warnings de HTTPS que Django tiene, los cuatro.

## Hallazgo 3 — la contradicción de severidad, resuelta
El verificador del docstring propuso **bajar** de alta a media *"porque los `CLAUDE.md` que un agente lee
primero sí dicen la verdad"*. El verificador de `CLAUDE.md` propuso **subir** de media a alta probando 14
mentiras en esos mismos archivos. El crítico lo cazó: `CLAUDE.md:49` (verdadera, tenancy) y `:51` (falsa,
recibos) están **a dos renglones**; `:92` (falsa) y `:93` (verdadera) son adyacentes.

**Veredicto del Planner:** el argumento del downgrade es circular — no se puede usar "el `CLAUDE.md` es
confiable" como red de seguridad cuando el ítem vecino prueba que ese mismo archivo miente en renglones
contiguos. Los dos ítems **se fusionan en un solo bloque de trabajo** (*"la doc miente"*), severidad
**alta**, y se resuelven juntos. Registrado en [[00-planeacion]].

## Hallazgo 4 — el bloqueo de RLS caducó hace 6 días y nadie lo movió
[[GLOBAL-20260802-migracion-rls-postgres]] sigue en ⏸️ con el prerrequisito literal *"Que la épica de
estabilización esté cerrada. NO empezar antes"*. **Se cerró el 2026-08-09.** El índice arrastra un
estado que dejó de ser cierto. No significa que haya que tomarlo — significa que hoy es una **decisión
del owner**, no un bloqueo. Y no es cualquier ítem: RLS es el arreglo estructural del ítem del
docstring — convierte en verdad lo que hoy la doc miente. Sincerado en la nota y en [[00-planeacion]].

## Hallazgo 5 — el `.venv` local está sucio y el cerebro miente sobre el stack
- `python-escpos==3.1` **se borró de `requirements.txt` en el commit `a15f6cc`** pero **sigue instalado**
  en el `.venv`, arrastrando `python-barcode 0.16.1`, `qrcode 8.2`, `appdirs`, `argcomplete`,
  `importlib_resources` y `setuptools`. Se removió de la declaración; nunca se corrió el `pip uninstall`.
- `Pillow==11.1.0` sigue **declarado** en `requirements.txt:6` pero no se importa en ningún `.py`, no hay
  un solo `ImageField`/`FileField` en el backend, y `cloudinary` **no lo requiere** (`Requires: certifi,
  six, urllib3`). Su único `Required-by` en el venv es el escpos ya retirado. Dependencia declarada
  muerta.
- Eso vuelve **falsas dos líneas de [[INIT-AGENTS]]** (`:109-110`): "python-escpos figura en requirements"
  (ya no) y Pillow listado como stack en uso (está muerto). **Corregidas hoy** — el bloque STACK
  INMUTABLE tampoco listaba `drf-spectacular` ni `drf-spectacular-sidecar`, que sí están.
- `pip check` → *No broken requirements found*. Es higiene, no rompe nada.

## Hallazgo 6 — import muerto que refuerza justo la mentira del docstring
`apps/inventory/views.py:9` **importa `TenantModelViewSet` y nunca lo usa** (`InventoryMovementViewSet`,
`:17`, hereda `mixins` + `GenericViewSet` y filtra a mano). Quien grepee el símbolo va a ver 3 archivos y
creer que inventory está cubierto por el filtro automático — exactamente la lectura errónea que el
docstring induce. Agregado como evidencia a
[[BACKEND-20260813-docstring-tenancy-miente-aislamiento]].

## Hallazgo 7 — un ítem nuevo, salido de verificar otro (no de buscar)
🔴 **baja** · [[BACKEND-20260815-docs-login-key-en-traceback-debug]] — `DocsLoginView.post`
(`elvuelto/docs_views.py:113-117`) lee la `DOCS_API_KEY` de `request.POST` **sin
`@sensitive_post_parameters`**. Django solo censura parámetros POST cuando ese decorador está presente,
así que con `DEBUG=True` una excepción durante ese POST volcaría la key en claro en la página de error.
Encadena con [[BACKEND-20260811-manage-py-settings-fallback-inseguro]] (que es lo que puede dejar
`DEBUG=True` donde no debe). **No se salió a buscar esto** — apareció verificando el ítem de `manage.py`.

## Correcciones de metadata hechas hoy
- [[DOCS-20260813-claudemd-drift-post-features]]: el título decía **13** afirmaciones; la nota numera y
  el criterio de aceptación exige **14**. Corregido — el Dev debe corregir 14.
- [[BACKEND-20260811-falta-https-enforcement-produccion]]: `updated` decía 2026-08-11 pese al bloque
  agregado el 08-13. Corregido. Se agregó `SECURE_HSTS_SECONDS` al criterio de aceptación (Django lo
  reclama con W004 y la nota no lo listaba).
- [[BACKEND-20260805-residuos-del-triaje]]: el punto 4 presentaba `ReportsPage.tsx:608-609` como el
  alcance completo; son **tres** interpolaciones (`:609` `src=`, `:610` `<span>`, `:773` `<title>`). Y el
  nombre de constraint `product_categories_tenant_id_nombre_..._uniq` **no existe escrito en el repo**:
  es un `unique_together` cuyo nombre lo genera Postgres.
- [[riesgo-deps-duplicadas-y-escpos]]: seguía 🟢 RESUELTO sin decir que el venv real quedó sucio.

## Estado al cerrar el PASO 0
Sin trabajo en curso, sin prompt pendiente, sin código sin commitear (sí cerebro sin commitear, del 08-13
y de hoy). El cerebro quedó re-sincronizado y **más honesto que ayer** en 6 puntos.

**La pregunta para el owner sigue siendo la misma que quedó el 08-13, ahora con mejor información:** qué
sigue — el bloque de doc que miente (alta, barato), la config de deploy (2 ítems, necesita una respuesta
suya sobre infraestructura), RLS (ya desbloqueado, mini-proyecto), o una feature nueva.

---

# Después del PASO 0 — feature: pegar el logo con ⌘V

El owner respondió "solo init" a la pregunta de qué seguía, y **acto seguido pidió una feature puntual en
el chat**: poder pegar una imagen con ⌘V/Ctrl+V en el modal de creación de negocio, además del upload.
Pedido directo ⇒ [[GOBERNANZA]] §10: lo implementa el Planner, con modo plan aprobado antes de tocar
código.

**Entregado:** el gesto en los modales de crear **y** editar (mismo componente), entrando al mismo
`LogoDraft` que el file-picker. 2 archivos de frontend, cero backend.
Decisión: [[ADR-TENANCY-20260815-pegar-logo-portapapeles]] · Corrida:
[[RUN-20260815-pegar-logo-portapapeles]] · Ficha: [[SUPERADMIN-20260815-pegar-logo-portapapeles]].

**Lo que más valió del análisis:** el repo ya tenía el gesto en `ProductsPage.tsx`, y copiarlo habría
sido el error — su `onPaste` está en el `<form>`, que **no dispara** hasta que algo adentro tiene foco,
y su handler no valida. Los dos huecos quedaron registrados sin tocarse:
[[FRONT-20260815-productspage-paste-sin-validar-y-en-form]].

**La revisión adversarial pagó de nuevo:** 19 agentes, 14 hallazgos, 11 refutados, **3 sobrevivientes
que apuntaban a la misma raíz** — el pegado exitoso era silencioso y encima se come la tecla. Un
`toast.success` cerró los tres (y es el anuncio para lectores de pantalla, porque react-toastify
renderiza con `role="alert"`).

**Límite que hay que decir en voz alta:** el ⌘V real del SO **no se ejecutó** — no hay extensión de
Chrome conectada, no hay navegador headless, no hay jsdom, y no se instaló nada en el proyecto del owner
para conseguirlo. Lo que sí se ejecutó: el contrato end-to-end contra servidor real y el espejo de
mensajes. El gesto queda pendiente de confirmación visual.

**Efecto colateral del entorno:** al levantar el stack se descubrió que el owner ya lo tenía corriendo
(`:8000` y `:5173` ocupados). Se usó el suyo; el Vite duplicado que arrancó en `:5174` se apagó (CORS
solo permite `:5173`). La base quedó **exactamente como estaba**: 0 negocios, y el asset de Cloudinary
de la prueba se destruyó antes de borrar el negocio.

---

# Segunda feature de la sesión (2026-08-16) — teclado numérico para el cajero

Otro pedido directo: keypad en pantalla en `/login/<slug>`, que abra al tocar los campos de cédula y PIN
y desaparezca si el usuario usa teclado físico. Modo plan otra vez, con dos preguntas al owner que sí
cambiaban el diseño (**panel fijo abajo** y **tecla "Siguiente"**, ambas elegidas por él).

Ficha: [[AUTH-20260816-teclado-numerico-staff-login]] · Decisión:
[[ADR-AUTH-20260816-teclado-numerico-staff-login]] · Corrida:
[[RUN-20260816-teclado-numerico-staff-login]].

**Lo que hay que recordar de esta corrida:** la revisión adversarial se corrió **dos veces**, y la
segunda —apuntada a los arreglos de la primera— fue la que más valió: encontró **dos regresiones que
introdujeron mis propios arreglos**. (1) Al pasar de `onFocus` a solo `onPointerDown`, tocar el `<label>`
de la cédula enfocaba el campo sin abrir el keypad, dejándolo con `inputMode="none"` y **cero teclados**.
(2) El flag `hasPhysicalKeyboard` quedó como latch irreversible alimentado por cualquier `keydown` — y
este POS usa lectores de código de barras HID, así que un escaneo perdido clasificaba una tablet táctil
como "tiene teclado" para siempre. **Moraleja para el próximo pedido directo: una sola ronda adversarial
sobre el diseño no alcanza; hay que correr una segunda sobre los arreglos.**

También quedó registrado un dato de auth que no se sabía: el PIN malo devuelve **403**, no 401 (quirk de
DRF), aunque el mensaje que ve el cajero es el correcto porque la página lee `detail` antes del status.

## Por dónde retomar en frío
1. Leer [[00-INDEX]] (sección del PASO 0 del 08-15) + [[GOBERNANZA]] + esta nota.
2. HEAD al cierre: `9727c03`. Árbol de app limpio; el cerebro tiene cambios sin commitear del 08-13 y del
   08-15.
3. El backlog está verificado al 2026-08-15 en sus 5 ítems de peso; los 7 de prioridad baja siguen con la
   verificación del 08-13 y no se re-tocaron a propósito.
