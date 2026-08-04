---
tags: [tarea, tenancy, auth, bug]
status: 🔴
prioridad: media
updated: 2026-08-02
---

# TENANCY-20260802-slug-divergente — Slug back/front divergente y sin transliterar

**Tipo:** bug · **Descubierto:** auditoría de módulos 2026-08-02

## Problema
El slug del negocio se genera distinto en cada lado:
- Backend `_nombre_to_slug` (`apps/tenants/views.py:16-17`) reemplaza cada espacio literal.
- Front `toSlug` (`features/users/UsersPage.tsx:30-32`) colapsa runs de whitespace (`\s+`).
Nombres con doble espacio/tab → slugs distintos → el link de staff (`/login/{slug}`) **no matchea** `check-by-slug`. Ninguno translitera tildes/ñ. Además `TenantBySlugView` itera **todos** los tenants en Python (O(n), `views.py:31-32`) con posible colisión. Ver `modules/tenancy/riesgos/riesgo-slug-por-nombre`.

## Criterio de aceptación
Una sola definición de slug (o el backend persiste el slug con `unique`), con transliteración de tildes, y búsqueda por índice (no O(n)).

## Notas para el Dev
- Idealmente persistir `slug` en `Tenant` (campo único) y resolver por índice.
- Ref pregunta P-4 tenancy. Doble actualización.
