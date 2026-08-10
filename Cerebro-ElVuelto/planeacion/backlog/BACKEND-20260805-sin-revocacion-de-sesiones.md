---
tags: [tarea, backend, auth, seguridad]
status: 🟢
prioridad: alta
updated: 2026-08-09
---

> [!info] Cerrada 2026-08-09
> [[ADR-G-20260809-revocacion-check-revoke-token]] implementada y verificada con requests HTTP reales de punta a punta: token viejo tras un reset → 401; refresh viejo → 401; sesión no afectada sigue funcionando; costo medido = **cero queries extra** (`CaptureQueriesContext`, 3 vs 3). Ver [[RUN-20260809-check-revoke-token]].

# 🔒 BACKEND-20260805-sin-revocacion-de-sesiones — Restablecer la contraseña no echa a nadie

**Tipo:** seguridad · **Descubierto:** [[auditoria-adversarial-20260805]] · **Verificado por el Planner ejecutando**

## Problema
El sistema **no tiene revocación de sesiones**. `reset_password` cambia el hash pero no invalida ningún token ya emitido.

Verificado de punta a punta:
```
1. admin resetea el PIN del cajero                  → 200 {"new_password": "1663"}
2. el PIN viejo ya no sirve para logins nuevos      → True
3. token ROBADO (previo al reset) POST /api/sales/  → 201  ← VENTA CREADA
```

`SIMPLE_JWT` (`settings/base.py`): `ROTATE_REFRESH_TOKENS=False`, `BLACKLIST_AFTER_ROTATION=False`, sin la app `token_blacklist`, sin `CHECK_REVOKE_TOKEN`, y **no hay endpoint de logout** (el logout es solo del cliente).

## Por qué importa
El caso de uso real de `reset_password` en un POS es *"se fue un empleado"* o *"alguien vio el PIN"*. Hoy ese botón **es un placebo**: corta los logins nuevos y deja la sesión existente vendiendo durante **8 horas de access + 7 días de refresh**.

Lo único que sí corta es `toggle_active` (con el usuario desactivado el access token da 401) — pero eso apaga al empleado, no rota su credencial.

> [!decision] Decisión del owner 2026-08-09 — [[ADR-G-20260809-revocacion-check-revoke-token]]
> Se activa `CHECK_REVOKE_TOKEN`. Se descarta blacklist por ahora. Condición: medir el costo real en el POS antes de cerrarlo. Prompt: se escribe en la próxima ronda (después del fix de slug, que es el que rompe un flujo real hoy).

> [!info] Actualización 2026-08-09 — la ventana de exposición ya se acotó
> Lo de `/api/auth/refresh/` de este párrafo **ya se cerró** ([[RUN-20260805-desactivar-de-punta-a-punta]]): un `refresh` ahora sí valida `is_active`. Esto no es revocación (el `reset_password` de este ítem sigue sin invalidar nada), pero acota el riesgo: un token robado sirve como máximo hasta que expira el **access** (≤8h) — ya no se puede extender indefinidamente vía `refresh`. La decisión pendiente del owner sobre `CHECK_REVOKE_TOKEN` es ahora "¿aceptamos hasta 8h de exposición tras un reset/robo?", no "¿aceptamos exposición indefinida?".

## Criterio de aceptación
Después de un `reset_password`, los tokens emitidos **antes** dejan de servir: `POST /api/sales/` con el token viejo responde **401**, no 201.

## Notas para el Dev
- La vía más barata es `SIMPLE_JWT["CHECK_REVOKE_TOKEN"] = True`: simplejwt guarda un hash del password en el claim y lo compara contra la BD en cada request, así que cambiar la contraseña invalida los tokens **sin** necesitar blacklist ni migraciones. **Verificá el costo**: agrega una query por request.
- Alternativa: instalar `token_blacklist` + `ROTATE_REFRESH_TOKENS` + un endpoint de logout real. Más completo, pide migración.
- ⚠️ Sea cual sea, **medí el impacto en el POS**: es la pantalla que más requests hace.
- Mientras tanto, en el `CLAUDE.md` decí la verdad: hoy `reset_password` **no** cierra sesiones.
- Doble actualización: `el_vuelto_backend/CLAUDE.md` (Authentication) + [[patron-jwt-refresh]].
