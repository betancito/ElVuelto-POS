---
tags: [riesgo, users, auth, perdida-de-acceso]
status: abierto
module: users
severidad: alta
updated: 2026-08-04
---

# 🔒 Riesgo ALTA — "Mi Perfil" deja a un ADMIN sin correo y por lo tanto sin login

**Resumen:** `UpdateMeView` escribe `user.correo = None` cuando el cliente manda `correo: ""`, **sin ninguna regla por rol**. Como `correo` es el `USERNAME_FIELD` y el login de ADMIN es solo por correo, un ADMIN que borre ese campo en su perfil y pulse *Guardar* **pierde el acceso a la plataforma**. El front lo alimenta en cada guardado.

Descubierto en el PASO 0 del 2026-08-04 (crítico de completitud): es el **segundo camino de escritura** sobre `User`, el que nadie había auditado.

## Evidencia (anclada, verificada a mano)

| # | Qué | Dónde |
|---|---|---|
| 1 | `correo = data["correo"].strip() if data["correo"] else None` → `""` se vuelve `None` | `apps/users/views.py:54` |
| 2 | `user.correo = correo` — **sin mirar `user.rol`** | `apps/users/views.py:60` |
| 3 | `user.save()` se ejecuta siempre | `apps/users/views.py:76` |
| 4 | `USERNAME_FIELD = "correo"` | `apps/users/models.py:51` |
| 5 | El Zod del perfil **acepta explícitamente** la cadena vacía: `.or(z.literal(''))` | `ProfilePage.tsx:15` |
| 6 | El submit manda `correo` en **cada** guardado: `correo: data.correo ?? ''` | `ProfilePage.tsx:66` |
| 7 | `/profile` está bajo `ProtectedRoute allowedRoles={['ADMIN']}` | `router.tsx:89,100` |

## Por qué es ALTA (y no media)

1. **La única población que puede alcanzar la pantalla es exactamente la que se rompe.** `/profile` es ADMIN-only (#7), y `correo` es la única credencial de un ADMIN — no tiene por qué tener cédula.
2. **No requiere mala intención ni un cliente raro.** Es la UI oficial: borrar el campo y pulsar Guardar. El form ni siquiera advierte.
3. **Rompe por detrás la misma invariante que el sprint blinda por delante.** `UserCreateSerializer.validate` exige ADMIN→correo (`serializers.py:173-174`) y el Zod de `UsersPage` ya lo replica (ver [[RUN-20260804-zod-requeridos-por-rol]]). `UpdateMeView` no pasa por ninguno de los dos.
4. **La recuperación no es trivial:** `reset_password` (`views.py:101`) devuelve una contraseña nueva, pero sin `correo` no hay con qué identificarse. Otro ADMIN del mismo tenant puede repararlo por `PATCH /users/{id}/`; **si el tenant tiene un solo ADMIN, no hay salida desde la app** — solo BD, `/admin/` de Django o el superadmin.

## Defecto acompañante (misma vista, misma causa raíz)

`UpdateMeView` **no usa serializer**: valida a mano y nunca llama a `full_clean()`. No hay `EmailField`, así que `PATCH /api/auth/me/update/ {"correo": "no-es-un-email"}` **persiste basura** en un campo `EmailField unique`. La validación de formato existe **solo** en el Zod del front (`ProfilePage.tsx:15`) — el mismo patrón "validación solo en el front" que este sprint está corrigiendo. (`apps/users/views.py:41-77`)

## Mitigación propuesta (la aplica el Dev)
- En `UpdateMeView`, rechazar con 400 el correo vacío **cuando `user.rol == ADMIN`** (mensaje alineado con `serializers.py:174`).
- Validar formato de correo server-side (`EmailField`/serializer/`full_clean`), no confiar en el Zod.
- En `ProfilePage`, no mandar `correo` si el usuario no lo tocó, o marcarlo requerido para ADMIN en el Zod.

→ [[USERS-20260804-perfil-nulifica-correo-admin]] · relacionado: [[patch-nulifica-campos-omitidos]] (mismo bug de nulificación, el **otro** camino de escritura).
