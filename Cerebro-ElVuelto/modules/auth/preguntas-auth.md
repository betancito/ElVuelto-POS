---
tags: [modulo, preguntas]
status: abierto
module: auth
updated: 2026-08-02
---

# Auth — Preguntas abiertas

Append-only (GOBERNANZA §6). No reordenar. Cada P-N con hipótesis, y su respuesta+fecha cuando llegue.

---

P-1 [auth] ¿El login por cédula sin `tenant_id` es intencional o un bug de aislamiento?
   Evidencia: `serializers.py:37-40` y `:96-98` — `qs = User.objects.filter(cedula=cedula)`; `tenant_id` se aplica solo `if tenant_id`. Combinado con `models.py:60-66` (cédula unique solo por-tenant), dos tenants pueden compartir cédula.
   Mi hipótesis: es un descuido; se asumió que el front siempre manda `tenant_id`, pero la API no lo obliga y `qs.first()` cruza tenants.
   Si no contestas: asumo que es **bug de seguridad** y lo dejo marcado 🔴 en [[login-cajero-sin-tenant-id]].
   Impacto: alto

P-2 [auth] `useMeQuery` y `useLogoutUserMutation` (`authApi.ts:94-103`) no tienen consumidores. ¿Código muerto o pendiente de cablear?
   Evidencia: grep en `src/` solo halla la definición/export; el logout real lo hace `dispatch(logout())` directo (`ProfilePage.tsx:100`).
   Mi hipótesis: `me` quedó como scaffolding (el user ya viene en el login); `logoutUser` se reemplazó por dispatch directo.
   Si no contestas: lo marco como código muerto candidato a limpieza, sin borrar nada.
   Impacto: bajo

P-3 [auth] `SuperAdminLoginPage` navega a `/super-admin/home` sin verificar `rol==SUPERADMIN` (`SuperAdminLoginPage.tsx:38-39`). ¿Se confía solo en los guards de ruta?
   Evidencia: `TenantLoginPage.tsx:23-29` sí ramifica por rol; el de superadmin no. Los guards internos usan `allowedRoles={['SUPERADMIN']}` (`router.tsx:48`), que rebotarían a un no-superadmin.
   Mi hipótesis: se delega el control al `ProtectedRoute`; funciona pero deja al usuario autenticado en un portal que no le corresponde por un instante.
   Si no contestas: lo dejo como observación de UX/consistencia, no como riesgo.
   Impacto: bajo

P-4 [auth] El logout es solo-cliente (`authApi.ts:97-103` no llama al server; sin blacklist). ¿Es aceptable que el JWT siga válido hasta 8h tras "cerrar sesión"?
   Evidencia: `settings/base.py:107-108` `ROTATE_REFRESH_TOKENS=False`, `BLACKLIST_AFTER_ROTATION=False`; no hay `token_blacklist` en INSTALLED_APPS (según CLAUDE.md del backend). `logout` solo limpia Redux/sessionStorage.
   Mi hipótesis: decisión pragmática para un POS; se acepta el riesgo de token vivo tras logout.
   Si no contestas: lo documento como riesgo aceptado en [[logout-solo-cliente-sin-blacklist]].
   Impacto: medio

P-5 [auth] La mutation se llama `loginSuperAdmin` pero también la usa `TenantLoginPage` para admins de tenant (mismo `/auth/login/`). ¿Renombrar a algo como `loginByEmail`?
   Evidencia: `authApi.ts:38` def; consumidores `TenantLoginPage.tsx:11` y `SuperAdminLoginPage.tsx:28`.
   Mi hipótesis: el nombre quedó del primer uso (superadmin) y no se actualizó al reusarla; es deuda de nombres, no un bug.
   Si no contestas: lo dejo como nota de "el nombre miente" en [[mapa-auth]], sin tocar código.
   Impacto: bajo
