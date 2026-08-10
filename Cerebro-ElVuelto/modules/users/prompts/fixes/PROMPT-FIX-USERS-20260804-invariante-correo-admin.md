---
tags: [prompt, users, fix, backend, seguridad]
status: 🔴
module: users
updated: 2026-08-04
---

# Prompt DEV — Cerrar los dos caminos que nulifican el `correo` de un ADMIN

**Tareas backlog:** [[USERS-20260804-perfil-nulifica-correo-admin]] (🔒 alta) + [[USERS-20260802-patch-nulifica-campos]] (media)
**Sprint:** [[Sprint-2026-08-04-users-hardening]] · **Alcance:** UNA invariante, dos archivos del backend. No git. No tocar el front.

## La invariante que estás blindando

> Un `User` con `rol == ADMIN` **siempre** tiene `correo`; un `CAJERO` **siempre** tiene `cedula`.

El backend ya la exige al **crear** (`apps/users/serializers.py:171-174`) y el front ya la replica en el form de usuarios (Zod `superRefine`, `UsersPage.tsx:35-49`). Pero hay **dos caminos de escritura** que la evaden. Arreglar uno solo deja el hueco abierto: por eso van juntos.

`correo` es el `USERNAME_FIELD` (`apps/users/models.py:51`); un ADMIN sin correo **no puede volver a entrar**.

## Contexto a leer antes
- `el_vuelto_backend/CLAUDE.md` — sección de users/auth.
- Riesgos del cerebro: [[perfil-nulifica-correo-admin]] y [[patch-nulifica-campos-omitidos]].
- Regla dura aplicable: **validación divergente** (checklist #8) — el server no puede confiar en que el front valide.

---

## Parte A — `UpdateMeView` deja al ADMIN sin correo (🔒 lo grave)

**Archivo:** `el_vuelto_backend/apps/users/views.py:38-77`

Hoy:
```python
if "correo" in data:
    correo = data["correo"].strip() if data["correo"] else None   # :54  "" -> None
    if correo and User.objects.filter(correo=correo).exclude(pk=user.pk).exists():
        return Response({"correo": "Ya existe un usuario con este correo."}, status=400)
    user.correo = correo                                          # :60  sin mirar el rol
```
`ProfilePage.tsx:66` manda `correo: data.correo ?? ''` en **cada** guardado y `/profile` es ADMIN-only (`router.tsx:89,100`): borrar el campo y pulsar Guardar deja al admin fuera.

**Qué hacer:**
1. Si `user.rol == UserRole.ADMIN` y el `correo` resultante es vacío/`None` → responder **400** `{"correo": "El correo es obligatorio para administradores."}` (mensaje **literalmente igual** al de `serializers.py:174`; el front ya lo pinta vía `fieldError`, `ProfilePage.tsx:71`).
2. **Validar el formato** server-side antes de persistir. Hoy no hay `EmailField` ni `full_clean()`, así que `{"correo": "no-es-un-email"}` se guarda tal cual en un `EmailField unique`. Usa `django.core.validators.validate_email` (o un serializer) y devuelve 400 `{"correo": "Correo inválido."}`.
3. No cambies el flujo de `nombre` ni el de `new_password` (el mínimo de 6 se revisa en **otra** tarea: [[USERS-20260802-unificar-reglas-password]] — **no la toques aquí**).

## Parte B — `PATCH /users/{id}/` nulifica los campos omitidos

**Archivo:** `el_vuelto_backend/apps/users/serializers.py` (`UserCreateSerializer`)

`views.py:88-91` usa este serializer también para `partial_update`, y `validate()` termina con:
```python
data["correo"] = correo    # :192   incondicional
data["cedula"] = cedula    # :193   incondicional
```
Como un campo ausente se calcula `None` (`:168-169`), un `PATCH` que no mande `correo`/`cedula` **los borra**. `update()` (`:205-214`) los persiste con `setattr`. Hoy no explota **solo porque** `UsersPage` manda siempre el campo del rol activo — es una coincidencia del cliente, no un diseño.

**Qué hacer:**
1. Escribir `data["correo"]` / `data["cedula"]` **solo si la clave vino en el request** (`"correo" in self.initial_data`, o guardarse con `self.partial`). Si no vino, no la toques: `update()` no debe verla.
2. **Arreglar el rol por defecto — es lo que hace correcta la corrección anterior.** Línea `:167`:
   ```python
   rol = data.get("rol", UserRole.CAJERO)
   ```
   En un `PATCH` que no mande `rol`, esto asume **CAJERO** y en `:171-172` exige cédula → **400 espurio** `"La cédula es obligatoria para cajeros."` al renombrar a un ADMIN. Debe caer al rol de la instancia:
   ```python
   rol = data.get("rol", getattr(self.instance, "rol", UserRole.CAJERO))
   ```
3. Con (1) y (2) aplicados, verifica que la regla de `:171-174` **siga bloqueando** el caso real: un `PATCH` que mande `correo: ""` sobre un ADMIN debe seguir dando 400 (vaciar explícitamente ≠ omitir).

---

## Restricciones
- **Solo** `apps/users/views.py` y `apps/users/serializers.py`. Nada de front. Nada de migraciones (no cambias modelos).
- Stack inmutable. No cambies el contrato de la API (mismas rutas, mismas claves de error en **español**: `correo`, `cedula`).
- No rompas: creación de usuarios, PIN de 4 dígitos del cajero, `lead_cashier`, `reset_password`, `toggle_active`.
- **No** metas el `min 6` de password ni el hardening de `tenant=None` — son otras tareas del backlog.
- **Doble actualización:** en `el_vuelto_backend/CLAUDE.md` documenta que (a) `UpdateMeView` exige correo para ADMIN y valida formato, y (b) el `PATCH` de usuarios ya no nulifica campos omitidos.

## Entregable / verificación
Reporte con **salida real**, no descripción:
1. `python manage.py makemigrations --check --dry-run` → debe decir que **no hay cambios pendientes** (pega la salida).
2. Prueba manual contra el server (`DJANGO_SETTINGS_MODULE=elvuelto.settings.local python manage.py runserver`) o `python manage.py shell`, pegando request y respuesta de estos **5 casos**:

| # | Request | Esperado |
|---|---|---|
| 1 | `PATCH /api/auth/me/update/ {"correo": ""}` como **ADMIN** | 400 `{"correo": "El correo es obligatorio para administradores."}` |
| 2 | `PATCH /api/auth/me/update/ {"correo": "no-es-un-email"}` | 400, no persiste |
| 3 | `PATCH /api/auth/me/update/ {"nombre": "Nuevo"}` como ADMIN | 200, `correo` **intacto** |
| 4 | `PATCH /api/users/{id_admin}/ {"nombre": "Nuevo"}` | 200, `correo` y `cedula` **intactos** (era el bug) |
| 5 | `PATCH /api/users/{id_admin}/ {"correo": ""}` | 400 `{"correo": …}` (vaciar explícito sí se bloquea) |

3. Veredicto ✅ / 🔴 con la evidencia.

> [!warning] Si algo del prompt no cuadra con el código que ves
> Para. Reporta la discrepancia con `archivo:línea` en vez de improvisar. Las anclas de arriba se verificaron el 2026-08-04, pero el código es la verdad.
