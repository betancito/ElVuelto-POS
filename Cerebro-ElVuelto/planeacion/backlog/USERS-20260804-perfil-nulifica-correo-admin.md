---
tags: [tarea, users, bug, seguridad]
status: 🟢
prioridad: alta
updated: 2026-08-04
---

> [!done] Cerrado 2026-08-04 — ✅ [[RUN-20260804-invariante-correo-admin]]
> `UpdateMeView` rechaza con 400 el correo vacío cuando `rol == ADMIN` y valida el formato con `validate_email`, ambos **antes** de `user.save()` (`apps/users/views.py:54-74`). Verificado ejecutando: `PATCH {"correo":""}` → 400 y la BD queda intacta.

# USERS-20260804-perfil-nulifica-correo-admin — "Mi Perfil" puede dejar a un ADMIN sin login

**Tipo:** bug (pérdida de acceso) · **Descubierto:** PASO 0 del 2026-08-04 (crítico de completitud)

## Problema
`UpdateMeView` pone `user.correo = None` si el body trae `correo: ""`, sin mirar el rol (`apps/users/views.py:54,60`). `ProfilePage` manda ese campo en cada guardado (`ProfilePage.tsx:66`) y su Zod acepta la cadena vacía (`:15`). Como `correo` es `USERNAME_FIELD` (`models.py:51`) y `/profile` es ADMIN-only (`router.tsx:89,100`), el ADMIN que se borre el correo **queda fuera de la plataforma**. Detalle completo en [[perfil-nulifica-correo-admin]].

Además la vista no usa serializer ni `full_clean()`: acepta un correo con formato inválido en un `EmailField unique`.

## Criterio de aceptación
1. Un ADMIN **no puede** dejar su `correo` vacío por `PATCH /api/auth/me/update/` → 400 por campo `correo`.
2. Un correo con formato inválido → 400, no se persiste.
3. El PIN/flujo del CAJERO no se toca.

## Notas para el Dev
- Mensaje alineado con `serializers.py:174` ("El correo es obligatorio para administradores.").
- Doble actualización: `el_vuelto_backend/CLAUDE.md` (sección de auth/users).

→ Se entrega junto con [[USERS-20260802-patch-nulifica-campos]] en [[PROMPT-FIX-USERS-20260804-invariante-correo-admin]]: son los dos caminos de escritura de la misma invariante y arreglar uno solo deja el hueco abierto.
