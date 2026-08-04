---
tags: [indice, modulos]
status: activo
updated: 2026-08-02
---

# 00-modulos — Índice de módulos

Índice delgado, append-only. Un módulo por fila. Estado = de la documentación en el cerebro.

**Verificación (2026-08-02):** los 7 módulos pasaron un pase adversarial (re-lectura del código contra cada nota). `format_ok` en los 7; `tenancy` = CONFIRMED; el resto = ISSUES **triviales** (off-by-one de líneas, imprecisiones menores) registrados en la sesión para un cleanup. Sin invenciones.

| Módulo | Estado doc | App back | Feature front | Complejidad | Nota |
|---|---|---|---|---|---|
| [[estado-tenancy]] | 🟢 | `apps/tenants` | `super-admin/tenants` (+`tenants` api) | 🟡 | núcleo multi-tenant · [[patron-tenancy]] · 5 riesgos |
| [[estado-auth]] | 🟢 | `apps/users` (login/JWT) | `features/auth` | 🔴 | 3 flujos de login · [[patron-jwt-refresh]] · 3 riesgos |
| [[estado-users]] | 🟢 | `apps/users` (CRUD) | `features/users` | 🟡 | CRUD + profile + password · 3 riesgos |
| [[estado-products]] | 🟢 | `apps/products` | `features/products` | 🟡🔴 | forms duales · ⚠️ viewsets sin permiso · 4 riesgos |
| [[estado-inventory]] | 🟢 | `apps/inventory` | `features/inventory` | 🟡 | **PILOTO** · movimientos + stock · 4 riesgos |
| [[estado-sales]] | 🟢 | `apps/sales` | `features/sales` | 🔴 | POS · venta atómica · dinero · 3 riesgos |
| [[estado-reports]] | 🟢 | `apps/reports` | `features/reports` (+`dashboard`) | 🟡 | solo lectura · 5 endpoints · 4 riesgos |

Módulos front-only sin app back propia (documentados de forma ligera dentro de sus features): `super-admin` (shell), `dashboard` (consume reports), `layout`/infra.
