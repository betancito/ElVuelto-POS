---
tags: [sprint]
status: cerrado
updated: 2026-08-04
---

# Sprint 2026-08-04 — USERS hardening

**Épica:** [[EPIC-20260802-estabilizacion]]
**Objetivo (1 frase):** cerrar los 3 defectos del módulo users (validación por rol, PATCH que nulifica, coherencia de password).

## Alcance
| ítem | tipo | estado | notas |
|---|---|---|---|
| [[USERS-20260802-zod-requeridos-por-rol]] | validación | 🟢 | Zod condicional por rol (front) — ✅ [[RUN-20260804-zod-requeridos-por-rol]] |
| [[USERS-20260804-perfil-nulifica-correo-admin]] | 🔒 bug | 🟢 | ✅ [[RUN-20260804-invariante-correo-admin]] (14/14) |
| [[USERS-20260802-patch-nulifica-campos]] | bug | 🟢 | ✅ misma corrida — los dos caminos cerrados juntos |
| [[USERS-20260802-unificar-reglas-password]] | consistencia | 🟢 | ✅ [[RUN-20260804-politica-password-por-rol]] (16/16) |
| [[USERS-20260804-error-400-campo-no-montado]] | forms | 🔴 | deuda derivada — **sale del sprint al backlog** |

> [!warning] Alcance ampliado el 2026-08-04
> El PASO 0 encontró que `UpdateMeView` (`apps/users/views.py:38-77`) es un **segundo camino de escritura** sobre `User` que ninguna nota del cerebro cubría, y que permite a un ADMIN borrarse el `correo` — o sea romper por detrás la misma invariante que este sprint blinda por delante. Entra al sprint con prioridad sobre `patch-nulifica`, y ambos se entregan en un solo prompt ([[PROMPT-FIX-USERS-20260804-invariante-correo-admin]]) porque arreglar un camino y dejar el otro abierto no cierra nada.

## Fuera de alcance
Otros módulos. El `min 6` de `new_password` y el paso de `UpdateMeView` a serializer siguen siendo del ítem de password, **no** del prompt de la invariante de correo.

## Cierre (2026-08-04) — 🟢 COMPLETO

Los **3 ítems originales cerrados**, más un 🔒 ALTA que apareció en el PASO 0 y entró al alcance. **3 corridas, 3 veredictos ✅, 0 fixes necesarios.**

| Corrida | Qué cerró | Verificación |
|---|---|---|
| [[RUN-20260804-zod-requeridos-por-rol]] | Zod condicional por rol en `UsersPage` | 8 puntos + `tsc` EXIT=0 |
| [[RUN-20260804-invariante-correo-admin]] | 🔒 perfil que dejaba al ADMIN sin login **+** PATCH que nulificaba | **14/14** ejecutados |
| [[RUN-20260804-politica-password-por-rol]] | política de password única, por rol | **16/16** ejecutados |

**Invariante que queda blindada de punta a punta:** *un ADMIN siempre tiene `correo`, un CAJERO siempre tiene `cedula`* — validada ahora en el Zod de creación/edición, en `UserCreateSerializer` (create **y** PATCH parcial) y en `UpdateMeView`. Antes vivía solo en el serializer de creación y se podía evadir por dos caminos.

### Notas de proceso
- **Los 3 prompts se corrieron sin reporte del Dev.** Las tres verificaciones las ejecutó el Planner contra el código real (BD de dev con `set_rollback(True)`). Es el tercer sprint seguido con fricción en el registro de corridas — ver la advertencia en [[00-INDEX]].
- Ninguna corrida necesitó prompt de fix. Los tres diffs respetaron el alcance y los límites duros (`AUTH_PASSWORD_VALIDATORS` sin cablear, `create_superadmin.py` intacto, las frases falsas del `CLAUDE.md` intocadas por ser otra tarea).

### Sale del sprint al backlog
- [[USERS-20260804-error-400-campo-no-montado]] (media) — deuda derivada de los reviews, 3 problemas en `UsersPage`/`ProfilePage`.
- [[TENANCY-20260804-password-admin-inicial-fuera-de-politica]] (baja) — el 5º generador.

### Pregunta abierta que dejó
**P-3:** ¿cableamos `AUTH_PASSWORD_VALIDATORS` o lo quitamos de `settings`? Hoy está declarado y **no se ejecuta**; cablearlo rompería el PIN del cajero. Necesita decisión del owner (posible ADR).
