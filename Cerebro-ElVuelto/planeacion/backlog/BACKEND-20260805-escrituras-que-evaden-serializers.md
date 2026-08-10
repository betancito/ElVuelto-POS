---
tags: [tarea, backend, seguridad, tenancy, users]
status: 🟢
prioridad: alta
updated: 2026-08-05
---

> [!done] Cerrado 2026-08-05 — ✅ [[RUN-20260805-cerrar-puertas-traseras]]
> Puerta 1: `User.clean()` con la regla por rol (sin migración, sin `CheckConstraint`) + `cedula` en ambos fieldsets del `UserAdmin` + `is_staff` fuera de `_create_initial_admin`. Puerta 2: `METHODS_WITHOUT_PUT` en `TenantModelViewSet`, `TenantViewSet` y `UserViewSet` → PUT devuelve **405**. Verificado 10/10 con 5 regresiones.
> ⚠️ **Residual: el fix es hacia adelante.** Las filas existentes conservan `is_staff=True` → [[BACKEND-20260805-cerrar-residuos-users-auth]].

# 🔒 BACKEND-20260805-escrituras-que-evaden-serializers — Dos puertas traseras que ignoran todas las validaciones

**Tipo:** seguridad / integridad de datos · **Descubierto:** [[auditoria-adversarial-20260805]] · **Verificado por el Planner ejecutando**

Dos caminos escriben la BD **sin pasar por los serializers**, así que evaden todas las invariantes que se blindaron los 08-04/05. Ninguno lo usa la app: son superficie sobrante que quedó rota.

## Puerta 1 — El sitio de Django (`/admin/`)

`/admin/` está montado en `elvuelto/urls.py` (también en producción). `UserAdmin.add_fieldsets` es `['correo','nombre','tenant','rol','password1','password2']` — **sin `cedula`**.

Verificado ejecutando (`django.test.Client`, en transacción con rollback):
- Crear un CAJERO → nace **sin cédula** ⇒ nunca podrá entrar al POS. Y es **imposible** hacerlo bien: el campo no existe en el formulario.
- Vaciar el `correo` de un ADMIN → 302, queda `correo=None` (es `USERNAME_FIELD` ⇒ lockout). El mismo payload por API da 400.
- Cambiar rol ADMIN→CAJERO → cajero sin cédula.

⚠️ **Agravante:** `TenantCreateSerializer._create_initial_admin` (`apps/tenants/serializers.py:87`) pone `is_staff=True` a **todo** admin de tenant. Confirmado en la BD. Hoy no pueden editar por falta de permiso de modelo, pero están a un `user_permissions` de distancia — y `is_staff` es exactamente lo que se revisa para entrar.

## Puerta 2 — `PUT` + `multipart/form-data` apaga booleanos

En DRF 3.15.2, `BooleanField.default_empty_html = False` y `Field.get_value` lo aplica cuando el input es HTML y **no** es `partial`. Un `PUT` multipart que omita un booleano lo pone en `False` **en silencio**.

Verificado por el Planner:
```
PUT /api/tenants/{id}/  format=multipart  {nombre, nit, ciudad, correo}  →  200
tenant.activo → False
```
**Un superadmin editando el nombre de un negocio lo deja fuera de servicio**: sus endpoints en 403 y la página pública de login en `exists:false`. El único rastro es un `"activo": false` en la respuesta. Igual con `activo`/`lead_cashier` de usuarios.

No es alcanzable desde la UI (usa JSON + PATCH), pero la ruta existe y no hay nada que la cierre.

## Criterio de aceptación
1. No se puede crear ni dejar en la BD, **por ningún camino**, un CAJERO sin cédula ni un ADMIN sin correo.
2. Un `PUT` multipart que omita un booleano **no** lo apaga.
3. Los flujos que la app sí usa (PATCH JSON, creación por API) siguen funcionando igual.

## Notas para el Dev
Ideas, no imposiciones — elegí y justificá:
- **Puerta 1:** lo más barato es quitar `is_staff=True` de `_create_initial_admin` (un admin de tenant no tiene por qué entrar a `/admin/`) **y** agregar `cedula` a los fieldsets del `UserAdmin` **y** llamar `full_clean()`. Lo más sólido sería mover la regla al modelo (`clean()` + `CHECK` constraint), que cerraría **las dos puertas de una vez** — pero eso pide migración y hay que ver qué pasa con las filas existentes.
- **Puerta 2:** la app nunca usa PUT (`usersApi.ts` y `tenantsApi.ts` usan PATCH). Deshabilitar PUT en los `ModelViewSet` (`http_method_names`) mata la clase entera de bugs con una línea. Alternativa más quirúrgica: declarar los booleanos con `default=serializers.BooleanField(...)` explícito.
- ⚠️ **No rompas** lo entregado los 08-04/05: invariante del correo, política de password, guards de tenancy, agregación de stock, params, y los 4 fixes de 400 del front.
- Doble actualización: `el_vuelto_backend/CLAUDE.md`.
