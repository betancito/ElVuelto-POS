---
tags: [riesgo, global, tenancy, seguridad]
status: vivo
severidad: alta
updated: 2026-08-02
---

# Riesgo — Aislamiento de tenants sin red de seguridad

**Severidad:** 🔴 alta (latente) · **Estado:** aceptado como deuda (ver [[ADR-G-20260802-tenancy-isolation]])

## Qué
El aislamiento entre negocios es 100% a nivel de aplicación (filtrado manual en el ORM). **No hay RLS de Postgres** (0 políticas) y hay **un solo rol de BD** (`settings/base.py:64`). Si una vista futura olvida `filter(tenant=request.tenant)`, entrega datos de todos los tenants.

## Evidencia
- `TenantMixin` no filtra (`apps/tenants/models.py:58-68`).
- Los `CLAUDE.md` dicen "never manually filter" (`CLAUDE.md:93`, `backend/CLAUDE.md:56`) → normativo peligroso.
- Vistas que dependen del filtro manual: `reports/views.py:26,72,124,135`, `products/views.py:43,74`, etc.

## Impacto
Fuga de datos entre negocios (ventas, productos, usuarios, reportes) si un endpoint nuevo no filtra. Hoy no hay fuga activa.

## Mitigación (vigente)
1. Regla obligatoria en [[patron-tenancy]] + checklist de revisión del Planner.
2. Corregir los docs: [[DOCS-20260802-corregir-claudemd-tenancy]].
3. Meta: RLS post-estabilización [[GLOBAL-20260802-migracion-rls-postgres]].
