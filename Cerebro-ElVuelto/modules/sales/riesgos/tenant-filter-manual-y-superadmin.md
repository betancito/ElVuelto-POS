---
tags: [modulo, riesgo, sales, multitenancy]
status: abierto
module: sales
severidad: media
updated: 2026-08-02
---

# Riesgo — Filtro de tenant manual + borde SUPERADMIN en `SaleViewSet`

**ID:** `SALES-20260802-tenant-filter-manual-superadmin`
**Severidad:** 🟡 media (deuda de arquitectura + doc mentirosa; funcionalmente correcto hoy)

## Resumen
`SaleViewSet` **no** usa el patrón `TenantModelViewSet` del resto del sistema: extiende `GenericViewSet` y filtra el tenant **a mano**. Además, `IsCajero` deja pasar a SUPERADMIN (que tiene `tenant=None`), un caso no contemplado en `create`.

## A) `TenantMixin` no auto-filtra (mentira del CLAUDE.md raíz)
El `CLAUDE.md` raíz afirma: *"all models use `TenantMixin` which auto-filters QuerySets by `tenant_id`"*. **Falso.** `TenantMixin` (`tenants/models.py:58-68`) es solo un modelo abstracto que añade el FK `tenant`; no toca el manager ni el QuerySet. El auto-filtrado real vive en `TenantModelViewSet.get_queryset()` (según `el_vuelto_backend/CLAUDE.md`), que **`SaleViewSet` no hereda**.

## B) Filtro manual (contradice la convención "nunca filtres por tenant a mano")
`SaleViewSet.get_queryset` (`views.py:28-31`):
```
Sale.objects.filter(tenant=self.request.tenant).prefetch_related("items").select_related("user")
```
Es **correcto** (sí aísla por tenant) pero rompe la regla documentada de no filtrar tenant manualmente. En `create`, el tenant se toma de `request.tenant` dentro del serializer (`serializers.py:108-109`), no de un `perform_create`.

Riesgo: inconsistencia de patrón → un futuro dev que "confíe" en el mixin podría añadir un endpoint a `Sale` sin filtro y filtrar de más/menos. Hoy no hay fuga.

## C) Borde SUPERADMIN con `tenant=None`
`IsCajero` (`users/permissions.py:26-34`) permite SUPERADMIN en `POST /api/sales/`. Pero SUPERADMIN tiene `tenant=None`:
- `_resolve_products` filtra `tenant=None` (`serializers.py:83-85`) → 0 productos → error "no encontrado".
- Si llegara a `Sale.objects.create(tenant=None, ...)` violaría el FK not-null.

No es explotable como fuga (falla antes), pero es un camino no diseñado. En la práctica SUPERADMIN no abre el POS.

## Evidencia
- `apps/tenants/models.py:58-68` (mixin = solo FK).
- `apps/sales/views.py:11-16,23-31` (GenericViewSet + filtro manual + IsCajero/IsAdmin).
- `apps/sales/serializers.py:83-85,108-109`.
- `apps/users/permissions.py:26-34`.
- `apps/tenants/middleware.py:23-31` (`request.tenant` desde JWT; `None` si no hay `tenant_id`).

## Impacto
- Deuda de consistencia arquitectónica; documentación raíz engañosa (corregir el CLAUDE.md raíz es tarea del humano/planner, no de este agente).
- Sin fuga de datos entre tenants detectada hoy.

## Mitigación propuesta (backlog)
- Alinear `SaleViewSet` con `TenantModelViewSet`, o dejar claro por qué no (necesita mixins Create/Retrieve/List + serializers distintos).
- Bloquear SUPERADMIN en `create` explícitamente, o excluirlo de `IsCajero` para POS.
- Corregir la afirmación falsa sobre `TenantMixin` en el `CLAUDE.md` raíz.

## Preguntas ligadas
- [[preguntas-sales]] P-6 (borde SUPERADMIN).
