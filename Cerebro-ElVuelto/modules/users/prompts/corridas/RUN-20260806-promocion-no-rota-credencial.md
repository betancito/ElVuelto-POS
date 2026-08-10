---
tags: [corrida, users, seguridad, password]
status: ⛔ parcial
module: users
updated: 2026-08-09
---

# RUN 2026-08-09 — Promoción no rota credencial (review en frío)

**Prompt:** [[PROMPT-FIX-USERS-20260805-promocion-no-rota-credencial]]
**Tarea:** [[USERS-20260805-promocion-no-rota-credencial]]
**Veredicto:** ⛔ **PARCIAL** — backend correcto y verificado ejecutando; front deja el resultado invisible.

> [!warning] Trampa del registro otra vez
> El registro (`00-registro-users.md`) tenía esta fila en 🔴 "escrito (pendiente)". El código ya estaba implementado — `mtime` de `serializers.py` es 2026-08-06 00:06, muy posterior a la sesión que escribió el prompt (2026-08-05). El registro se desfasó del disco una vez más (ver la advertencia en [[00-INDEX]]).

## Backend — verificado EJECUTANDO (no solo leyendo)

Corrí el escenario completo en `manage.py shell` contra la BD de dev, dentro de `transaction.atomic()` con rollback:

```
control check_password('1234') antes                        → True
PATCH {rol: ADMIN, correo: ...} sin password (CAJERO→ADMIN)  → is_valid, new_password='d&U5O3nWe7Oh'
check_password('1234') después de la promoción               → False
check_password(new_password) después                         → True
PATCH {rol: CAJERO} sobre el ADMIN recién creado (democión)   → password SIN cambios (hash idéntico)
PATCH {nombre: 'Renamed'} sin tocar rol                       → password SIN cambios (hash idéntico)
ROLLED BACK OK
```

`makemigrations --check --dry-run` → sin cambios.

Eligió la opción **(b)** del prompt (rotar automáticamente vía `generate_password(rol_nuevo)`, devuelta en `new_password`). Implementación en `UserCreateSerializer.validate`/`update` (`apps/users/serializers.py:222-231,299-317`): compara `min_length_for(rol_nuevo) > min_length_for(rol_viejo)`, solo rota cuando sube y no vino `password` explícita. `el_vuelto_backend/CLAUDE.md` documenta el comportamiento con precisión (sección "Password policy — per role"). Doble actualización del backend: ✅.

## El hallazgo: el front nunca lee `new_password` en la promoción

El prompt eligió (b) pero la restricción decía *"Solo `apps/users/serializers.py` (+ front únicamente si elegís (a))"* — así que el Dev, correctamente según esa restricción, no tocó el front. El problema es que **(b) sin front es un usuario bloqueado silenciosamente**:

- `UsersPage.tsx:158-175` (`onEditSubmit`) llama `await updateUser({...}).unwrap()` y **descarta el resultado** — solo hace `setEditUser(null)`. Nunca mira si vino `new_password`.
- `usersApi.ts` — la interfaz `User` (líneas 3-11) **no declara** `new_password`, y `updateUser` tipa su respuesta como `User` a secas.
- Comparar con `handleReset` (mismo archivo, líneas 177-201): esa acción sí abre `UserCredentialsModal` con la contraseña nueva. La promoción por el modal de edición — **el flujo normal que el propio backlog documenta** ("el modal de edición... nunca manda password") — no tiene el mismo tratamiento.
- Confirmado con `mtime`: `UsersPage.tsx` quedó en 2026-08-05 20:35, **antes** de que existiera la rotación (2026-08-06 00:06). El front de este flujo no fue tocado por ningún prompt.

**Consecuencia real:** un admin promueve un cajero desde el modal de edición → el backend genera y guarda una contraseña de 12 caracteres aleatoria (vía `secrets`) → la devuelve en el body de la respuesta → **el front la tira**. Ni el admin que promovió ni el usuario promovido tienen forma de saber cuál es. La cuenta queda inaccesible hasta que alguien note el problema y corra "restablecer contraseña" por separado — y nada en la UI avisa que hace falta.

## Por qué esto sí bloquea la señal de cierre

[[CRITERIO-CIERRE-ESTABILIZACION]] excluye de scope-creep salvo **"🔒 alta con impacto en dinero, acceso o pérdida de datos"**. Esto es impacto en **acceso**: una promoción legítima, hecha por el flujo normal de la UI, deja una cuenta sin contraseña conocida. Se registra como hallazgo nuevo y se avisa — no se sigue auditando proactivamente más allá de esto.

## Checklist de trampas aplicado
- **#3 tags RTK**: no aplica (no se tocaron tags).
- **#7 errores 400**: no aplica — esto no es un 400, es una respuesta 200 cuyo campo extra se ignora.
- **#10 doble actualización**: backend ✅ (`CLAUDE.md` backend). Front pendiente — se documentará en su `CLAUDE.md` cuando corra el fix.

## Decisión
- La tarea original [[USERS-20260805-promocion-no-rota-credencial]] se cierra 🟢 — su criterio de aceptación (la credencial vieja deja de servir, la nueva cumple la política) está cumplido y verificado.
- Se abre [[USERS-20260809-promocion-no-muestra-password-rotado]] (🔒 alta, impacto acceso) con su propio prompt: [[PROMPT-FIX-USERS-20260809-mostrar-password-rotado-en-edicion]].
