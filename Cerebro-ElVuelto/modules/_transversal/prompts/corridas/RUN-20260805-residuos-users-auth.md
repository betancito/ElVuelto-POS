---
tags: [corrida, backend, users, auth, seguridad]
status: 🟢 corrido-ok
module: _transversal
updated: 2026-08-05
---

# 🔒 RUN 2026-08-05 — Los tres residuos de users/auth

**Prompt:** [[PROMPT-FIX-BACKEND-20260805-residuos-users-auth]] · **Tarea:** [[BACKEND-20260805-cerrar-residuos-users-auth]]
**Veredicto:** ✅ PASÓ — **11/11**, verificado ejecutando.

## Diff entregado
`apps/users/views.py` + `apps/users/migrations/0005_clear_is_staff_on_tenant_admins.py`. Nada más. Migración **ya aplicada** (`showmigrations` → `[X]`), `makemigrations --check` → `No changes detected`.

## 1. La migración de datos
Bien hecha en los detalles que importan: usa `apps.get_model("users","User")` (modelo histórico, no el actual), **literal `"ADMIN"` en vez de importar `UserRole`** — con el comentario de por qué: una migración no debe depender del estado actual del módulo del modelo —, `reverse_code=noop` justificado ("volver a darle acceso de plataforma a los admins de tenant nunca es a lo que querés revertir"), e imprime cuántas filas tocó.

## 2 y 3. `UpdateMeView` — generalizó el guard en vez de parchar el rol
Le pedí que lo pensara como *"si este usuario no tiene otra credencial de login, no lo dejes sin correo"* en vez de una lista de roles que haya que ir ampliando. Lo implementó así:

```python
correo = (data["correo"] or "").strip() or None       # normaliza PRIMERO
if not correo:
    if user.rol in (UserRole.ADMIN, UserRole.SUPERADMIN):   # (a) invariante por rol
        return 400 …
    if not (user.cedula and user.tenant_id):                # (b) no tiene otra vía de login
        return 400 "No puedes quedarte sin correo: es tu única forma de iniciar sesión."
```

La rama (b) es la que no le pedí y es la correcta: cubre a cualquier usuario futuro que no tenga `cedula` + `tenant_id`, sin depender de enumerar roles. Y normalizar antes de decidir resuelve el punto 3 de paso.

## Verificación (11/11)

| # | Caso | Resultado |
|---|---|---|
| 1 | `PATCH /me/update/ {"correo":""}` **SUPERADMIN** | **400**, correo intacto |
| 2 | `{"correo":"   "}` **ADMIN** | **400**, no guarda `""` |
| 3 | `{"correo":"   "}` **CAJERO** | **200**, en BD queda **`None`** (no `''`) |
| 4 | 2º CAJERO hace lo mismo | **200**, **sin `IntegrityError`** |
| 5 | `ADMIN` con `is_staff=True` tras migrar | **0** |
| 6 | `SUPERADMIN` con `is_staff=True` | **2** (no se tocaron) |
| 7 | ADMIN pone un correo nuevo válido | **200** |
| 8 | ADMIN cambia solo el nombre | **200**, correo intacto |
| 9 | `/admin/` crear CAJERO sin cédula | **rechazado** |
| 10 | `PUT /api/users/{id}/` multipart | **405** |
| 11 | `POST /api/sales/` CAJERO | **201** |

> [!warning] Un falso 🔴 mío en el caso 8
> Primero dio **400** y parecía regresión. Era **mi input**: mandé `{"nombre":"X"}`, un solo carácter, contra la regla preexistente de mínimo 2. Repetido con un nombre válido → **200** con el correo intacto. Segunda vez en esta sesión que mi arnés produce un falso negativo (la anterior fueron los `initkwargs` del `@action`): **cuando un caso de regresión falla, sospechar primero del arnés.**

## Checklist de trampas
**#1 tenancy** ✅ intacto · **#4 permisos** ✅ `is_staff` es el cambio buscado; SUPERADMIN conserva el suyo · **#5 naming** ✅ mensajes en español · **#9 migraciones** ✅ una, de datos, aplicada y verificada · **#10 doble actualización** ✅ · **#11** ✅ sin git, sin front.

## Estado de la invariante
Con esto, *"un usuario nunca queda sin forma de iniciar sesión"* está cubierta en las **cuatro** superficies: Zod del front, `UserCreateSerializer` (create + PATCH), `UpdateMeView` y `User.clean()` (formularios, incluido `/admin/`). La única vía que queda por fuera es un `.save()` pelado desde un comando o el shell — documentado y aceptado.
