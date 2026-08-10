---
tags: [prompt, users, fix, forms]
status: 🔴
updated: 2026-08-04
---

# Prompt DEV — Zod condiciona cedula/correo por rol en el form de usuarios

**Tarea backlog:** [[USERS-20260802-zod-requeridos-por-rol]] · **Sprint:** [[Sprint-2026-08-04-users-hardening]]
**Alcance:** UNA cosa — que el Zod bloquee client-side lo que el backend ya exige por rol. Solo `UsersPage.tsx`. No git.

## Contexto
El backend exige por rol (`apps/users/serializers.py`): **CAJERO → `cedula`**, **ADMIN → `correo`** (mensajes: "La cédula es obligatoria para cajeros." / equivalente para correo). El front NO lo condiciona: `schema` (`UsersPage.tsx:35-41`) y `editSchema` (`:43-49`) dejan `correo` y `cedula` `.optional()` sin mirar `rol`. Se puede enviar un cajero sin cédula → 400 del server (round-trip evitable).

## Qué hacer (pasos)
1. Añadir un `.superRefine(...)` a **ambos** schemas (`schema` y `editSchema`) que replique la regla del serializer:
   ```ts
   .superRefine((data, ctx) => {
     if (data.rol === 'CAJERO' && !data.cedula?.trim()) {
       ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['cedula'],
         message: 'La cédula es obligatoria para cajeros.' })
     }
     if (data.rol === 'ADMIN' && !data.correo?.trim()) {
       ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['correo'],
         message: 'El correo es obligatorio para administradores.' })
     }
   })
   ```
   (Mantén los mensajes alineados con los del backend para consistencia.)
2. Confirmar que los campos `cedula` y `correo` renderizan su error (`{errors.cedula && …}` / `{errors.correo && …}`) — si a alguno le falta el `<span>`, agrégalo (como se hizo en products), para que el error del `superRefine` sea visible.
3. (Opcional) `schema` y `editSchema` son idénticos; si quieres, deja uno y reúsalo — no es obligatorio.

## Restricciones
- Solo `UsersPage.tsx`. Stack inmutable. No cambies el contrato de la API ni el backend.
- No rompas `lead_cashier` ni el flujo de password (fuera de alcance).
- **Doble actualización:** en `el_vuelto_frontend/CLAUDE.md` anotar que el form de usuarios valida `cedula`/`correo` condicionado por `rol` (Zod `superRefine`, espejo del serializer).

## Entregable / verificación
- `npm run typecheck` → limpio (pegar salida).
- Prueba manual (si levantas el front): rol=CAJERO sin cédula → el form **bloquea** con error bajo `cedula` (sin llamar al server). rol=ADMIN sin correo → error bajo `correo`.
- Veredicto ✅ / 🔴.
