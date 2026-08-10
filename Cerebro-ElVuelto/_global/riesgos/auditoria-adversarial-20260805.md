---
tags: [riesgo, global, auditoria, seguridad]
status: abierto
severidad: alta
updated: 2026-08-05
---

# Auditoría adversarial 2026-08-05 — qué sobrevive de lo entregado

Nueve atacantes intentaron **romper** cada invariante entregada los 2026-08-04/05, más un crítico que re-verificó los hallazgos dudosos. 10 agentes, 0 errores. No fue una verificación de "está bien": fue un intento sistemático de encontrar el contraejemplo.

## Resultado de fondo

> **Los fixes de estos dos días resisten los ataques por su propia superficie.** Ningún atacante logró romper un invariante por el camino que el fix cubre. Lo que encontraron son **puertas laterales que ningún prompt había mirado**.

Ejemplos: el guard de correo/ADMIN aguantó `""`, `null`, `"   "`, PUT, cambio de rol en el mismo request y hasta un TOCTOU — pero se rompe por el **sitio de Django**. `_resolve_products` aguantó duplicados, alias de UUID, cantidades gigantes e incluso **dos ventas concurrentes reales** (el `select_for_update` bloqueó al segundo hilo 1,12 s) — pero el stock se puede dejar negativo por **inventory**.

**La lección de proceso:** blindar un serializer no blinda el dato. Mientras exista un camino que escriba el modelo sin pasar por él, la invariante es una convención, no una garantía. La red que falta está **en el modelo y en la BD**: `correo` y `cedula` son `null=True/blank=True`, nadie llama `full_clean()` y no hay ningún `CHECK` constraint.

---

## 🔒 Verificados por el Planner a mano

### 1. El sitio de Django evade **todos** los serializers
`/admin/` está montado (`elvuelto/urls.py`) y `UserAdmin.add_fieldsets` es `['correo','nombre','tenant','rol','password1','password2']` — **sin `cedula`**. Consecuencias verificadas ejecutando:
- Crear un CAJERO desde `/admin/` produce un cajero **sin cédula**, que **nunca** podrá entrar al POS. Y es imposible hacerlo bien: el campo no está en el formulario.
- Vaciar el `correo` de un ADMIN → queda sin `USERNAME_FIELD` (lockout). El mismo payload por API da 400.
- Cambiar rol ADMIN→CAJERO → cajero sin cédula.

⚠️ **Agravante:** `TenantCreateSerializer._create_initial_admin` pone `is_staff=True` a **todo** admin de tenant (`apps/tenants/serializers.py:87`). Confirmado en la BD: hay ADMIN de tenant con `is_staff=True`. Hoy el change page les da 403 por falta de permiso de modelo — están **a un `user_permissions` de distancia** de poder hacer todo lo anterior.
→ [[BACKEND-20260805-escrituras-que-evaden-serializers]]

### 2. `PUT` + `multipart` apaga booleanos ausentes — y en tenants, el negocio entero
En DRF 3.15.2, `BooleanField.default_empty_html = False` y `Field.get_value` lo aplica cuando el input es HTML y **no** es `partial`. Verificado por mí:
```
PUT /api/tenants/{id}/  format=multipart  {nombre, nit, ciudad, correo}  →  200
tenant.activo quedó en: False
```
Un superadmin editando el **nombre** de un negocio desde un formulario lo deja **fuera de servicio**: sus 12 endpoints en 403 y la página pública de login en `exists:false`. El único rastro es un `"activo": false` en la respuesta. Lo mismo con `activo`/`lead_cashier` de usuarios (el cajero queda desactivado y su login devuelve 401).
No es alcanzable desde la UI actual (usa JSON y PATCH), pero la ruta existe.
→ [[BACKEND-20260805-escrituras-que-evaden-serializers]]

### 3. `reset_password` no revoca nada — es un placebo contra una sesión robada
Verificado por mí de punta a punta:
```
1. admin resetea el PIN del cajero        → 200 {"new_password": "1663"}
2. el PIN viejo ya no sirve para logins    → True
3. token ROBADO (previo al reset) POST /api/sales/ → 201  ← VENTA CREADA
```
`SIMPLE_JWT` tiene `ROTATE_REFRESH_TOKENS=False`, `BLACKLIST_AFTER_ROTATION=False`, sin `token_blacklist` instalada, sin `CHECK_REVOKE_TOKEN` y **sin endpoint de logout**. El único botón que la UI ofrece para "me robaron el PIN" corta los logins nuevos y deja la sesión viva **8 h de access + 7 días de refresh**. Lo único que sí funciona es `toggle_active` — pero eso apaga al empleado, no rota su credencial.
→ [[BACKEND-20260805-sin-revocacion-de-sesiones]]

### 4. El entorno de dev reproduce el bug del slug
"Panadería La Esperanza": el backend resuelve `panadera-la-esperanza`, la URL que copia el admin coincide, pero el POS al cerrar turno redirige a `panaderia-la-esperanza` → **"Sucursal no encontrada"**. Ver [[RUN-20260805-seed-cajero-y-3-docs]]. Sube la urgencia de [[TENANCY-20260804-slug-tres-implementaciones]] y le da evidencia concreta a la **P-1**.

---

## ✅ TRIAJE COMPLETO (2026-08-05) — ya no queda ningún ❓

