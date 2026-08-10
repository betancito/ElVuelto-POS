---
tags: [corrida, users, fix, backend, seguridad]
status: 🟢 corrido-ok
module: users
updated: 2026-08-04
---

# RUN 2026-08-04 — Invariante "ADMIN siempre tiene correo" (users)

**Prompt:** [[PROMPT-FIX-USERS-20260804-invariante-correo-admin]]
**Tareas:** [[USERS-20260804-perfil-nulifica-correo-admin]] (🔒 alta) + [[USERS-20260802-patch-nulifica-campos]] (media)
**Sprint:** [[Sprint-2026-08-04-users-hardening]] · **Veredicto:** ✅ PASÓ

> [!info] Cómo se revisó
> El Dev no adjuntó salida de comandos, así que **el Planner ejecutó la verificación**: `makemigrations --check` + los 5 casos del criterio de aceptación + **9 casos adversariales** propios, contra el código real, con la BD de dev y `transaction.set_rollback(True)` (la BD quedó intacta). **14/14 en verde.**

## Diff entregado
`apps/users/serializers.py` (+29/-4) · `apps/users/views.py` (+21/-3) · `el_vuelto_backend/CLAUDE.md` (+34/-6). Nada más tocado.

## Parte A — `UpdateMeView` (`apps/users/views.py:54-74`)
- Guard por rol **antes** de cualquier escritura: `if user.rol == UserRole.ADMIN and not correo` → 400 con el mensaje **literal** de `serializers.py:174`. ✅
- Formato validado server-side con `django.core.validators.validate_email` → 400 `{"correo": "Correo inválido."}`. ✅
- La verificación de unicidad se movió dentro del `if correo:` — correcto: con `correo=None` no hay unicidad que comprobar. ✅
- Ambos guards corren antes de `user.save()`, así que un request rechazado **no persiste nada** (tampoco el `nombre`). Verificado en los casos 1 y 2.

## Parte B — `UserCreateSerializer.validate` (`apps/users/serializers.py:166-214`)
- `correo_sent`/`cedula_sent` desde `self.initial_data`; una clave ausente **cae al valor de la instancia** en vez de calcularse `None`. ✅
- Write-back condicional: si no vino, `data.pop(...)` para que `update()` nunca la vea. ✅
- **Rol por defecto arreglado:** `data.get("rol", getattr(instance, "rol", UserRole.CAJERO))`. ✅
- Decisión de diseño acertada: la regla por rol se evalúa sobre el **estado resultante** del usuario, no sobre el payload a medias. Por eso el caso E (promover CAJERO→ADMIN sin correo) queda bloqueado — un efecto correcto que el prompt no había pedido explícitamente.

## Verificación ejecutada por el Planner

`python manage.py makemigrations --check --dry-run` → `No changes detected` · **EXIT=0**

**Criterio de aceptación (5/5):**
| # | Caso | Resultado |
|---|---|---|
| 1 | `PATCH me {"correo":""}` como ADMIN | **400** `{'correo': 'El correo es obligatorio para administradores.'}` · BD intacta |
| 2 | `PATCH me {"correo":"no-es-un-email"}` | **400** `{'correo': 'Correo inválido.'}` · BD intacta |
| 3 | `PATCH me {"nombre":"Nuevo"}` como ADMIN | **200** · `correo` intacto |
| 4 | `PATCH /users/{admin} {"nombre":"Renombrado"}` | **200** · `correo` y `cedula` intactos ← **era el bug** |
| 5 | `PATCH /users/{admin} {"correo":""}` | **400** · vaciar ≠ omitir |

**Adversariales del Planner (9/9), buscando regresión:**
| # | Caso | Resultado |
|---|---|---|
| A | POST crear CAJERO válido | **201** — no rompió la creación |
| B | POST crear ADMIN sin correo | **400** correo |
| C | POST crear CAJERO sin cédula | **400** cedula |
| D | PATCH cajero `{"nombre":…}` | **200** · `cedula` NO se borró |
| E | PATCH promover CAJERO→ADMIN sin correo | **400** correo |
| F | PATCH `correo` a uno ya existente | **400** unicidad (el fallback no genera falso positivo contra sí mismo) |
| G | PATCH `cedula` a una ya existente en el tenant | **400** unicidad |
| H | PATCH cajero `{"lead_cashier":true}` | **200** · `cedula` intacta |
| I | PATCH admin `{"correo": null}` explícito | **400** — null se trata como vaciado explícito ✅ |

## Checklist de trampas (INIT-AGENTS)
- **#1 tenancy:** ✅ `get_queryset` y el filtro por `request.tenant` de la unicidad de cédula quedaron intactos; sin fuga nueva.
- **#4 permisos:** ✅ `IsAdmin` en `UserViewSet` sin cambios.
- **#5 naming es↔en:** ✅ claves `correo`/`cedula` y mensajes en español.
- **#7 errores 400:** ✅ 400 **por campo**, que es lo que `fieldError` (`ProfilePage.tsx:104-107`) y `applyServerErrors` mapean.
- **#9 migraciones:** ✅ `No changes detected`.
- **#10 doble actualización:** ✅ `backend/CLAUDE.md` documenta las tres cosas (invariante en `/auth/me/update/`, PATCH que ya no nulifica, `rol` por instancia).
- **#11 sin git / sin scope creep:** ✅ solo los 3 archivos. **Correctamente NO tocó** las dos frases falsas de `CLAUDE.md` — son [[DOCS-20260804-claudemd-garantia-falsa]], otra tarea.

## Residual que deja (no bloquea el ✅)
- 🟡 **Divergencia nueva front↔back:** el Zod de `ProfilePage` sigue aceptando `''` para `correo` (`ProfilePage.tsx:15`), así que un ADMIN puede enviar y comerse un 400 evitable. El error **sí se ve** (`fieldError` en `:104-107`), o sea no es silencioso — es solo un round-trip de más. Es el mismo patrón que cerró [[USERS-20260802-zod-requeridos-por-rol]], pero en la otra pantalla. → registrado en [[USERS-20260804-error-400-campo-no-montado]].
- 🟡 `apps/users/views.py:55` sigue haciendo `data["correo"].strip()` sin comprobar que sea string: `{"correo": 123}` da `AttributeError` → 500. Preexistente y fuera del alcance de este prompt; entra en el ítem de hardening de params.
