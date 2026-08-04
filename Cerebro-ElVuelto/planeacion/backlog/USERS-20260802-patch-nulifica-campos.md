---
tags: [tarea, users, bug]
status: 🔴
prioridad: media
updated: 2026-08-02
---

# USERS-20260802-patch-nulifica-campos — PATCH parcial nulifica correo/cedula omitidos

**Tipo:** bug (pérdida de datos latente) · **Descubierto:** auditoría de módulos 2026-08-02

## Problema
`UserCreateSerializer.validate` **siempre** escribe `data["correo"]` y `data["cedula"]` (None si no vienen) (`apps/users/serializers.py:190-191`). En un `PATCH` parcial, omitir uno de esos campos lo **nulifica**. Hoy no rompe **solo porque** el form manda el campo del rol activo (`features/users/UsersPage.tsx:139-140`), pero es frágil: cualquier otro cliente que haga PATCH parcial pierde datos.

## Criterio de aceptación
Un PATCH que no envía `correo`/`cedula` no los borra.

## Notas para el Dev
- En `validate`, escribir esos campos solo si vinieron (`self.initial_data`/`self.partial`).
- Doble actualización: `backend/CLAUDE.md` (Serializers).
