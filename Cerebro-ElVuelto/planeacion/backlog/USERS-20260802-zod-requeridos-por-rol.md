---
tags: [tarea, users, forms]
status: 🔴
prioridad: alta
updated: 2026-08-02
---

# USERS-20260802-zod-requeridos-por-rol — Zod no condiciona requeridos por rol

**Tipo:** divergencia de validación · **Descubierto:** auditoría de módulos 2026-08-02

## Problema
El backend exige por rol: CAJERO → `cedula`, ADMIN → `correo` (`apps/users/serializers.py:169-172`). Pero el Zod del front marca ambos **opcionales sin condicionar por rol** (`features/users/UsersPage.tsx:37-38`). El front deja enviar un cajero sin cédula (o admin sin correo) y el backend responde 400 — que además hoy se **traga** (ver [[FRONT-20260802-errores-400-silenciados]]).

## Criterio de aceptación
El schema Zod condiciona `cedula`/`correo` según `rol` (replica la regla del serializer); el form bloquea antes de enviar.

## Notas para el Dev
- `z.discriminatedUnion('rol', ...)` o `superRefine` sobre `rol`.
- Doble actualización: `frontend/CLAUDE.md` (o `CLAUDE_FORMS.md`).
