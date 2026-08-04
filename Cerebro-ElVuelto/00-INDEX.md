---
tags: [indice, router]
status: activo
updated: 2026-08-02
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

## Estado global (2026-08-02)
- Fase 0 (reconocimiento) 🟢 · Fase 1 (esqueleto) 🟡 · Fase 2 (módulos) 🟡 · piloto = `inventory`.
- Decisión raíz: [[ADR-G-20260802-tenancy-isolation]] — se mantiene filtrado manual; RLS es meta post-estabilización.
- Épica activa: [[EPIC-20260802-estabilizacion]] (documentar + estabilizar en paralelo).
