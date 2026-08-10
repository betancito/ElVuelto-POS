---
tags: [sesion, planner]
status: activo
updated: 2026-08-05
---

# Sesión 2026-08-05 — planner — Hardening en cadena + auditoría adversarial

Continuación de [[2026-08-04-planner-paso0-resync]]. Ciclo prompt-a-prompt sostenido: **12 prompts entregados, 11 ✅, 1 corrida vacía, 0 prompts de fix necesarios.**

## Corridas (en orden)

| # | Corrida | Veredicto |
|---|---|---|
| 1 | [[RUN-20260804-zod-requeridos-por-rol]] | ✅ (descubierta sin registrar en el PASO 0) |
| 2 | [[RUN-20260804-invariante-correo-admin]] | ✅ 14/14 |
| 3 | [[RUN-20260804-politica-password-por-rol]] | ✅ 16/16 |
| 4 | [[RUN-20260804-guard-tenant-none-y-doc]] | ✅ 10/10 |
| 5 | [[RUN-20260804-items-duplicados-sobreventa]] | ✅ 12/12 |
| 6 | [[RUN-20260804-hardening-params-CORRIDA-VACIA]] | ⛔ 0 archivos tocados |
| 7 | [[RUN-20260804-hardening-params-fecha]] | ✅ 20/20 (re-entrega) |
| 8 | [[RUN-20260805-cuatro-400-invisibles]] | ✅ (typecheck+build; visual no ejecutada) |
| 9 | [[RUN-20260805-usercreate-tenant-y-docs]] | ✅ 10/10 |
| 10 | [[RUN-20260805-seed-cajero-y-3-docs]] | ✅ |
| 11 | [[RUN-20260805-cerrar-puertas-traseras]] | ✅ 10/10 |
| 12 | [[RUN-20260805-residuos-users-auth]] | ✅ 11/11 |
| 13 | [[RUN-20260805-throttling-login]] | ✅ 9/9 |
| 14 | [[RUN-20260805-valores-negativos]] | ✅ 10/10 |

**Ningún Dev entregó reporte con salida real.** Las 14 verificaciones las ejecutó el Planner contra la BD de dev, siempre con `transaction.set_rollback(True)`. Eso funcionó, pero significa que la Definition of Done de [[GOBERNANZA]] §5 se cumple a medias de forma sistemática.

## Lo que se cerró
- **Invariante correo/cédula por rol**: blindada en 4 superficies (Zod, `UserCreateSerializer`, `UpdateMeView`, `User.clean()`).
- **Política de password**: fuente única en `password_policy.py`, por rol, con `secrets`.
- **Tenancy**: `require_tenant` en los 8 caminos; los guards *fail-open* pasaron a *fail-closed*. No queda nada que dereferencie `request.tenant` sin guard.
- **Dinero y stock**: los tres agujeros cerrados — monto insuficiente, ítems duplicados y valores negativos.
- **Params**: helper compartido; un param inválido es 400, no 500.
- **Errores 400 del front**: los cuatro sitios invisibles.
- **Puertas traseras**: `/admin/` ya no puede producir usuarios inválidos; PUT deshabilitado; `is_staff` fuera de los admins de tenant (con migración de datos retroactiva).
- **Throttling**: dos capas; los 10.000 PINs pasan de ~18 minutos a ~200 días.
- **Docs**: `DOCS-drift` cerrado — 13 afirmaciones falsas corregidas.

## [[auditoria-adversarial-20260805]] — el hallazgo de fondo

Nueve atacantes intentaron romper cada invariante entregada. **Ninguna se rompió por su propia superficie**: el guard de correo aguantó `""`/`null`/`"   "`/PUT/TOCTOU, y `_resolve_products` aguantó duplicados y dos ventas concurrentes reales. Lo que encontraron fueron **puertas laterales que ningún prompt había mirado** — el `/admin/`, el `PUT` multipart, el seed.

> **La lección: blindar un serializer no blinda el dato.** Mientras exista un camino que escriba el modelo sin pasar por él, la invariante es una convención, no una garantía.

Eso motivó el giro de los últimos 4 prompts: de "arreglar el endpoint" a "poner la regla en el modelo" (`User.clean()`, `MinValueValidator`) y "cerrar la superficie que la app no usa" (PUT, `/admin/`).

## Lecciones de método (para mí)
1. **Primero `mtime`, después el código.** Detectó la corrida vacía en segundos. Anotado en [[00-INDEX]].
2. **`git diff` no fecha nada** cuando hace días que no se commitea — compara contra HEAD y acumula. Casi me hace corregir un review correcto.
3. **Cuando falla un caso de *regresión*, sospechar primero del arnés.** Me pasó dos veces: los `initkwargs` del `@action` (403 engañoso) y un `nombre` de 1 carácter (400 legítimo que leí como regresión).
4. **Verificar antes de escribir en el cerebro.** Descarté un 🔒 ALTA falso (`is_active` es property de `activo`) y corregí una afirmación mía sobre las fuentes del `CLAUDE.md` raíz que era falsa.
5. **Copiar la lista completa al prompt.** Omití 3 renglones de `DOCS-drift`; uno lo había dicho en el chat y no en el archivo — justo lo que GOBERNANZA §9 prohíbe.

## Estado al cerrar
- **7 ítems 🔴** en el backlog, ninguno bloqueante para operar.
- Todo sigue **sin commitear**. El humano versiona a mano.
- Prompt en la mano del Dev: [[PROMPT-FIX-20260805-desactivar-de-punta-a-punta]].

## ⏸️ Aparcado por falta de decisión del owner (NO es olvido)
- **P-1 — slug con tildes** ([[TENANCY-20260804-slug-tres-implementaciones]], alta). Ya tiene repro en el propio entorno de dev: el tenant sembrado "Panadería La Esperanza" hace que un cajero que cierra turno aterrice en "Sucursal no encontrada". Bloquea el ítem alta más viejo. **Preguntado 2 veces.**
- **Revocación de sesiones** ([[BACKEND-20260805-sin-revocacion-de-sesiones]], 🔒 alta). `reset_password` es un placebo contra una sesión robada. La vía barata (`CHECK_REVOKE_TOKEN=True`) agrega una query por request y el POS es la pantalla más pesada. **Preguntado 3 veces.**

## Por dónde retomar en frío
1. PASO 0: [[00-INDEX]] + [[GOBERNANZA]] + [[00-planeacion]] + esta nota. **`mtime` antes que código.**
2. Review del prompt entregado.
3. Con el owner: P-1 y revocación. Ambas probablemente ameritan ADR.
4. Sin decisiones, lo siguiente por valor: los ❓ sin verificar de [[auditoria-adversarial-20260805]] (colisión de slug en el endpoint público, `applyServerErrors` con `surfaced=true`, `esc()` del recibo) y la superficie que **nadie** atacó: Cloudinary, exports de reports, y casi todo el frontend (`downloadCredentials.ts`, guards de ruta, `apiBase`, `super-admin/`).
