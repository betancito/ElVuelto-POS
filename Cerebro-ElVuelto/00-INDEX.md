---
tags: [indice, router]
status: activo
updated: 2026-08-11
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

> [!warning] Regla de review — primero `mtime`, después el código
> El registro de prompts y el disco se desfasan seguido en este proyecto. Al 2026-08-04 van **2 corridas vacías** ("dev finished" con 0 archivos tocados: DOCS-drift el 08-03, hardening-params el 08-04) y **4 corridas sin reporte del Dev** (todas ✅, pero verificadas por el Planner).
> **Antes de leer una línea de código en un review, corré `find <dirs> -newermt '-30 minutes'` o `stat` sobre los archivos que la tarea debía tocar.** Detecta la corrida vacía en segundos y evita un review fantasma. Detalle en [[RUN-20260804-hardening-params-CORRIDA-VACIA]].
