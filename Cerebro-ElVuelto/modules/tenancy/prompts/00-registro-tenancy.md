---
tags: [registro, prompts, tenancy]
status: activo
module: tenancy
updated: 2026-08-30
---

# Registro de prompts y corridas — tenancy

Log de los prompts entregados al Dev (Agente B). Append-only en la tabla; el Planner actualiza el estado al correr.

**Estados:** 🔴 escrito (pendiente) · 🟡 en curso · 🟢 corrido-ok · ⛔ corrido-falló.

| Prompt | Tipo | Tarea backlog | Estado | Corrida | Veredicto | Reporte |
|---|---|---|---|---|---|---|
| [[PROMPT-FIX-TENANCY-20260802-creacion-atomica]] | fix | [[TENANCY-20260802-creacion-tenant-atomica]] | 🟢 corrido-ok | 2026-08-02 | ✅ atómico + 400 en correo dup (makemigrations OK) | [[RUN-20260802-creacion-atomica]] |
| [[PROMPT-FIX-TENANCY-20260809-slug-persistido]] | fix | [[TENANCY-20260804-slug-tres-implementaciones]] | 🟢 corrido-ok | 2026-08-09 | ✅ pasó — verificado ejecutando (backend, rollback) + workflow adversarial de 7 agentes; 1 hallazgo menor no bloqueante al backlog | [[RUN-20260809-slug-persistido]] |
| [[PROMPT-FEAT-TENANCY-20260809-endpoints-superadmin-tenant-scoped]] | feature | [[SUPERADMIN-20260809-pagina-detalle-negocio]] | 🟢 corrido-ok | 2026-08-09 | ✅ pasó — 13/13 casos con requests HTTP reales, incluido caso límite de zona horaria y guard cross-tenant en ambas direcciones | [[RUN-20260809-endpoints-superadmin-tenant-scoped]] |
| [[PROMPT-FEAT-TENANCY-20260809-frontend-tenant-detail-page]] | feature | [[SUPERADMIN-20260809-pagina-detalle-negocio]] | 🟢 corrido-ok | 2026-08-09 | ✅ pasó — typecheck+build limpios, 9/9 casos trazados, 0 referencias colgantes al módulo borrado. Visual no ejecutada (sin Chrome conectado) | [[RUN-20260809-frontend-tenant-detail-page]] |
| [[PROMPT-FEAT-TENANCY-20260812-logo-tenant-superadmin-ui]] | feature | [[SUPERADMIN-20260812-logo-tenant-desde-panel]] | 🟢 corrido-ok | 2026-08-12 | ✅ pasó — sin prompt previo (pedido directo del owner, con análisis/planeación primero); typecheck+build limpios; permiso 403/401 y validación de archivo 400×3 confirmados con server real; upsert+versionado de Cloudinary confirmado; revisión adversarial corrida | [[RUN-20260812-logo-tenant-superadmin-ui]] |
| _(sin prompt — Planner implementa)_ | feature | [[SUPERADMIN-20260812-logo-en-modales-crear-editar]] | 🟢 corrido-ok | 2026-08-12 | ✅ pasó — pedido directo del owner con modo plan aprobado; 15/15 casos contra servidor real (incluye 401/403/404, idempotencia y borrado confirmado por Admin API de Cloudinary); typecheck+build limpios; revisión adversarial de 24 agentes → **1 bug propio real encontrado y arreglado** (`destroy_image` no atrapaba el `ValueError` del SDK: DELETE daba 500 y la fila sobrevivía), 1 hallazgo preexistente de a11y al backlog | [[RUN-20260812-logo-tenant-modales-crear-editar]] |

| _(sin prompt — Planner implementa)_ | feature | [[SUPERADMIN-20260815-pegar-logo-portapapeles]] | 🟢 corrido-ok | 2026-08-15 | ✅ pasó — pedido directo del owner con modo plan aprobado; typecheck+build limpios; contrato end-to-end contra servidor real (crear en JSON → `activo:true` → upload multipart → `logo_url`) + espejo de mensajes cliente↔backend verbatim en los 2 rechazos; entorno devuelto en 0 negocios y asset destruido antes de borrar; revisión adversarial de **19 agentes → 14 hallazgos, 11 refutados, 3 sobrevivientes (todos baja) con una sola raíz** → arreglo propio aplicado (`toast.success` al pegar, que además es el anuncio para lectores de pantalla vía `role="alert"`). ⚠️ **el ⌘V real NO se ejecutó** (sin navegador ni jsdom; no se instaló nada) — falta confirmación visual del owner | [[RUN-20260815-pegar-logo-portapapeles]] |
| _(sin prompt — Planner implementa)_ | feature 🧾 | [[TENANCY-20260830-factura-electronica-por-tenant]] | 🟢 corrido-ok | 2026-08-30 | ✅ pasó — pedido directo con mapeo previo (5 lectores) y ronda de decisiones. Toggle `factura_electronica` por tenant, **opt-in**; el bloque del recibo pasa de condición implícita siempre-verdadera a explícita; «El Vuelto POS» fuera del recibo. 7 casos contra servidor real (GET/POST/PATCH, PATCH parcial no nulifica, los 3 flujos de login, superadmin sin tenant); recibo renderizado en las dos ramas. Revisión adversarial: 6 lentes → 25 hallazgos, **los escépticos fallaron por un bug de mi script** y se verificaron a mano → 8 arreglos reales + 1 refutado. ⚠️ nada visto en pantalla; falta prender BambiPan | [[ADR-TENANCY-20260830-factura-electronica-por-tenant]] |

## Cómo se registra una corrida
El **Planner** actualiza la fila al correr (Estado, Corrida, Veredicto) y guarda el reporte extenso en `corridas/RUN-<fecha>-<slug>.md`. El Dev no edita el cerebro.
