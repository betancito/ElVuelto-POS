---
tags: [riesgo, users]
status: abierto
module: users
severidad: media
updated: 2026-08-02
---

# Riesgo — PATCH parcial nulifica `correo`/`cedula` omitidos

**Resumen:** `UserCreateSerializer.validate` **siempre** escribe `data["correo"]` y `data["cedula"]` en el `validated_data`, aun cuando el request no los incluya (`partial_update`). Como el valor calculado para un campo ausente es `None`, un `PATCH` parcial que omita `correo` o `cedula` los **borra** en la BD.

## Evidencia (anclada)
- `apps/users/serializers.py:166-167` — `correo = (data.get("correo") or "").strip() or None` → si no vino, `None`.
- `apps/users/serializers.py:190-191` — `data["correo"] = correo` / `data["cedula"] = cedula` (incondicional, corre también en `partial_update`).
- `apps/users/serializers.py:203-212` — `update` recorre `validated_data` y persiste esos `None` en la instancia.
- Sirve a `PATCH /users/{id}/` (`views.py:88-91` selecciona `UserCreateSerializer` para `partial_update`).

## Por qué hoy no explota
`UsersPage.onEditSubmit` (`UsersPage.tsx:132-145`) siempre manda el campo del **rol activo**: para ADMIN manda `correo` (y `cedula` como `undefined`), para CAJERO manda `cedula`. Es decir, el campo que se nulifica es justamente el que **no** aplica a ese rol (un admin no tiene cédula, un cajero no tiene correo). El efecto coincide con lo deseado **por casualidad del cliente**, no por diseño del serializer.

## Escenario de fallo concreto
Cualquier cliente distinto de este form (script, futura pantalla, integración) que haga `PATCH /users/{id}/ {"nombre": "Nuevo Nombre"}` para renombrar:
- `validate` calcula `correo=None`, `cedula=None` (no vinieron) y los escribe.
- `update` guarda ⇒ el usuario pierde su `correo` y/o `cedula` ⇒ un ADMIN queda **sin login** (correo es su `USERNAME_FIELD`).

## Mitigación propuesta (no se aplica aquí)
- En `validate`, escribir `data["correo"]`/`data["cedula"]` **solo si la clave está presente** en `self.initial_data` (o usar `self.partial`).
- O separar un serializer de update que no reprocese campos ausentes.
→ backlog. Ver P-6 en [[preguntas-users]].
