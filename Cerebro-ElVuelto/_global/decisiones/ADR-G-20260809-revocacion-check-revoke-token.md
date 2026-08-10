---
tags: [adr, global, auth, seguridad]
status: aceptado
updated: 2026-08-09
---

# ADR-G-20260809 — Revocación de sesiones vía `CHECK_REVOKE_TOKEN`

## Contexto

[[BACKEND-20260805-sin-revocacion-de-sesiones]] (descubierto en [[auditoria-adversarial-20260805]], verificado por el Planner ejecutando de punta a punta): `reset_password` cambia el hash pero no invalida ningún token ya emitido. Un token robado (o de un empleado que se fue) sigue sirviendo hasta que expira: **8 h de access + 7 días de refresh**, sin `CHECK_REVOKE_TOKEN`, sin blacklist, sin endpoint de logout real.

El 2026-08-09 se cerró un fix relacionado ([[RUN-20260805-desactivar-de-punta-a-punta]]): `/api/auth/refresh/` ahora valida `is_active`, así que un usuario desactivado no puede renovar. Eso **acota** la ventana de exposición a un máximo de 8 h (la vida del access token), pero no la elimina: durante esas 8 h, un `reset_password` o un `toggle_active` no saca a nadie con un access ya emitido.

## Decisión

Owner: humano (jeronimobeta90), 2026-08-09.

**Se activa `SIMPLE_JWT["CHECK_REVOKE_TOKEN"] = True`.** simplejwt guarda un hash del password en el claim del token y lo compara contra la BD en cada request — cambiar la contraseña (vía `reset_password` o cualquier otro camino) invalida instantáneamente todos los tokens emitidos antes, sin blacklist ni migración de datos.

**Se descarta, por ahora, la alternativa de blacklist + `ROTATE_REFRESH_TOKENS` + endpoint de logout real** — es más completa (permite un logout que no dependa de cambiar la contraseña) pero pide instalar `token_blacklist`, migración, y más superficie nueva. Queda como mejora futura si hace falta logout explícito.

**Condición no negociable:** medir el costo real en el POS (la pantalla con más requests) antes de darlo por cerrado — la query extra por request es aceptable en teoría, pero hay que confirmarlo con números, no asumirlo.

## Estado
Aceptado. Implementación: prompt a escribir después de [[PROMPT-FIX-TENANCY-20260809-slug-persistido]] (un cambio de decisión a la vez).

## Consecuencias
- **Positivas:** cierra el placebo de `reset_password`/`toggle_active` sin migración ni blacklist. Config de una línea + la medición de costo.
- **Deuda:** sigue sin existir un logout explícito por decisión del usuario (solo revocación implícita al cambiar contraseña). Costo de una query extra por request, en la pantalla más pesada — a medir.
- El `CLAUDE.md` debe decir la verdad post-cambio: `reset_password` **sí** revoca ahora (hoy dice que no).

## Tareas derivadas
- Prompt de implementación + medición de costo en POS (pendiente de escribir).

## Enlaces
[[BACKEND-20260805-sin-revocacion-de-sesiones]] · [[auditoria-adversarial-20260805]] · [[RUN-20260805-desactivar-de-punta-a-punta]]
