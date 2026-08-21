---
tags: [indice, global]
status: activo
updated: 2026-08-15
---

# 00-global — Índice de lo transversal

Índice delgado. Append-only: agrega al final de cada sección, no reordenes.

## Patrones (cross-cutting)
- [[patron-tenancy]] — aislamiento de tenants (la verdad real).
- [[patron-permisos-roles]] — roles y `permission_classes`.
- [[patron-jwt-refresh]] — tokens, 3 logins, reauth del front.
- [[patron-errores-drf-rtk]] — forma del 400 y mapeo a formularios.
- [[patron-formato-cop]] — dinero, Decimal y precisión.
- [[patron-cloudinary]] — subida de imágenes (2 pasos).
- [[patron-impresion-recibos]] — recibos = frontend (no escpos).
- [[patron-diseno-ta]] — sistema `ta-*` y shell de layout.

## Decisiones (ADR)
- [[ADR-G-20260802-tenancy-isolation]] — filtrado manual hoy, RLS como meta.
- [[ADR-G-20260802-modelo-de-acceso-por-rol]] — cajero solo-lectura catálogo; superadmin solo plataforma (datos vía impersonación).
- [[ADR-TENANCY-20260802-correo-admin-unico-global]] — correo único global + creación de tenant atómica (ADR del módulo tenancy).
- [[ADR-TENANCY-20260809-slug-persistido]] — slug del tenant persistido y único en BD, no recalculado (ADR del módulo tenancy).
- [[ADR-G-20260809-revocacion-check-revoke-token]] — `CHECK_REVOKE_TOKEN` para que cambiar contraseña revoque tokens ya emitidos.
- [[ADR-G-20260809-superadmin-acceso-tenant-scoped]] — SUPERADMIN accede a un tenant elegido vía endpoints dedicados (users/reset/metrics), no impersonación completa.
- [[ADR-G-20260809-compresion-estandar-cloudinary]] — las 3 subidas a Cloudinary (producto, categoría, logo) se comprimen/redimensionan al subir, vía un helper compartido. Solo subidas nuevas.
- [[ADR-G-20260811-docs-swagger-key-gate]] — `/docs/`, `/redoc/`, `/api/schema/` gateados por `DOCS_API_KEY` (falla cerrado); no otorga acceso a endpoints de negocio reales.
- [[ADR-TENANCY-20260812-logo-tenant-superadmin-ui]] — UI para subir el logo del tenant solo en `TenantDetailPage` (no en el modal de crear/editar); backend y hook ya existían. ⚠️ **su punto 1 quedó superado** por el ADR de abajo.
- [[ADR-TENANCY-20260812-logo-tenant-modales-crear-editar]] — el logo también en los modales de crear/editar, con subida **diferida** (se aplica al guardar) y endpoint nuevo `DELETE /tenants/{id}/logo/`; el create sigue en JSON para no disparar la trampa de booleanos en multipart.
- [[ADR-TENANCY-20260815-pegar-logo-portapapeles]] — segundo camino de entrada al mismo `LogoDraft`: pegar con ⌘V/Ctrl+V. Listener en `document` (no en el `<form>`, que no dispara sin foco previo) + regla imagen-vs-texto para no robarle el paste a quien escribe + `toast.success` obligatorio porque el pegado se come la tecla.
- [[ADR-SALES-20260816-stock-negativo-permitido]] — una venta **nunca** se rechaza por falta de stock: el negativo es la deuda de una ENTRADA pendiente. Arrastra: guard de inventario **direccional**, `stock_actual` sin piso pero **read-only** (y `update()` con `update_fields`), y señal propia "en negativo" separada de "bajo mínimo".
- [[ADR-AUTH-20260816-teclado-numerico-staff-login]] — keypad numérico propio en `/login/<slug>` (POS táctil). Abre con `pointerdown`+`click` (nunca `focus`), cierra con cualquier `keydown`, `inputMode` de dos vías porque los lectores HID emiten keydown, PIN de llenado izquierda→derecha, y la página reserva el alto **medido** del panel.

## Riesgos (transversales)
- [[riesgo-tenancy-sin-red-de-seguridad]] — sin red de seguridad en la BD.
- [[riesgo-ruta-test-sin-guard]] — `/test/color-bends` pública en prod.
- [[riesgo-deps-duplicadas-y-escpos]] — `cloudinary` duplicado + `python-escpos` muerto.

(Riesgos específicos de un módulo viven en `modules/<mod>/riesgos/`.)
