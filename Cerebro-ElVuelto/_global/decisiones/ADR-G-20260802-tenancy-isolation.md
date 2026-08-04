---
tags: [adr, global, tenancy, seguridad]
status: aceptado
updated: 2026-08-02
---

# ADR-G-20260802 — Aislamiento de tenants: filtrado manual hoy, RLS como meta

## Contexto

El reconocimiento (Fase 0) encontró una divergencia peligrosa entre la documentación y el código:

- `TenantMixin` (`apps/tenants/models.py:58-68`) es un **modelo abstracto que solo añade un FK** `tenant`. **No tiene manager ni queryset propio**: no filtra nada.
- El aislamiento real ocurre de dos formas: (a) `TenantModelViewSet` (`apps/tenants/viewsets.py:5-24`) que sobre-escribe `get_queryset()`/`perform_create()`; y (b) **filtrado manual** `filter(tenant=request.tenant)` repartido por casi todas las vistas: `products/views.py:43,74`, `users/views.py:86`, `sales/views.py:29`, `inventory/views.py:43,71`, `reports/views.py:26,72,124,135`.
- `TenantModelViewSet` solo se usa "limpio" en `CategoryViewSet` (`products/views.py:13`); `ProductViewSet` hereda pero **sobre-escribe** `get_queryset` filtrando a mano (`products/views.py:42-47`).
- Los tres `CLAUDE.md` afirman lo contrario y es **normativo peligroso**: raíz `CLAUDE.md:49` ("`TenantMixin` auto-filters QuerySets") y `:93` ("never manually filter by tenant"), y `backend/CLAUDE.md:56` ("Core rule: never manually filter"). Un agente que obedezca esto escribe un `APIView` nuevo sin filtro → **fuga de datos entre negocios**.
- **No hay RLS de Postgres:** grep de `CREATE POLICY` / `ENABLE ROW LEVEL SECURITY` / `current_setting` / `set_config` = 0. Un solo rol de BD (`settings/base.py:64`). El aislamiento es 100% a nivel de aplicación, **sin red de seguridad** en la base.

Hoy **no hay fuga activa** (todas las vistas actuales sí filtran); el riesgo es **latente** para vistas futuras.

## Decisión

Owner: humano (jeronimobeta90), 2026-08-02.

1. **Se mantiene el filtrado manual del ORM tal como está.** No se refactoriza ahora.
2. **RLS de Postgres es la meta** (defense-in-depth), pero se **planea y ejecuta DESPUÉS de la estabilización** que se hace junto con esta documentación. Ver [[EPIC-20260802-estabilizacion]] y [[GLOBAL-20260802-migracion-rls-postgres]].
3. **Regla operativa vigente (obligatoria):** toda vista/endpoint DEBE filtrar por `request.tenant`. Detalle en [[patron-tenancy]]. El checklist de revisión del Planner la vigila.
4. Los `CLAUDE.md` que dicen "never manually filter" están **mal** y hay que corregirlos: [[DOCS-20260802-corregir-claudemd-tenancy]].

## Estado
Aceptado. No reemplaza ningún ADR previo (es el primero).

## Consecuencias
- **Positivas:** cero refactor ahora; el equipo sigue estabilizando. La regla real queda escrita y auditada.
- **Deuda / negativas:** el aislamiento sigue dependiendo de que ningún dev olvide el filtro (frágil). Mitigación: [[patron-tenancy]] + checklist + corrección de docs. Ver [[riesgo-tenancy-sin-red-de-seguridad]].
- **Meta diferida:** RLS queda ⏸️ bloqueado por la estabilización.

## Tareas derivadas
- [[DOCS-20260802-corregir-claudemd-tenancy]] — corregir los 3 CLAUDE.md.
- [[GLOBAL-20260802-migracion-rls-postgres]] — migración a RLS por fases (post-estabilización).

## Enlaces
[[patron-tenancy]] · [[patron-permisos-roles]] · `apps/tenants/viewsets.py:5-24` · `apps/tenants/models.py:58-68`
