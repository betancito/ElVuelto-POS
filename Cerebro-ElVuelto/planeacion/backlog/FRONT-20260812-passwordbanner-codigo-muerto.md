---
tags: [tarea, frontend, codigo-muerto, superadmin]
status: 🔴
prioridad: baja
updated: 2026-08-12
---

# FRONT-20260812-passwordbanner-codigo-muerto — `PasswordBanner` no lo importa nadie

**Tipo:** limpieza · **Encontrado en:** investigación previa a
[[ADR-TENANCY-20260812-logo-tenant-modales-crear-editar]] (agente Explore sobre el frontend).

## El problema
`src/features/super-admin/tenants/components/PasswordBanner.tsx` (25 líneas) y su
`PasswordBanner.module.css` son **código muerto**: `grep -rn "PasswordBanner" src/` solo encuentra
referencias dentro de los propios archivos. Lo reemplazó `components/ui/CredentialsModal.tsx`, que es
lo que `index.tsx` usa hoy para mostrar la contraseña inicial del admin.

En la misma corrida sí se borró el otro resto del mismo tipo (el bloque `.logoUpload*` de
`TenantsPage.module.css`, 66 líneas), porque ese archivo se estaba tocando de todas formas.
`PasswordBanner` no se tocó para no ampliar el alcance.

## Criterio de aceptación
Los dos archivos borrados y `npm run build` limpio. Confirmar antes con
`grep -rn "PasswordBanner" src/` que sigue sin usarse.

## Nota
Es el mismo tipo de deuda que [[FRONT-20260802-borrar-codigo-muerto]], ya cerrado — esta es una que
quedó afuera.
