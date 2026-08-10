---
tags: [tarea, users, auth, seguridad, password]
status: 🟢
prioridad: alta
updated: 2026-08-09
---

> [!info] Cerrada 2026-08-09
> Criterio de aceptación cumplido y **verificado ejecutando** el escenario completo (rotación al subir de rol, sin rotar al bajar, sin rotar en un PATCH que no toca `rol`) — ver [[RUN-20260806-promocion-no-rota-credencial]]. La revisión encontró un problema **relacionado pero distinto**: el front nunca muestra la contraseña rotada. Eso se registró aparte, sin bloquear este cierre: [[USERS-20260809-promocion-no-muestra-password-rotado]].

# 🔒 USERS-20260805-promocion-no-rota-credencial — Promover un cajero a ADMIN le deja el PIN de 4 dígitos

**Tipo:** seguridad · **Triado desde** [[auditoria-adversarial-20260805]] · **Verificado por el Planner ejecutando**

## El problema
`UserCreateSerializer.validate` solo evalúa la política de password **sobre la contraseña que viene en el request**. Un `PATCH` que cambia `rol` y no manda `password` no valida nada, y `update()` solo llama a `set_password` si llegó una. Resultado: el rol sube a ADMIN y el hash sigue siendo el del PIN de 4 dígitos.

Verificado:
```
control: POST crear ADMIN con password "1234"        → 400 (la política de 12 existe)
PATCH cajero → {"rol":"ADMIN", "correo":"..."}       → 200
   rol: ADMIN | cedula: 'PR1' | check_password("1234"): True
   login PÚBLICO de cajero con cédula + PIN "1234"   → OK, y el token dice rol: ADMIN
```

## Por qué es alta
1. **Es el flujo normal de la UI, no una llamada rebuscada.** El modal de edición de `UsersPage` tiene los radio cards de rol y su submit manda `rol` + `correo` y **nunca** `password` — no hay campo de contraseña ahí. El admin abre "editar", cambia a Admin, escribe un correo, guarda, y ya tiene un ADMIN con PIN.
2. **El PIN es un secreto de baja calidad *por diseño*** — se teclea en público, es shoulder-surfeable. El propio `CLAUDE.md` lo justifica asumiendo que solo protege al CAJERO. Al promover sin rotar, ese secreto pasa a proteger el rol más alto del tenant: cualquier excompañero que vio el PIN entra como ADMIN.
3. **La credencial vieja sirve por los dos caminos.** El PATCH no borra la `cedula`, así que el promovido sigue entrando por `/api/auth/login/cashier/` — el endpoint público que [[AUTH-20260805-sin-throttling-en-login]] documenta como el de menor barrera. Antes reventar ese espacio daba un token de CAJERO; ahora puede dar uno de **ADMIN**.
4. **Bypass silencioso de una política que sí existe:** el mismo estado final que un POST rechaza con 400 se alcanza con un PATCH que devuelve 200.

## Criterio de aceptación
Un cambio de rol que suba el mínimo de contraseña **no puede dejar la credencial vieja en uso**. Al terminar la operación, el usuario tiene una contraseña que cumple la política de su rol nuevo.

## Notas para el Dev
- El punto natural de arreglo es `UserCreateSerializer.validate`: comparar el **rol resultante** contra el **rol almacenado** y actuar cuando el mínimo sube.
- Hay dos caminos válidos, **elegí y justificá**: (a) exigir `password` en ese PATCH (400 si no viene), o (b) rotarla automáticamente y devolverla como hace `reset_password`. La (b) es mejor UX pero cambia el contrato de la respuesta; la (a) obliga a tocar el modal del front.
- `reset_password` ya genera según el rol — puede reusarse.
- Doble actualización: `el_vuelto_backend/CLAUDE.md` (Password policy).
