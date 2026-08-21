---
tags: [indice, router]
status: activo
updated: 2026-08-20
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

## PASO 0 del 2026-08-20 — el más reciente (lee este primero)
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
