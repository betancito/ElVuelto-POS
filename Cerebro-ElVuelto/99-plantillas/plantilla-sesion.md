---
tags: [plantilla, sesion]
status: activo
updated: 2026-08-02
---

# Plantilla — Handoff de sesión

Nombre: `<YYYY-MM-DD>-<agente>-<slug>.md` en `_sesiones/`. **Archivo nuevo siempre. Append-only. Jamás se edita uno viejo.**

```markdown
---
tags: [sesion, <agente>]
status: activo
updated: 2026-08-02
---

# Sesión <YYYY-MM-DD> — <agente> — <slug>

## Qué hice
- ...

## Estado al cerrar
- 🟢 / 🟡 / 🔴 por módulo o tarea.

## Preguntas abiertas
- P-N ... (enlace a `preguntas-<mod>`)

## Por dónde retomar en frío (PASO 0)
1. Leer [[00-INDEX]] + [[GOBERNANZA]] + el `estado-<mod>` del módulo activo + esta sesión.
2. Contrastar contra `git log` y los archivos reales ANTES de proponer nada.
3. Siguiente paso concreto: ...
```
