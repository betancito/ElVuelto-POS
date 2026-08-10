---
tags: [sprint]
status: activo
updated: 2026-08-02
---

# Sprint 2026-08-02 — Estabilización + documentación

**Épica:** [[EPIC-20260802-estabilizacion]]
**Objetivo (1 frase):** dejar el cerebro base construido y cerrar los 4 arreglos prioritarios + la seguridad de login de cajero.

## Alcance
| ítem | tipo | estado | notas |
|---|---|---|---|
| Construir cerebro (Fases 1–2) | doc | 🟢 | módulos vía workflow (7 documentados+verificados) |
| [[SALES-20260802-guard-monto-recibido]] | bug/seguridad | 🟢 | guard backend (400 si monto<total; verificado en shell) |
| [[FRONT-20260802-borrar-codigo-muerto]] | limpieza | 🟢 | 2 shims borrados |
| [[BACKEND-20260802-limpiar-deps]] | limpieza | 🟢 | cloudinary dedup + escpos fuera |
| [[FRONT-20260802-cerrar-ruta-test]] | seguridad | 🟢 | /test/color-bends eliminada |
| [[AUTH-20260802-exigir-tenant-id-login-cajero]] | seguridad | 🟢 | exigir tenant_id |
| [[PRODUCTS-20260802-viewsets-sin-permiso]] | 🔒 seguridad | 🟢 | escalada cerrada (fix + fix de categorías) |
| [[TENANCY-20260802-creacion-tenant-atomica]] | bug | 🟢 | 500 + tenant huérfano (descubierto en auditoría) |

## Fuera de alcance
Correcciones de doc (siguiente sprint), RLS, tests.

## Cierre (2026-08-03) — 🟢 COMPLETO
Todo el alcance del sprint en 🟢. Corridas verificadas por el Planner (código real + ejecución), no reportes:

| Ítem | Corrida / prueba |
|---|---|
| AUTH exigir-tenant-id | [[RUN-20260802-exigir-tenant-id]] |
| PRODUCTS permisos | [[RUN-20260802-categorias-read-cajero]] (tras fix fallido [[RUN-20260802-permisos-isadmin]]) |
| TENANCY creación atómica | [[RUN-20260802-creacion-atomica]] |
| SALES guard monto | [[RUN-20260803-guard-monto-recibido]] (400 verificado en shell) |
| FRONT errores-400 (users/tenants/products/inventory/POS) | [[RUN-20260803-errores-400-helper]] · [[RUN-20260803-errores-400-products-inventory]] · [[RUN-20260803-errores-400-pos]] |
| REPORTS 500 tenant=None | [[RUN-20260803-guard-tenant-none]] (403 verificado; +bug latente `_get_tenant`) |
| REPORTS invalidar tag Report | registro-reports (typecheck OK) |
| Limpieza D-4 (código muerto + deps + ruta /test) | typecheck+build OK |

**Extra descubierto y cerrado en el sprint:** gotcha `SimpleLazyObject`/`is None` documentado en [[patron-tenancy]].

**Queda para próximo sprint (backlog, fuera de este alcance):** [[USERS-20260802-zod-requeridos-por-rol]], [[USERS-20260802-patch-nulifica-campos]], [[USERS-20260802-unificar-reglas-password]], [[TENANCY-20260802-toggle-active-fantasma]], [[TENANCY-20260802-slug-divergente]], [[REPORTS-20260802-hardening-params]], [[BACKEND-20260803-guard-tenant-none-viewsets-restantes]], parte B (float front) de [[dinero-y-guard-monto]], [[DOCS-20260802-corregir-claudemd-tenancy]], [[DOCS-20260802-corregir-claudemd-drift]], [[SUPERADMIN-20260802-impersonar-tenant]], [[GLOBAL-20260802-migracion-rls-postgres]] ⏸️.
