---
tags: [modulo, preguntas]
status: vivo
module: tenancy
updated: 2026-08-02
---

# Tenancy — Preguntas abiertas

Append-only (GOBERNANZA §6). Nunca se reordena. Cada P-N con hipótesis, respuesta y fecha.

---

P-1 [tenancy] ¿El endpoint `POST /tenants/{id}/toggle_active/` debe existir en el backend, o el hook `useToggleTenantActiveMutation` es un copiado sobrante de `usersApi`?
   Evidencia: `tenantsApi.ts:77-80` define la mutation; `views.py:47-85` (`TenantViewSet`) solo tiene la acción `upload_logo`, no `toggle_active`.
   Mi hipótesis: código legacy copiado del patrón de usuarios; el toggle real se hace por `PATCH ...{activo}`. El hook nunca se llama.
   Si no contestas: asumo que es fantasma y lo marco 🔴 en [[riesgo-toggle-active-fantasma]]; recomiendo borrar el hook o implementar la acción.
   Impacto: medio

P-2 [tenancy] ¿La creación de un tenant + su ADMIN inicial debería ser transaccional?
   Evidencia: `serializers.py:49-56` hace `super().create()` y luego `_create_initial_admin()` sin `@transaction.atomic`.
   Mi hipótesis: falta el atomic; si `admin_correo` colisiona (User.correo unique) queda un tenant sin admin y responde 500.
   Si no contestas: lo marco como bug latente en [[riesgo-creacion-tenant-no-atomica]] y asumo que debe envolverse en `transaction.atomic`.
   Impacto: alto

P-3 [tenancy] ¿Falta la UI para subir el logo del negocio o está pospuesta?
   Evidencia: backend `views.py:60` (`upload_logo`) y hook `uploadTenantLogoMutation` (`tenantsApi.ts:69`) existen; ninguna pantalla los invoca; `TenantsTable.tsx:35` sí muestra `logo_url`.
   Mi hipótesis: pantalla pendiente; el logo hoy solo se puede setear vía API directa/admin.
   Si no contestas: lo marco 🟡 pendiente en [[riesgo-logo-tenant-sin-ui]].
   Impacto: bajo

P-4 [tenancy] ¿Es intencional que el slug NO transliteran tildes/ñ y que back/front difieran en espacios múltiples?
   Evidencia: back `views.py:16-17` (`replace(" ","-")`) vs front `users/UsersPage.tsx:30` (`replace(/\s+/g,'-')`); ambos hacen `[^a-z0-9-]→""` (tildes se caen, no se transliteran).
   Mi hipótesis: bug latente; nombres con doble espacio o con solo-tildes generan slugs distintos entre el link de staff y la búsqueda → login de staff falla o colisiona.
   Si no contestas: lo marco como riesgo en [[riesgo-slug-por-nombre]] y asumo que debería unificarse la función.
   Impacto: medio

P-5 [tenancy] ¿El front debería mapear los 400 por campo (NIT/correo duplicado) a los inputs?
   Evidencia: `index.tsx:67-69,91-93` — `catch` → `toast.error` genérico; no hay `setError`.
   Mi hipótesis: falta manejo; el super-admin no sabe qué campo chocó.
   Si no contestas: lo marco en [[riesgo-errores-400-silenciados]] como mejora de UX pendiente.
   Impacto: medio

P-6 [tenancy] ¿La interfaz TS `Tenant` debería incluir `updated_at`, y `support_number` guardarse como `null` cuando está vacío?
   Evidencia: `tenantsApi.ts:10-20` no declara `updated_at` (el serializer sí lo devuelve, `serializers.py:23`); el form manda `support_number:""` (`index.tsx:80`) donde el modelo permite `null` (`models.py:12`).
   Mi hipótesis: omisiones menores sin impacto funcional; nadie consume `updated_at` en el front hoy.
   Si no contestas: lo dejo como ❓ y no lo escalo a riesgo.
   Impacto: bajo

P-7 [tenancy] ¿Se pretende permitir borrar tenants (DELETE) desde el super-admin?
   Evidencia: `ModelViewSet` expone `destroy` (IsSuperAdmin) pero el front no tiene botón ni endpoint RTK Query; `TenantMixin` usa `CASCADE` ⇒ borrar arrastra products/sales/inventory.
   Mi hipótesis: el borrado se evita a propósito (se usa `activo=False` como baja lógica); el DELETE del router queda accesible pero sin UI.
   Si no contestas: asumo baja lógica vía `activo` y no documento flujo de borrado como soportado.
   Impacto: bajo

## Respuestas del owner (2026-08-02)
> [!decision] P-2 — RESUELTA: sí, la creación de tenant debe ser **atómica**; además el correo del admin es **único global** y un `admin_correo` duplicado devuelve 400 claro (no 500, sin huérfano). Ver [[ADR-TENANCY-20260802-correo-admin-unico-global]] y [[TENANCY-20260802-creacion-tenant-atomica]]. (P-1, P-3, P-4, P-5, P-6, P-7 siguen abiertas.)
