---
tags: [plantilla, prompt]
status: activo
updated: 2026-08-02
---

# Plantilla — Prompt para el Dev (Agente B)

Un prompt = una tarea acotada, autocontenida, verificable. Se guarda en `modules/<mod>/prompts/<slug>.md`.

```markdown
---
tags: [prompt, <mod>]
status: 🔴
updated: 2026-08-02
---

# Prompt DEV — <título>

**Tarea backlog:** [[<MOD>-<fecha>-<slug>]]
**Alcance:** UNA cosa. No scope creep. No git.

## Contexto mínimo necesario
- Leer: `CLAUDE_<x>.md`, [[mapa-<mod>]], `archivo:línea` relevantes.
- Regla dura aplicable (tenancy / dinero / permisos / tags RTK Query / ta-*).

## Qué hacer (pasos)
1. ...

## Restricciones
- Stack inmutable (versiones reales). No tocar X. Respetar convención Y.
- Doble actualización: actualizar `CLAUDE_<x>.md` que corresponda.

## Entregable / verificación
- Salida REAL de: `npm run typecheck`, `makemigrations --check`, etc.
- Veredicto ✅ / 🔴 con la evidencia.
```
