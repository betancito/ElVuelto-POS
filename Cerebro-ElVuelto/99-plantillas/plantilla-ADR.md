---
tags: [plantilla, adr]
status: activo
updated: 2026-08-02
---

# Plantilla — ADR (Architecture Decision Record)

Nombre: `ADR-<G|MOD>-<YYYYMMDD>-<slug>.md`. Global → `_global/decisiones/`. De módulo → `modules/<mod>/decisiones/`.

```markdown
---
tags: [adr, <mod-o-global>]
status: aceptado    # propuesto | aceptado | reemplazado | archivado
updated: 2026-08-02
---

# ADR-<...> — <título de la decisión>

## Contexto
Qué situación fuerza la decisión. Anclado a `archivo:línea`. Qué se descubrió en el reconocimiento.

## Decisión
Qué se decidió, en una frase clara. Quién lo decidió (owner) y cuándo.

## Estado
aceptado / propuesto / ... + si reemplaza o es reemplazado por otro ADR ([[ADR-...]]).

## Consecuencias
- Positivas: ...
- Negativas / deuda: ...
- Regla operativa que queda vigente (si aplica).

## Tareas derivadas
- [[<MOD>-<fecha>-<slug>]] (backlog)

## Enlaces
[[patron-...]] · [[riesgo-...]] · `archivo:línea`
```
