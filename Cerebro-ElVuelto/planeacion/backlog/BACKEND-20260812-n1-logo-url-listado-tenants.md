---
tags: [tarea, backend, rendimiento, tenancy]
status: 🔴
prioridad: baja
updated: 2026-08-12
---

# BACKEND-20260812-n1-logo-url-listado-tenants — el `prefetch_related` de logos no sirve de nada

**Tipo:** rendimiento · **Encontrado en:** investigación previa a
[[ADR-TENANCY-20260812-logo-tenant-modales-crear-editar]] (agente Explore sobre el backend).
Preexistente, no lo introdujo esa corrida.

## El problema
`TenantSerializer.get_logo_url` (`apps/tenants/serializers.py:34-36`) hace:

```python
obj.documents.filter(document_type=TenantDocument.DocumentType.LOGO).first()
```

`.filter()`, no `.all()`. El `RelatedManager.get_queryset()` de Django devuelve el caché del prefetch,
pero `Manager.filter()` es `self.get_queryset().filter(...)`: **clona** el QuerySet ya evaluado,
descarta `_result_cache` y vuelve a pegarle a la BD.

Resultado: el `Tenant.objects.prefetch_related("documents")` de `apps/tenants/views.py:75` gasta una
query extra **y encima no evita ninguna** — se hace 1 query adicional por cada tenant serializado. Con
`PAGE_SIZE: 50`, una página llena de `GET /api/tenants/` son ~50 queries de más.

Mismo patrón, sobre un solo objeto, en `TenantBySlugView` (`views.py:52` + `:59-61`) — ahí es 1 query, sin
impacto real.

## Criterio de aceptación
`GET /api/tenants/` con N tenants hace un número de queries **constante** respecto de N. Medible con
`CaptureQueriesContext` (el mismo método usado para medir el costo de `CHECK_REVOKE_TOKEN`).

## Notas para el Dev
- El arreglo típico es filtrar en memoria sobre el prefetch (`next((d for d in obj.documents.all() if
  d.document_type == ...), None)`) o usar un `Prefetch(..., queryset=...)` con el filtro adentro, que sí
  se cachea.
- Hoy solo duele en el panel de super-admin, que tiene un solo usuario concurrente. De ahí la prioridad
  baja.
