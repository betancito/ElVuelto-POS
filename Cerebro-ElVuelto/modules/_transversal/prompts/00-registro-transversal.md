---
tags: [registro, prompts, transversal]
status: activo
updated: 2026-08-11
---

# Registro de prompts y corridas — _transversal

Prompts que **no pertenecen a un solo módulo** (cross-cutting: front-wide, deps, etc.). Append-only en la tabla; el Planner actualiza el estado al correr.

**Estados:** 🔴 escrito (pendiente) · 🟡 en curso · 🟢 corrido-ok · ⛔ corrido-falló.

| Prompt | Tipo | Tarea backlog | Estado | Corrida | Veredicto | Reporte |
|---|---|---|---|---|---|---|
| [[PROMPT-FIX-FRONT-20260802-errores-400-helper]] | fix | [[FRONT-20260802-errores-400-silenciados]] | 🟢 corrido-ok | 2026-08-03 | ✅ helper + users/tenants (typecheck OK) | [[RUN-20260803-errores-400-helper]] |
| [[PROMPT-FIX-FRONT-20260803-errores-400-products-inventory]] | fix | [[FRONT-20260802-errores-400-silenciados]] | 🟢 corrido-ok | 2026-08-03 | ✅ helper en products+inventory; Dev agregó spans faltantes; typecheck OK | [[RUN-20260803-errores-400-products-inventory]] |
| [[PROMPT-FIX-FRONT-20260803-errores-400-pos]] | fix | [[FRONT-20260802-errores-400-silenciados]] | 🟢 corrido-ok | 2026-08-03 | ✅ `getServerErrorMessage` (refactor DRY); banner POS muestra el 400 real; typecheck OK; ítem CERRADO | [[RUN-20260803-errores-400-pos]] |
| [[PROMPT-FIX-CLEANUP-20260803-d4-codigo-muerto-deps-ruta-test]] | cleanup | [[FRONT-20260802-borrar-codigo-muerto]] · [[BACKEND-20260802-limpiar-deps]] · [[FRONT-20260802-cerrar-ruta-test]] | 🟢 corrido-ok | 2026-08-03 | ✅ 3 shims/page borrados, deps limpias, ruta /test fuera; typecheck+build OK; docs corregidas | — |
| [[PROMPT-FIX-DOCS-20260803-claudemd-tenancy]] | doc | [[DOCS-20260802-corregir-claudemd-tenancy]] | ⛔ corrido-falló | 2026-08-03 | ⚠️ 3 mentiras peligrosas corregidas OK, pero faltó el paso 2: `backend/CLAUDE.md:69` sigue "used by all tenant-scoped resources" (falso) | — |
| [[PROMPT-FIX-DOCS-20260803-tenancy-viewset-overstatement]] | doc/fix | [[DOCS-20260802-corregir-claudemd-tenancy]] | 🟢 corrido-ok | 2026-08-03 | ✅ `:69` corregido (solo Category/Product heredan); root `:49` matizado; grep 0 | — |
| [[PROMPT-FIX-DOCS-20260803-claudemd-drift]] | doc | [[DOCS-20260802-corregir-claudemd-drift]] | 🟢 corrido-ok | 2026-08-03 | ✅ 4/4 correcciones (apiBase, reports=5, lead_cashier, UpdateMeView) — tras 2 corridas vacías (no se pasó el prompt); lead_cashier verificado contra código. **Reabierto 🟡 el 2026-08-04:** el PASO 0 halló 12 afirmaciones falsas más | — |
| [[PROMPT-FIX-BACKEND-20260804-guard-tenant-none-y-doc]] | fix/doc | [[BACKEND-20260803-guard-tenant-none-viewsets-restantes]] + [[DOCS-20260804-claudemd-garantia-falsa]] | 🟢 corrido-ok | 2026-08-04 | ✅ pasó (10/10, verificado por el Planner); 7 puntos guardados + fail-open→fail-closed; Dev auto-reportó el hueco de `UserCreateSerializer` | [[RUN-20260804-guard-tenant-none-y-doc]] |
| [[PROMPT-FIX-BACKEND-20260804-hardening-params-fecha]] | fix | [[REPORTS-20260802-hardening-params]] + [[BACKEND-20260804-params-fecha-sin-validar]] | 🟢 corrido-ok | 2026-08-04 (2ª entrega) | ⛔ 1ª corrida **vacía** (0 archivos) → re-entregado sin cambios → ✅ pasó (20/20, verificado por el Planner) | [[RUN-20260804-hardening-params-CORRIDA-VACIA]] · [[RUN-20260804-hardening-params-fecha]] |
| [[PROMPT-FIX-FRONT-20260805-cuatro-400-invisibles]] | fix | [[FRONT-20260805-cuatro-400-invisibles]] | 🟢 corrido-ok | 2026-08-05 | ✅ pasó — 4/4 sitios; typecheck+build OK. Verificación **visual no ejecutada** (sin navegador) | [[RUN-20260805-cuatro-400-invisibles]] |
| [[PROMPT-FIX-BACKEND-20260805-usercreate-tenant-y-docs]] | fix/doc | [[BACKEND-20260804-guard-tenant-usercreateserializer]] + [[DOCS-20260802-corregir-claudemd-drift]] | 🟢 corrido-ok | 2026-08-05 | ✅ pasó 10/10 (6 casos de código + 10 correcciones de doc). DOCS-drift NO cierra: el **prompt omitió 3 renglones** (error del Planner) | [[RUN-20260805-usercreate-tenant-y-docs]] |
| [[PROMPT-FIX-BACKEND-20260805-seed-cajero-y-3-docs]] | fix/doc | [[BACKEND-20260805-seed-cajero-sin-cedula]] + [[DOCS-20260802-corregir-claudemd-drift]] | 🟢 corrido-ok | 2026-08-05 | ✅ pasó — seed idempotente + login real del cajero 200 + 3 docs; extra: backfill de filas viejas | [[RUN-20260805-seed-cajero-y-3-docs]] |
| [[PROMPT-FIX-BACKEND-20260805-cerrar-puertas-traseras]] | fix 🔒 | [[BACKEND-20260805-escrituras-que-evaden-serializers]] | 🟢 corrido-ok | 2026-08-05 | ✅ pasó 10/10 — `User.clean()` sin migración + `cedula` en el admin + PUT deshabilitado + `is_staff` fuera. Residual: no es retroactivo | [[RUN-20260805-cerrar-puertas-traseras]] |
| [[PROMPT-FIX-BACKEND-20260805-residuos-users-auth]] | fix 🔒 | [[BACKEND-20260805-cerrar-residuos-users-auth]] | 🟢 corrido-ok | 2026-08-05 | ✅ pasó 11/11 — migración de datos aplicada + guard generalizado ("¿tiene otra vía de login?") | [[RUN-20260805-residuos-users-auth]] |
| [[PROMPT-FIX-20260805-desactivar-de-punta-a-punta]] | fix | [[TENANCY-20260802-toggle-active-fantasma]] + residual de refresh | 🟢 corrido-ok | 2026-08-05 | ✅ pasó 5/5; el Dev NO tocó `apiBase.ts` y tenía razón | [[RUN-20260805-desactivar-de-punta-a-punta]] |
| [[PROMPT-FEAT-TRANSVERSAL-20260809-compresion-cloudinary]] | feature | [[BACKEND-20260809-compresion-estandar-imagenes]] | 🟢 corrido-ok | 2026-08-10 | ✅ pasó — 6/6 casos con subidas reales contra Cloudinary, incl. verificación independiente del fix de staleness/versión | [[RUN-20260809-compresion-cloudinary]] |
| [[PROMPT-FEAT-TRANSVERSAL-20260811-docs-swagger-key-gate]] | feature | [[BACKEND-20260811-docs-swagger-api-key]] | 🟢 corrido-ok | 2026-08-11 | ✅ pasó — 12/12+6/6+9/9 casos reales; sin prompt previo (pedido directo del owner); review adversarial corrida (3 hallazgos arreglados, 2 a backlog nuevo); rediseñado a mitad de sesión de `?key=` en URL a login-form+sesión a pedido del owner | [[RUN-20260811-docs-swagger-key-gate]] |

## Cómo se registra una corrida
El **Planner** actualiza la fila al correr (Estado, Corrida, Veredicto) y guarda el reporte extenso en `corridas/RUN-<fecha>-<slug>.md`. El Dev no edita el cerebro.
