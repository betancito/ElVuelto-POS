---
tags: [tarea, global, tenancy, seguridad]
status: ⏸️
prioridad: media
updated: 2026-08-02
---

# GLOBAL-20260802-migracion-rls-postgres — Migrar a RLS de Postgres (defense-in-depth)

**Tipo:** seguridad / arquitectura · **Estado:** ⏸️ pospuesto (bloqueado por [[EPIC-20260802-estabilizacion]]) · **Decisión:** D-1

## Objetivo
Activar Row Level Security de Postgres como red de seguridad para el aislamiento de tenants, para que un olvido de filtro en la app **no** filtre datos. Ver [[ADR-G-20260802-tenancy-isolation]] y [[riesgo-tenancy-sin-red-de-seguridad]].

## Alcance (a planear en detalle cuando se desbloquee)
- Rol de BD **no superusuario** para la app (hoy es uno solo, `settings/base.py:64`).
- `ENABLE ROW LEVEL SECURITY` + `CREATE POLICY` por tabla tenant-scoped (`products`, `product_categories`, `inventory_movements`, `sales`, `sale_items` vía join, `users`).
- Setear `SET app.current_tenant = <id>` por request (middleware o conexión), con cuidado del **connection pooling** (resetear la variable).
- Migraciones con SQL crudo (`RunSQL`).

## Prerrequisitos
Que la épica de estabilización esté cerrada. NO empezar antes.

## Notas
Es un mini-proyecto. Requiere ADR propio de implementación cuando se retome.
