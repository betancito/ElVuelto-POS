---
tags: [modulo, riesgo]
status: abierto
module: inventory
severity: bajo
updated: 2026-08-02
---

# Riesgo — SUPERADMIN (tenant=None) sin guard en el viewset

**Ancla:** `el_vuelto_backend/apps/inventory/views.py:42-61` y `:64-76`

## Qué pasa
`InventoryMovementViewSet` **no hereda** `TenantModelViewSet` (a diferencia de la convención del proyecto); filtra tenant a mano:
```
def get_queryset(self):
    qs = InventoryMovement.objects.filter(tenant=self.request.tenant) ...
def perform_create(self, serializer):
    serializer.save(tenant=self.request.tenant, user=self.request.user)
```
Los permisos son `IsAdmin`/`IsCajero`, ambos **permiten SUPERADMIN**, que tiene `tenant=None` (`users/models.py:34-40`). Como aquí no existe el guard `_get_tenant()` que sí tiene `TenantModelViewSet` (lanza `PermissionDenied` si `tenant is None`, `tenants/viewsets.py:14-24`):

- **GET `/movements/`** con SUPERADMIN → `filter(tenant=None)` → **lista vacía silenciosa** (no error, dato engañoso).
- **GET `/stock/`** (`StockView`, `IsAdmin`) → `filter(tenant=None)` → **lista vacía silenciosa**.
- **POST `/movements/`** con SUPERADMIN → `save(tenant=None)` sobre FK `NOT NULL` → **IntegrityError → 500**.

## Impacto
- No es fuga de datos entre tenants (el filtro por None no cruza datos).
- Es un problema de **robustez/consistencia**: un 500 en vez de un 403 claro, y respuestas vacías que confunden.
- Severidad **baja**: el SUPERADMIN normalmente no gestiona stock de un tenant vía estos endpoints.

## Nota de convención
Otros recursos tenant-scoped usan `TenantModelViewSet` (CLAUDE.md). Este módulo se desvía y reimplementa el filtrado manualmente, perdiendo el guard. Si se migrara a `TenantModelViewSet`, habría que preservar el override de `create` (gate lead_cashier) y el `select_related`.

Relacionado: [[preguntas-inventory]] P-6 · [[contratos-inventory]].
