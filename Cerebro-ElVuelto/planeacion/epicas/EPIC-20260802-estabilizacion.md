---
tags: [epica, estabilizacion]
status: 🟢 cerrada
updated: 2026-08-09
---

> [!decision] Cerrada 2026-08-09
> Las 4 condiciones de [[CRITERIO-CIERRE-ESTABILIZACION]] se cumplieron. Handoff: [[2026-08-09-planner-cierre-estabilizacion]]. El owner puede pasar a features nuevas.

# EPIC-20260802 — Estabilización + documentación en paralelo

## Objetivo
Dejar ElVuelto en un estado **estable y documentado** antes de meterle features nuevas o cambios grandes de arquitectura. La documentación (este cerebro) y la corrección de bugs/riesgos encontrados van **en paralelo**.

## Por qué
El reconocimiento (Fase 0) encontró divergencias doc↔código peligrosas, código muerto, y un par de bugs de plata/seguridad. Estabilizar primero evita construir sobre arena.

## Alcance
- Construir el cerebro (Fases 1–4). 🟡
- Arreglar los 4 prioritarios (D-4): [[SALES-20260802-guard-monto-recibido]], [[FRONT-20260802-borrar-codigo-muerto]], [[BACKEND-20260802-limpiar-deps]], [[FRONT-20260802-cerrar-ruta-test]].
- Seguridad de auth: [[AUTH-20260802-exigir-tenant-id-login-cajero]].
- Corregir documentación: [[DOCS-20260802-corregir-claudemd-tenancy]], [[DOCS-20260802-corregir-claudemd-drift]].
- Unificar reglas de password: [[USERS-20260802-unificar-reglas-password]].

## Fuera de alcance (después de estabilizar)
- **RLS de Postgres** (defense-in-depth): [[GLOBAL-20260802-migracion-rls-postgres]] ⏸️. Bloqueado por esta épica.
- Refactor grande de vistas a `TenantModelViewSet`.
- Framework de tests (no existe hoy) — evaluar como sub-objetivo.

## Definición de "estabilizado"
Sin bugs de plata conocidos · sin código muerto · docs que no mienten · aislamiento de tenant con regla clara y auditada · backlog prioritario en 🟢.

## Sprints
- [[Sprint-2026-08-02-estabilizacion-doc]]
