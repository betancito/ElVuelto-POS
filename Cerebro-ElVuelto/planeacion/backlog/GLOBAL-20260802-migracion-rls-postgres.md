---
tags: [tarea, global, tenancy, seguridad]
status: ⏸️
prioridad: media
updated: 2026-08-15
---

# GLOBAL-20260802-migracion-rls-postgres — Migrar a RLS de Postgres (defense-in-depth)

**Tipo:** seguridad / arquitectura · **Estado:** ⏸️ pospuesto **por decisión pendiente, ya no por bloqueo** · **Decisión:** D-1

> [!warning] El bloqueo caducó el 2026-08-09 — sincerado en el PASO 0 del 2026-08-15
> El prerrequisito de abajo era literal: *"Que la épica de estabilización esté cerrada. NO empezar
> antes."* [[EPIC-20260802-estabilizacion]] **se cerró el 2026-08-09**
> ([[2026-08-09-planner-cierre-estabilizacion]]) y esta nota arrastró ⏸️ seis días como si siguiera
> bloqueada. **Hoy nada lo bloquea**: tomarlo o no es una decisión del owner.
>
> Dato para esa decisión: RLS es el **arreglo estructural** de
> [[BACKEND-20260813-docstring-tenancy-miente-aislamiento]]. Hoy el docstring de `TenantModelViewSet`
> promete que la fuga cross-tenant es *"impossible at the API layer"* y es mentira; RLS es lo que la
> volvería verdad. Mientras tanto la única red es que cada vista filtre a mano — verificado el
> 2026-08-15: solo **2** ViewSets heredan el filtro (`CategoryViewSet`, `ProductViewSet`
> `apps/products/views.py:18,53`) y todo lo demás usa `require_tenant`.

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
