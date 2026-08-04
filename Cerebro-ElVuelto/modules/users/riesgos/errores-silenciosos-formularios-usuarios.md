---
tags: [riesgo, users]
status: abierto
module: users
severidad: alta
updated: 2026-08-02
---

# Riesgo — Errores del servidor tragados al crear/editar usuario

**Resumen:** Los formularios de **crear** y **editar** usuario en `UsersPage` capturan la mutación con un `catch {}` vacío. Cualquier `400` con errores por campo del backend se descarta: el modal no muestra nada, el usuario cree que "no pasó nada".

## Evidencia (anclada)
- Crear: `el_vuelto_frontend/src/features/users/UsersPage.tsx:106-118` — `try { await createUser(payload).unwrap() ... } catch {}`
- Editar: `UsersPage.tsx:132-145` — `try { await updateUser(...).unwrap() ... } catch {}`
- El backend **sí** manda errores accionables por campo:
  - `cedula` obligatoria para cajero — `apps/users/serializers.py:170`
  - `correo` obligatorio para admin — `serializers.py:172`
  - `correo` ya existe (único global) — `serializers.py:182`
  - `cedula` duplicada en el tenant — `serializers.py:188`
  - rol SUPERADMIN prohibido — `serializers.py:158`

## Agravante: Zod no cubre estas reglas
El schema Zod marca `correo` y `cedula` como **opcionales** sin condicionar por rol (`UsersPage.tsx:37-38`). Entonces el front deja pasar (p.ej.) un ADMIN sin correo; el back responde 400; el `catch {}` lo traga ⇒ **cero feedback**. El botón vuelve a "Crear usuario" y el modal sigue abierto sin explicación.

## Escenario de fallo concreto
1. Admin abre "Nuevo usuario", elige rol ADMIN, deja correo vacío (Zod lo permite).
2. `createUser` → `POST /users/` → `400 {"correo": "El correo es obligatorio para administradores."}`.
3. `catch {}` descarta el error. No hay toast, no hay `setError`, el modal no se cierra.
4. El admin no entiende por qué "no se crea" el usuario.

Mismo patrón con correo/cédula **duplicados**: unicidad validada solo en el back (`serializers.py:177-188`), y el 400 nunca se muestra.

## Contraste
`ProfilePage` **sí** maneja bien el 400: `fieldError` (`ProfilePage.tsx:32-42`) extrae el mensaje por campo y lo pinta / hace `setError` (`:70-74,104-108`). Ese es el patrón a replicar en `UsersPage`.

## Mitigación propuesta (no se aplica aquí)
- Mapear el 400 a `setError` por campo en `onSubmit`/`onEditSubmit`, o mostrar toast/mensaje.
- Alinear Zod para exigir `correo` (ADMIN) / `cedula` (CAJERO) según rol, y así fallar antes de la red.
→ backlog. Ver P-2 en [[preguntas-users]] y [[formularios-users]].
