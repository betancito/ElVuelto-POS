---
tags: [meta, humanos]
status: activo
updated: 2026-08-02
---

# Cómo usar el cerebro (para humanos)

Este vault es el "cerebro" de ElVuelto-POS: la memoria compartida entre el humano y los agentes. **El texto plano es el contrato**; Obsidian es solo una UX más cómoda encima.

## Abrirlo
1. Obsidian → *Open folder as vault* → elige `Cerebro-ElVuelto/`.
2. La config (`.obsidian/`) ya viene versionada: plugins core, plantillas y grupos de color del grafo.
3. Empieza por [[00-INDEX]].

## Estructura
- `_global/` — lo transversal: patrones (tenancy, permisos, JWT, dinero, diseño `ta-*`…), decisiones (ADR) y riesgos.
- `modules/<mod>/` — un módulo por carpeta, con 5 notas: `estado-`, `mapa-`, `contratos-`, `datos-`, `formularios-`.
- `_conexiones/` — contratos entre módulos (p. ej. `sales--inventory`).
- `planeacion/` — backlog, sprints, épicas.
- `_sesiones/` — handoff de cada sesión (append-only, nunca se edita uno viejo).
- `99-plantillas/` — plantillas para nuevas notas.

## Grafo (colores por carpeta)
Módulos = azul · Global = verde · Conexiones = naranja · Planeación = violeta · Sesiones = celeste.

## Reglas que te afectan como humano
- **No reordenes los índices `00-*.md`** (son append-only, evita conflictos de merge).
- Si algo del cerebro contradice el código, **gana el código** — avísale al Planner para re-sincronizar.
- Las "fotos de estado" son referenciales: se desfasan. Por eso los agentes hacen el PASO 0 antes de actuar.

Detalle completo de convenciones: [[GOBERNANZA]].