Los 10 hallazgos de abajo fueron triados. **Resultado: 5 ya estaban arreglados** por los fixes posteriores (precio negativo, stock por inventory, refresh, `UpdateMeView`, fuerza bruta del PIN), y **5 se confirmaron** con la gravedad recalibrada:

| Hallazgo | Veredicto | Gravedad real | Destino |
|---|---|---|---|
| Promover CAJERO→ADMIN deja el PIN de 4 dígitos | CONFIRMADO | **alta** (era alta) | [[USERS-20260805-promocion-no-rota-credencial]] |
| Colisión de slug en el endpoint público | CONFIRMADO | **media** (era alta) — falla cerrada: sin bypass ni fuga | se suma a [[TENANCY-20260804-slug-tres-implementaciones]] |
| Params UUID → 500 | CONFIRMADO | media — solo 2 de los 5 casos reportados | [[BACKEND-20260805-residuos-del-triaje]] |
| `applyServerErrors` `surfaced=true` | CONFIRMADO | **baja** — el caso que lo motivó ya está cerrado | ídem |
| `esc()` del recibo | CONFIRMADO | **baja** — bomba desactivada, sin vía de explotación hoy | ídem |

**Detalle nuevo sobre la colisión de slug, peor que lo reportado:** el ganador **no es estable**. Un `UPDATE` de rutina sobre un tenant (editar la ciudad desde el panel) movió su fila en el heap y **el ganador cambió sin tocar ningún nombre**. O sea: el negocio que hoy funciona puede perder el login de todos sus cajeros mañana por un `UPDATE`, un `VACUUM` o un cambio de plan de Postgres. Y dar de alta un cliente con nombre colisionante puede tumbar el login de un cliente ya en producción.

---

## Reportados por los atacantes (registro original, ya triado arriba)

| Gravedad | Hallazgo | Ancla |
|---|---|---|
| ❓ alta | **Colisión de slug en el endpoint público**: dos tenants cuyo nombre colapsa al mismo slug ("Mini Market"/"Mini-Market") → el endpoint devuelve la identidad del **otro** negocio (nombre y logo), y el perdedor queda sin login de cajeros de forma permanente. El bucle no tiene `order_by`, así que cuál gana es indefinido | `apps/tenants/views.py:16-46`; `nombre` sin `unique` |
| ❓ alta | **Cadena sin autenticación**: el slug público filtra el `tenant_id` (UUID) → con eso y una cédula (que no es secreta) se puede fuerza-bruta el PIN de 4 dígitos. Medido: ~9 req/s, sin un solo 429; **10.000 PINs en ~18 min con un hilo**. No hay `DEFAULT_THROTTLE_*` ni django-axes/ratelimit | `apps/tenants/views.py:20-46` + `apps/users/views.py:28` + `settings/base.py:93-102` |
| ❓ alta | **Promover CAJERO→ADMIN deja un ADMIN con PIN de 4 dígitos**: el `PATCH {"rol":"ADMIN"}` no revalida la contraseña existente contra la política del nuevo rol | `apps/users/serializers.py` |
| ❓ alta | **`precio_venta` negativo**: el modelo no tiene validador, el guard de `monto_recibido` se cumple y el servidor ordena entregar un cambio enorme | `apps/products/models.py:41` |
| ❓ media | **`/api/auth/refresh/` nunca valida al usuario**: un usuario desactivado sigue obteniendo access tokens nuevos. Y por eso el auto-logout del front es código muerto — `dispatch(logout())` solo corre si el refresh **falla**, y nunca falla | `settings/base.py:104` + `apiBase.ts:20-40` |
| ❓ media | **Stock negativo por inventory**: `_resolve_products` aguantó todo, pero un `AJUSTE` con cantidad negativa deja el stock bajo cero | `apps/inventory/` |
| ❓ media | **4 formas más de sacar un 500 con query params**: `?product=<no-uuid>` y `?user=<no-uuid>` no pasan por `date_params.py` | `apps/inventory/views.py:50`, `apps/sales/views.py:42` |
| ❓ media | **`applyServerErrors` marca `surfaced=true` para cualquier clave** del cuerpo 400, incluso una que ningún span renderiza → sigue habiendo formas de tragarse un error | `applyServerErrors.ts` |
| ❓ media | **`UpdateMeView` deja al SUPERADMIN borrarse el correo** (el guard solo compara con `UserRole.ADMIN`) y guarda `""` en vez de `NULL` con espacios → colisión en la columna `unique` → `IntegrityError` 500 | `apps/users/views.py:59-61` |
| ❓ baja | **`esc()` del recibo no escapa comillas** y `logoUrl` se interpola dentro de un atributo HTML. Hoy no explotable (la URL viene de Cloudinary), pero queda latente | `generateReceipt.ts:53,68` |

## Superficie que **nadie** atacó
Backend: Cloudinary (`upload_logo`/`upload_image` sin validar tipo/tamaño y sin `try/except` → 500), exports de reports sin tope de filas, `TenantViewSet` CRUD completo, el sitio `/admin/` más allá de users, paginación.
Frontend: **casi todo** — impresión de recibos, `downloadCredentials.ts` (368 líneas que materializan contraseñas en claro), `ProtectedRoute`/`GuestRoute`, `apiBase.ts` (carrera de refresh sin mutex), `store.ts` + redux-persist (JWT en `sessionStorage`), `posSlice`, y todo `super-admin/`.
