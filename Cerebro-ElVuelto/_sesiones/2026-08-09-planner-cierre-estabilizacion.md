---
tags: [sesion, planner, cierre]
status: activo
updated: 2026-08-09
---

# Sesión 2026-08-09 — planner — Cierre de la estabilización

> [!decision] Señal para el owner
> **La estabilización terminó.** Las 4 condiciones de [[CRITERIO-CIERRE-ESTABILIZACION]] se cumplieron hoy. A partir de acá, lo que sigue es features nuevas, no hardening.

Continuación de [[2026-08-05-planner-hardening-y-auditoria]] y [[2026-08-09-planner-review-promocion-rol]] (misma sesión, día largo).

## Qué se cerró hoy

| # | Corrida | Veredicto |
|---|---|---|
| 1 | [[RUN-20260806-promocion-no-rota-credencial]] (backend) | ⛔ parcial — encontró el hueco del front |
| 2 | [[RUN-20260809-mostrar-password-rotado-en-edicion]] | ✅ 5/5 casos, 0 regresiones |
| 3 | [[RUN-20260809-slug-persistido]] | ✅ verificado ejecutando + workflow adversarial de 7 agentes |
| 4 | [[RUN-20260809-check-revoke-token]] | ✅ verificado con requests HTTP reales de punta a punta + costo medido |

Dos decisiones del owner, tomadas y ya ejecutadas:
1. **P-1 — slug con tildes** → [[ADR-TENANCY-20260809-slug-persistido]]. `Tenant.slug` ahora es una columna persistida, única, generada una vez por transliteración; las tres implementaciones divergentes (backend, POS, alta de usuario) fueron reemplazadas por una sola fuente de verdad.
2. **Revocación de sesiones** → [[ADR-G-20260809-revocacion-check-revoke-token]]. `CHECK_REVOKE_TOKEN` activado: cambiar la contraseña (reset, promoción de rol, cambio propio) revoca todo token ya emitido — access en su próximo request, refresh de inmediato. Costo medido: **cero queries extra**.

## Lo que quedó abierto a propósito (no bloquea, documentado)
- [[TENANCY-20260809-race-slug-integrity-error]] (baja) — dos altas de tenant con el mismo nombre en simultáneo pueden dar 500 en vez de 400.
- [[BACKEND-20260805-residuos-del-triaje]] (media) — 3 hallazgos menores del triaje del 08-05 (params UUID sin validar en 2 casos, `applyServerErrors surfaced=true`, `esc()` del recibo).
- [[FRONT-20260805-falta-capa-compartida-de-errores]] (baja).
- [[SUPERADMIN-20260802-impersonar-tenant]] (media) — es feature, no estabilización; queda para cuando se decida priorizarla.
- [[GLOBAL-20260802-migracion-rls-postgres]] (⏸️) — meta de defense-in-depth, explícitamente post-estabilización desde [[ADR-G-20260802-tenancy-isolation]].
- Superficie que la auditoría del 08-05 marcó como nunca atacada y sigue sin auditarse: Cloudinary (`upload_logo`/`upload_image` sin validar tipo/tamaño), exports de reports sin tope de filas, `downloadCredentials.ts`, `apiBase.ts` (carrera de refresh sin mutex), y casi todo `super-admin/`. Es mapa para el futuro, no una promesa de que está bien — nadie lo verificó todavía.

Ninguno de estos es 🔒 alta con impacto en dinero/acceso/datos, así que ninguno bloqueaba la señal (regla anti-scope-creep de [[CRITERIO-CIERRE-ESTABILIZACION]]).

## Lecciones de método (para la próxima)
1. **El registro se desfasa del disco, todavía.** Dos veces más hoy: el prompt de promoción de rol figuraba "🔴 escrito" cuando ya estaba implementado, y `CRITERIO-CIERRE` decía "~10 ❓ pendientes" cuando el triaje ya estaba completo desde el 08-05 (solo que en el mismo archivo, más abajo, sin que nadie actualizara la fila de arriba). `mtime` primero, seguir confiando en eso.
2. **El Dev, dos veces esta sesión, corrigió una asunción mía leyendo el código en vez de seguir el prompt literal:** encontró la tercera copia del dict de login (`CashierLoginSerializer`, el endpoint que el POS realmente usa) que mi prompt de slug no mencionaba, y encontró que `TokenRefreshSerializer` base no propaga el chequeo de revocación al refresh en sí (mi prompt asumía que el setting solo bastaba). Ambas veces el prompt decía explícitamente "si ves algo distinto, parate y reportá" — funcionó. Vale la pena seguir escribiendo los prompts como investigación declarada, no como verdad cerrada.
3. **Verificar con ejecución real > verificar leyendo,** otra vez confirmado: el hallazgo del front (password rotada invisible) solo salió a la luz corriendo el caso real contra la BD de dev, no leyendo el diff. Y el costo de `CHECK_REVOKE_TOKEN` se midió con `CaptureQueriesContext`, no se asumió — y la suposición original ("una query extra por request") resultó ser falsa.
4. **Workflows adversariales rindieron** en los dos cambios de mayor superficie (slug persistido, con migración + 4 archivos de front; la promoción de rol). El review de `CHECK_REVOKE_TOKEN` no necesitó uno — 2 archivos, verificación HTTP end-to-end directa fue suficiente y más rápida. Escalar el esfuerzo de review al tamaño real del cambio, no aplicar el mismo martillo siempre.

## Estado al cerrar
- **Backlog de estabilización:** cero ítems 🔒 alta/alta abiertos. Todo lo que queda es media/baja/⏸️, documentado arriba.
- **Todo sigue sin commitear.** El humano versiona a mano — con la épica cerrada, puede ser buen momento para un commit grande de "estabilización" antes de arrancar features, pero es su decisión, no la mía.
- Nadie tocó `CLAUDE.md` raíz hoy — sigue siendo la referencia general del monorepo, sin necesidad de cambios.

## Por dónde retomar en frío (ya no es "estabilización")
1. PASO 0 sigue aplicando siempre: [[00-INDEX]] + [[GOBERNANZA]] + `estado-<mod>` del módulo que toque + esta nota.
2. La próxima conversación con el owner debería ser sobre **qué feature entra primero** — no hay más backlog de hardening que buscar por cuenta propia (regla anti-scope-creep sigue viva hasta que el owner diga lo contrario).
3. Si el owner pide seguir auditando algo puntual de la superficie sin explorar (arriba), es trabajo nuevo con su propio criterio de aceptación — no reabre la épica de estabilización.
