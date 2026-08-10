---
tags: [planeacion, criterio, decision]
status: activo
updated: 2026-08-09
---

# Criterio de cierre de la estabilización — cuándo avisar "listo para features"

> [!decision] Directiva del owner (2026-08-05)
> *"Avisame una vez que todo lo que estás arreglando esté resuelto, para empezar a integrar features nuevas."*
>
> Esto **cambia el modo de trabajo**: se deja de buscar trabajo nuevo y se converge. Sin un criterio explícito la señal nunca llega, porque la [[auditoria-adversarial-20260805]] dejó superficie sin explorar y siempre va a aparecer algo más.

> [!decision] ✅ SEÑAL: las 4 condiciones se cumplieron el 2026-08-09
> La estabilización, tal como quedó acotada abajo, **terminó**. Ver el handoff de cierre: [[2026-08-09-planner-cierre-estabilizacion]].

## Alcance CERRADO

La estabilización termina cuando se cumplan estas cuatro condiciones. **Nada se agrega a esta lista.**

| # | Condición | Estado |
|---|---|---|
| 1 | **Cero ítems 🔒 alta y alta abiertos** | ✅ **Cero.** [[BACKEND-20260805-sin-revocacion-de-sesiones]] cerró 🟢 el 2026-08-09, verificado con requests HTTP reales de punta a punta + costo medido (cero queries extra) — [[RUN-20260809-check-revoke-token]]. [[TENANCY-20260804-slug-tres-implementaciones]] cerró 🟢 el mismo día ([[RUN-20260809-slug-persistido]]; dejó un hallazgo menor no bloqueante, [[TENANCY-20260809-race-slug-integrity-error]]). [[USERS-20260809-promocion-no-muestra-password-rotado]] también cerró 🟢 ([[RUN-20260809-mostrar-password-rotado-en-edicion]]) |
| 2 | **Los ❓ de la auditoría, triados** — cada uno verificado (→ tarea) o descartado (→ registrado como falso positivo) | ✅ **Ya estaba hecho desde el 2026-08-05** — esta fila quedó desactualizada. [[auditoria-adversarial-20260805]] tiene la tabla de triaje completa (sección "TRIAJE COMPLETO"): 5 hallazgos ya arreglados por fixes posteriores, 5 confirmados y todos mapeados a un ítem de backlog existente. Corregido en el PASO 0 del 2026-08-09. |
| 3 | **El prompt en curso, cerrado** | ✅ Sin prompt en curso — [[PROMPT-FIX-AUTH-20260809-check-revoke-token]] cerró 🟢 corrido-ok el 2026-08-09 |
| 4 | **Handoff escrito** con el estado real y lo que queda | ✅ [[2026-08-09-planner-cierre-estabilizacion]] |

Los ítems **media y baja quedan abiertos a propósito** — no bloquean features y conviene atacarlos cuando se toque esa zona.

## Regla anti-scope-creep

A partir de ahora, **todo hallazgo nuevo va al backlog sin bloquear la señal**, salvo que sea 🔒 alta con impacto en dinero, acceso o pérdida de datos. Si aparece uno así, se avisa **de inmediato** y se decide si entra o queda para después de las features.

**Y se deja de auditar proactivamente.** La superficie sin explorar que enumeró la auditoría (Cloudinary, exports de reports, `downloadCredentials.ts`, guards de ruta, `apiBase`, `super-admin/`) queda documentada ahí como mapa para el futuro — **no se ataca ahora**.

## Las dos decisiones del owner — tomadas y ejecutadas, 2026-08-09

1. **P-1 — slug con tildes** ([[TENANCY-20260804-slug-tres-implementaciones]], alta) → [[ADR-TENANCY-20260809-slug-persistido]] → [[RUN-20260809-slug-persistido]] ✅.
2. **Revocación de sesiones** ([[BACKEND-20260805-sin-revocacion-de-sesiones]], 🔒 alta) → [[ADR-G-20260809-revocacion-check-revoke-token]] → [[RUN-20260809-check-revoke-token]] ✅.

## Cerrado — ver el handoff
No queda ningún prompt pendiente para esta épica. Detalle completo del cierre: [[2026-08-09-planner-cierre-estabilizacion]].
