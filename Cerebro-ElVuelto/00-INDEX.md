---
tags: [indice, router]
status: activo
updated: 2026-08-09
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

> [!warning] Regla de review — primero `mtime`, después el código
> El registro de prompts y el disco se desfasan seguido en este proyecto. Al 2026-08-04 van **2 corridas vacías** ("dev finished" con 0 archivos tocados: DOCS-drift el 08-03, hardening-params el 08-04) y **4 corridas sin reporte del Dev** (todas ✅, pero verificadas por el Planner).
> **Antes de leer una línea de código en un review, corré `find <dirs> -newermt '-30 minutes'` o `stat` sobre los archivos que la tarea debía tocar.** Detecta la corrida vacía en segundos y evita un review fantasma. Detalle en [[RUN-20260804-hardening-params-CORRIDA-VACIA]].
