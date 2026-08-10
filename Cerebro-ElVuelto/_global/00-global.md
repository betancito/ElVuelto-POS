---
tags: [indice, global]
status: activo
updated: 2026-08-02
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

## Riesgos (transversales)
- [[riesgo-tenancy-sin-red-de-seguridad]] — sin red de seguridad en la BD.
- [[riesgo-ruta-test-sin-guard]] — `/test/color-bends` pública en prod.
- [[riesgo-deps-duplicadas-y-escpos]] — `cloudinary` duplicado + `python-escpos` muerto.

(Riesgos específicos de un módulo viven en `modules/<mod>/riesgos/`.)
