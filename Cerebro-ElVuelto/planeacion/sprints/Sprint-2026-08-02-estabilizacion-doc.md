---
tags: [sprint]
status: activo
updated: 2026-08-02
---

# Sprint 2026-08-02 — Estabilización + documentación

**Épica:** [[EPIC-20260802-estabilizacion]]
**Objetivo (1 frase):** dejar el cerebro base construido y cerrar los 4 arreglos prioritarios + la seguridad de login de cajero.

## Alcance
| ítem | tipo | estado | notas |
|---|---|---|---|
| Construir cerebro (Fases 1–2) | doc | 🟡 | módulos vía workflow |
| [[SALES-20260802-guard-monto-recibido]] | bug/seguridad | 🔴 | guard backend |
| [[FRONT-20260802-borrar-codigo-muerto]] | limpieza | 🔴 | shims muertos |
| [[BACKEND-20260802-limpiar-deps]] | limpieza | 🔴 | cloudinary dup + escpos |
| [[FRONT-20260802-cerrar-ruta-test]] | seguridad | 🔴 | /test/color-bends |
| [[AUTH-20260802-exigir-tenant-id-login-cajero]] | seguridad | 🟢 | exigir tenant_id |
| [[PRODUCTS-20260802-viewsets-sin-permiso]] | 🔒 seguridad | 🟢 | escalada cerrada (fix + fix de categorías) |
| [[TENANCY-20260802-creacion-tenant-atomica]] | bug | 🟢 | 500 + tenant huérfano (descubierto en auditoría) |

## Fuera de alcance
Correcciones de doc (siguiente sprint), RLS, tests.

## Cierre (al terminar)
_(pendiente)_
