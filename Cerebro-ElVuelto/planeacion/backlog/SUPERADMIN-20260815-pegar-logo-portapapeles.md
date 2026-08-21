---
tags: [tarea, feature, super-admin, tenancy, frontend]
status: 🟢
prioridad: feature
updated: 2026-08-15
---

# SUPERADMIN-20260815-pegar-logo-portapapeles — pegar el logo con ⌘V / Ctrl+V

**Tipo:** feature · **Pedido:** directo del owner en el chat el 2026-08-15 ("integra dentro del modal de
creación de tenant una funcionalidad que me permita hacer command+v o control v para pegar una imagen,
que dé las dos opciones: upload y pegar") · **Estado:** 🟢 implementada y verificada ·
**Decisión:** [[ADR-TENANCY-20260815-pegar-logo-portapapeles]] · **Corrida:** [[RUN-20260815-pegar-logo-portapapeles]]

## Qué se pidió
Que el logo del negocio se pueda poner de **dos** formas en el modal de creación: eligiendo archivo
(lo que ya había) **o** pegando una imagen del portapapeles.

## Qué se entregó
Las dos formas, en el modal de **crear** y también en el de **editar** — comparten el mismo componente
`TenantLogoField`, dejar uno sin el gesto habría sido incoherente. El pegado entrega el mismo
`LogoDraft` que el file-picker, con la misma validación (`validateImageFile`) y la misma subida
diferida: pegar no sube nada, se aplica al guardar y "Cancelar" lo descarta.

Alcance real: **2 archivos de frontend**, cero backend, cero migraciones.

## Estado de la verificación
✅ typecheck y build limpios · ✅ el contrato completo (crear negocio en JSON → subir logo multipart →
`logo_url`) verificado contra servidor real, con limpieza que dejó la base en 0 negocios · ✅ el espejo
de mensajes cliente↔backend confirmado verbatim en los dos casos de rechazo · ✅ revisión adversarial de
19 agentes, 1 arreglo propio aplicado (`toast.success` al pegar).

⚠️ **Pendiente:** el ⌘V real del sistema operativo no se pudo ejecutar (sin extensión de Chrome, sin
navegador headless, y no se instaló nada en el proyecto para conseguirlo). El gesto necesita que el
owner lo confirme a ojo. Detalle en [[RUN-20260815-pegar-logo-portapapeles]].

## Deuda que dejó registrada
- [[FRONT-20260815-productspage-paste-sin-validar-y-en-form]] — el patrón viejo de `ProductsPage`.
- [[FRONT-20260815-logo-field-nombre-accesible]] — nombre accesible preexistente del control.
