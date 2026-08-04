---
tags: [plantilla, tarea]
status: activo
updated: 2026-08-02
---

# Plantilla — Ítem de backlog

Nombre: `<MOD>-<YYYYMMDD>-<slug>.md` en `planeacion/backlog/`. MOD puede ser un módulo (`SALES`) o transversal (`GLOBAL`, `DOCS`, `FRONT`, `BACKEND`).

```markdown
---
tags: [tarea, <mod>]
status: 🔴        # 🔴 pendiente | 🟡 en proceso | 🟢 hecho | ⏸️ pospuesto
prioridad: alta   # alta | media | baja
updated: 2026-08-02
---

# <MOD>-<fecha>-<slug> — <título corto>

**Tipo:** bug | mejora | limpieza | seguridad | doc
**Sprint:** [[Sprint-...]] (o "sin asignar")
**Bloquea / bloqueado por:** [[...]]

## Problema
Qué está mal, anclado a `archivo:línea`.

## Criterio de aceptación
Cómo sabemos que quedó. (Verificable.)

## Notas para el Dev
Pista de solución sin escribir el código. Qué `CLAUDE_*.md` debe actualizar (doble actualización).
```
