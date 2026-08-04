---
tags: [modulo, riesgo]
status: vivo
module: tenancy
severity: media
updated: 2026-08-02
---

# Riesgo — Endpoint `toggle_active` fantasma en tenants

**Ancla:** `el_vuelto_frontend/src/features/tenants/tenantsApi.ts:77-80` ↔ `el_vuelto_backend/apps/tenants/views.py:47-85`

## Qué pasa
El front define la mutation `toggleTenantActive` que hace `POST /tenants/{id}/toggle_active/` y exporta el hook `useToggleTenantActiveMutation` (`tenantsApi.ts:77,91`). Pero `TenantViewSet` (`views.py:47`) solo declara la acción `upload_logo`; **no existe `toggle_active`**. Una llamada real recibiría **404**.

## Estado actual
- El hook **no se invoca** en ninguna pantalla (grep confirma solo la definición/export). El toggle de estado del negocio se hace correctamente por `PATCH /tenants/{id}/` con `activo` (`index.tsx:87`).
- Por eso hoy es un bug latente, no un fallo activo.

## Impacto si alguien lo cablea
Cualquier dev que asuma "existe el hook ⇒ existe el endpoint" y lo conecte a un switch obtendrá 404 y el negocio no cambiará de estado. Trampa silenciosa.

## Recomendación (no aplicar aquí)
O bien (a) borrar la mutation + hook y quedarse con el PATCH; o (b) implementar la acción `@action(detail=True, methods=["post"], url_path="toggle_active")` en `TenantViewSet`. Decidir en [[preguntas-tenancy]] P-1.
