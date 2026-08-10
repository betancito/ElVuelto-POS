---
tags: [indice, planeacion]
status: activo
updated: 2026-08-02
---

# 00-planeacion — Índice de planeación

> [!decision] ✅ Estabilización cerrada — 2026-08-09
> El owner pidió avisar cuando termine la estabilización para pasar a features. **Las 4 condiciones de [[CRITERIO-CIERRE-ESTABILIZACION]] se cumplieron el 2026-08-09.** Handoff: [[2026-08-09-planner-cierre-estabilizacion]]. A partir de acá, nuevo trabajo = features, no hardening.

Índice delgado, append-only. Un ítem = un archivo.

## Épicas
- [[EPIC-20260802-estabilizacion]] — estabilizar + documentar en paralelo (🟢 cerrada 2026-08-09).

## Sprints
- [[Sprint-2026-08-02-estabilizacion-doc]] — cerebro base + 4 arreglos prioritarios (🟢 cerrado 2026-08-03).
- [[Sprint-2026-08-03-correccion-docs]] — corregir los CLAUDE.md que mienten (🟢 cerrado 2026-08-03).
- [[Sprint-2026-08-04-users-hardening]] — cerrar los 3 defectos de users + 1 🔒 ALTA del PASO 0 (🟢 cerrado 2026-08-04, 3/3 corridas ✅).

## Backlog
| ítem | prioridad | estado |
|---|---|---|
| [[SALES-20260802-guard-monto-recibido]] | alta | 🟢 |
| [[AUTH-20260802-exigir-tenant-id-login-cajero]] | alta | 🟢 |
| [[FRONT-20260802-borrar-codigo-muerto]] | alta | 🟢 |
| [[BACKEND-20260802-limpiar-deps]] | alta | 🟢 |
| [[FRONT-20260802-cerrar-ruta-test]] | alta | 🟢 |
| [[DOCS-20260802-corregir-claudemd-tenancy]] | alta | 🟢 |
| [[DOCS-20260802-corregir-claudemd-drift]] | media | 🟢 |
| [[USERS-20260802-unificar-reglas-password]] | media | 🟢 |
| [[GLOBAL-20260802-migracion-rls-postgres]] | media | ⏸️ |

### Descubiertos en la auditoría de módulos (2026-08-02)
| ítem | prioridad | estado |
|---|---|---|
| [[PRODUCTS-20260802-viewsets-sin-permiso]] | 🔒 alta | 🟢 |
| [[TENANCY-20260802-creacion-tenant-atomica]] | alta | 🟢 |
| [[FRONT-20260802-errores-400-silenciados]] | alta | 🟢 |
| [[USERS-20260802-zod-requeridos-por-rol]] | alta | 🟢 |
| [[REPORTS-20260802-invalidar-tag-report]] | alta | 🟢 |
| [[REPORTS-20260802-endpoints-500-tenant-none]] | alta | 🟢 |
| [[USERS-20260802-patch-nulifica-campos]] | media | 🟢 |
| [[TENANCY-20260802-toggle-active-fantasma]] | media | 🟢 |
| [[TENANCY-20260802-slug-divergente]] | media | 🟢 (resuelto como efecto colateral de [[ADR-TENANCY-20260809-slug-persistido]]) |
| [[REPORTS-20260802-hardening-params]] | media | 🟢 (queda el float del dinero → [[dinero-como-float]]) |

### Features / decisiones del owner (2026-08-02)
| ítem | prioridad | estado |
|---|---|---|
| [[SUPERADMIN-20260802-impersonar-tenant]] | media | 🔴 |

### Descubiertos en reviews (2026-08-03)
| ítem | prioridad | estado |
|---|---|---|
| [[BACKEND-20260803-guard-tenant-none-viewsets-restantes]] | **alta** (subida 2026-08-04: es 500, no queryset vacío) | 🟢 |

### Descubiertos en el PASO 0 (2026-08-04)
| ítem | prioridad | estado |
|---|---|---|
| [[USERS-20260804-perfil-nulifica-correo-admin]] | 🔒 alta | 🟢 |
| [[DOCS-20260804-claudemd-garantia-falsa]] | 🔒 alta | 🟢 |
| [[SALES-20260804-items-duplicados-sobreventa]] | alta | 🟢 |
| [[TENANCY-20260804-slug-tres-implementaciones]] | alta | 🟢 |
| [[USERS-20260804-error-400-campo-no-montado]] | media | 🟢 (vía [[FRONT-20260805-cuatro-400-invisibles]]) |
| [[BACKEND-20260804-params-fecha-sin-validar]] | media | 🟢 |
| [[TENANCY-20260804-password-admin-inicial-fuera-de-politica]] | baja | 🔴 |
| [[BACKEND-20260804-guard-tenant-usercreateserializer]] | media | 🟢 |

### Descubiertos el 2026-08-05
| ítem | prioridad | estado |
|---|---|---|
| [[FRONT-20260805-cuatro-400-invisibles]] | media | 🟢 |
| [[FRONT-20260805-falta-capa-compartida-de-errores]] | baja | 🔴 |
| [[BACKEND-20260805-seed-cajero-sin-cedula]] | media | 🟢 |
| [[BACKEND-20260805-escrituras-que-evaden-serializers]] | 🔒 alta | 🟢 |
| [[BACKEND-20260805-cerrar-residuos-users-auth]] | 🔒 alta | 🟢 |
| [[AUTH-20260805-sin-throttling-en-login]] | 🔒 alta | 🟢 |
| [[PRODUCTS-20260805-valores-negativos-dinero-y-stock]] | 🔒 alta | 🟢 |
| [[USERS-20260805-promocion-no-rota-credencial]] | 🔒 alta | 🟢 |
| [[BACKEND-20260805-residuos-del-triaje]] | media | 🔴 |
| [[BACKEND-20260805-sin-revocacion-de-sesiones]] | 🔒 alta | 🟢 |

### Descubiertos en review 2026-08-09
| ítem | prioridad | estado |
|---|---|---|
| [[USERS-20260809-promocion-no-muestra-password-rotado]] | 🔒 alta | 🟢 |
| [[TENANCY-20260809-race-slug-integrity-error]] | baja | 🔴 |
