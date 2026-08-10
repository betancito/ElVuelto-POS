---
tags: [prompt, reports, fix, tenancy, seguridad]
status: 🟢
updated: 2026-08-03
---

# Prompt DEV — Guard `tenant is None` en los endpoints de reports (matar el 500)

**Tarea backlog:** [[REPORTS-20260802-endpoints-500-tenant-none]] · **Riesgo:** [[sales-detail-500-si-tenant-none]]
**Alcance:** UNA cosa — que los reports rechacen con **403 limpio** cuando no hay tenant en contexto (hoy uno da 500). No scope creep. No git. No editar el cerebro.

## Contexto mínimo necesario
- Leer: `el_vuelto_backend/CLAUDE.md` (Reports + Roles/Permisos), `apps/reports/views.py` completo, `apps/users/permissions.py`.
- Regla dura — **TENANCY + PERMISOS:** SUPERADMIN es solo-plataforma y **no** tiene `tenant` (`request.tenant is None`); no debe ver datos de un tenant salvo por impersonación (que aún no existe). Ver ADR de acceso por rol.

## El bug (anclado)
- `SalesDetailExportView.get` (`apps/reports/views.py:169-174`) hace `request.tenant.nombre` y `request.tenant.documents...` **sin** guard de None.
- `permission_classes = [IsAdmin]` (`:115`) e `IsAdmin` = ADMIN **o SUPERADMIN** (`apps/users/permissions.py:15-23`), así que un SUPERADMIN (`tenant=None`) entra → `AttributeError` → **500**.
- Los otros 4 endpoints (Summary `:26`, VentasPorHora `:72`, TopProductos `:192`, VentasPorDia `:235`) no crashean pero con `tenant=None` hacen `filter(tenant=None)` → devuelven **vacío** (inconsistente).

## Qué hacer (pasos)
1. En `apps/users/permissions.py`, agregar una permission reutilizable:
   ```python
   class HasTenant(BasePermission):
       message = "Los reportes requieren un tenant en contexto."
       def has_permission(self, request, view):
           return getattr(request, "tenant", None) is not None
   ```
   (Usa el mismo `BasePermission` que ya importa el archivo.)
2. En `apps/reports/views.py`, cambiar `permission_classes = [IsAdmin]` por `permission_classes = [IsAdmin, HasTenant]` en **las 5** vistas (`SummaryReportView`, `VentasPorHoraView`, `SalesDetailExportView`, `TopProductosView`, `VentasPorDiaView`). Importa `HasTenant` junto a `IsAdmin`.
   - DRF hace AND: ADMIN (con tenant) pasa las dos; SUPERADMIN (`tenant=None`) pasa `IsAdmin` pero falla `HasTenant` → **403** limpio, no 500.
3. No cambies la lógica de agregación ni el resto de las vistas.

## Restricciones
- Solo tocas `apps/users/permissions.py` y `apps/reports/views.py`. Stack inmutable.
- No rompes al ADMIN normal (tiene tenant → 200 igual que hoy). El 403 solo afecta al SUPERADMIN, que no debía ver reports de un tenant.
- **Fuera de alcance:** el tag `Report` que nunca se invalida ([[reports-tag-nunca-se-invalida]]) es OTRO prompt.
- **Doble actualización:** en `el_vuelto_backend/CLAUDE.md` (sección **Reports**), anotar que los endpoints de reports exigen tenant en contexto → **403** si `request.tenant is None`.

## Entregable / verificación (salida REAL)
1. `DJANGO_SETTINGS_MODULE=elvuelto.settings.local python manage.py makemigrations --check --dry-run` → **"No changes detected"**.
2. **Repro con APIRequestFactory (shell, sin levantar servidor):**
   ```bash
   source .venv/bin/activate
   DJANGO_SETTINGS_MODULE=elvuelto.settings.local python manage.py shell
   ```
   ```python
   from rest_framework.test import APIRequestFactory, force_authenticate
   from apps.reports.views import SalesDetailExportView
   from apps.users.models import User

   factory = APIRequestFactory()

   sa = User.objects.filter(rol="SUPERADMIN").first()
   req = factory.get("/api/reports/sales-detail/?fecha=2026-08-03")
   force_authenticate(req, user=sa)
   req.tenant = None                      # como lo deja TenantMiddleware para superadmin
   print("SUPERADMIN tenant=None ->", SalesDetailExportView.as_view()(req).status_code)  # esperado 403

   ad = User.objects.filter(rol="ADMIN").first()
   req2 = factory.get("/api/reports/sales-detail/?fecha=2026-08-03")
   force_authenticate(req2, user=ad)
   req2.tenant = ad.tenant                 # admin sí tiene tenant
   print("ADMIN tenant set   ->", SalesDetailExportView.as_view()(req2).status_code)     # esperado 200
   ```
   Esperado: `403` para el superadmin (antes daba 500), `200` para el admin. Pegar salida.
3. Veredicto ✅ / 🔴 con la evidencia real.
