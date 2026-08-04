---
tags: [modulo, preguntas]
status: vivo
module: users
updated: 2026-08-02
---

# Users — Preguntas abiertas (append-only)

> Formato GOBERNANZA §6. No se reordena. Cada P-N con su respuesta y fecha cuando llegue.

P-1 [users] ¿`DELETE /api/users/{id}/` (destroy del `ModelViewSet`) es intencional, o debería ser borrado lógico / estar deshabilitado?
   Evidencia: `views.py:80` (`ModelViewSet` sin override de `destroy`); `usersApi.ts` no tiene `deleteUser`; `Sale.user`/`InventoryMovement.user` son FK `PROTECT` (CLAUDE back).
   Mi hipótesis: quedó el `destroy` por defecto; el flujo real de "quitar acceso" es `toggle_active`, no borrar. Un delete de un cajero con ventas daría `ProtectedError`/500.
   Si no contestas: asumo que no debe usarse y lo marco ❓ en [[contratos-users]].
   Impacto: medio

P-2 [users] ¿El backend de este scope llega a devolver `non_field_errors`, o siempre errores por campo `{campo:"msg"}`?
   Evidencia: `UserCreateSerializer.validate` lanza `ValidationError({campo:...})` (`ser:170,172,182,188`); `UpdateMeView` responde `{campo:msg}` (`views.py:48-72`). `fieldError` (`ProfilePage:32-42`) solo lee por campo.
   Mi hipótesis: en este scope todo es por-campo; `non_field_errors` no aparece. Igual conviene confirmarlo para el manejo de errores.
   Si no contestas: asumo solo por-campo y lo marco ❓.
   Impacto: bajo

P-3 [users] ¿Cuál es la política de contraseñas? Hoy conviven: crear admin front = 12 chars, reset admin back = 10 chars, mínimo aceptado al crear = 4 (`ser:148`), mínimo al cambiar en perfil = 6 (`views.py:70`).
   Evidencia: `utils/generatePassword.ts:11-22` (12), `serializers.py:216-228` (10 / 4 dígitos cajero), `views.py:70` (6).
   Mi hipótesis: no hay política unificada; cada punto se implementó por separado. → riesgo [[reglas-password-divergentes]].
   Si no contestas: documento las cuatro reglas tal cual y marco la divergencia como abierta.
   Impacto: medio

P-4 [users] ¿Un ADMIN puede desactivar / restablecer contraseña de otro ADMIN o de sí mismo? No hay auto-exclusión.
   Evidencia: `toggle_active` y `reset_password` solo exigen `IsAdmin` (`views.py:93,100`); `get_queryset` filtra por tenant pero no excluye al propio usuario.
   Mi hipótesis: permitido a propósito (negocio pequeño, admins de confianza). Riesgo de auto-lockout si un admin se desactiva.
   Si no contestas: asumo permitido y solo lo anoto como observación.
   Impacto: bajo

P-5 [users] ¿`cedula` debe validarse como numérica y/o con longitud mínima? Hoy se acepta cualquier string ≤20.
   Evidencia: Zod `cedula: z.string().optional()` sin reglas (`UsersPage:38`); serializer solo `max_length=20` (`ser:150`); BD `CharField(20)`.
   Mi hipótesis: se asume cédula colombiana numérica pero no se valida; puede entrar basura.
   Si no contestas: asumo "cualquier string" y marco ❓ en [[formularios-users]].
   Impacto: bajo

P-6 [users] Un `PATCH /users/{id}/` que **omita** `correo` o `cedula`, ¿debe conservarlos o nulificarlos? Hoy los nulifica.
   Evidencia: `UserCreateSerializer.validate` siempre asigna `data["correo"]`/`data["cedula"]` (`ser:190-191`), incluso en `partial_update`; `update` los persiste (`ser:205-208`).
   Mi hipótesis: efecto colateral no intencional; hoy no rompe porque `UsersPage` siempre manda el campo del rol activo. Cualquier otro cliente que haga un PATCH parcial los borraría. → riesgo [[patch-nulifica-campos-omitidos]].
   Si no contestas: asumo que es bug latente y lo dejo como riesgo abierto.
   Impacto: medio

## Respuestas del owner (2026-08-02)
> [!decision] P-3 — RESUELTA: el **PIN de 4 dígitos del cajero es intencional** (pantalla táctil sin teclado; mantenerlo simple). No se aplana la política: se deja **coherente por rol** (cajero = PIN 4 dígitos; admin = contraseña fuerte) y se documenta. Ver [[USERS-20260802-unificar-reglas-password]]. (P-1, P-2, P-4, P-5, P-6 siguen abiertas.)
