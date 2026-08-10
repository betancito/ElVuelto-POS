---
tags: [sprint]
status: activo
updated: 2026-08-03
---

# Sprint 2026-08-03 — Corrección de documentación (CLAUDE.md que mienten)

**Épica:** [[EPIC-20260802-estabilizacion]] (parte "docs que no mienten")
**Objetivo (1 frase):** que los `CLAUDE.md` dejen de mentir — empezando por la afirmación peligrosa de que el aislamiento de tenant es automático.

## Alcance
| ítem | tipo | estado | notas |
|---|---|---|---|
| [[DOCS-20260802-corregir-claudemd-tenancy]] | doc/seguridad | 🟢 | mentira "auto-filtra" corregida (+fix de `:69`) |
| [[DOCS-20260802-corregir-claudemd-drift]] | doc | 🟢 | rutas/conteos corregidos (split diferido, opcional) |

## Fuera de alcance
Cambios de código (esto es solo doc). USERS/TENANCY/REPORTS bugs (otro sprint).

## Nota
Parte del drift ya se corrigió en el sprint anterior: la afirmación de "impresión ESC/POS backend" (root + backend CLAUDE.md) quedó corregida al quitar `python-escpos` en la limpieza D-4.

## Cierre (2026-08-03) — 🟢 COMPLETO
- **DOCS-tenancy** 🟢: 3 mentiras peligrosas ("auto-filtra"/"never manually filter") corregidas + fix del residuo `:69`. Los CLAUDE.md ya reflejan que el filtrado es manual.
- **DOCS-drift** 🟢: `apiBase` (ruta), reports=5, `lead_cashier` (verificado), `UpdateMeView` documentados. ESC/POS ya venía corregido del sprint anterior.
- **Nota de proceso:** DOCS-drift tuvo 2 "dev finished" sin cambios en el working tree (el prompt no se le había pasado al Dev). Diagnosticado por mtime/diff; se cerró al re-entregarlo.
- **Diferido (opcional, no bloquea):** partir `backend/CLAUDE.md` (~460>400 líneas). El owner lo dejó opcional.
