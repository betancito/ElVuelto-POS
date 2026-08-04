---
tags: [indice, conexiones]
status: activo
updated: 2026-08-02
---

# 00-conexiones — Índice de contratos entre módulos

Índice delgado, append-only. Un contrato = un archivo.

- [[sales--inventory]] — la venta descuenta stock (atómico, `SALIDA_VENTA` system-only).
- [[sales--reports]] — reports recomputa desde `Sale`/`SaleItem`.
- [[tenants--users--auth]] — el eje multi-tenant: FK tenant, JWT, unicidad, login por cédula.
- [[products--inventory]] — `stock_actual` como fuente de verdad; solo `CON_CODIGO`.
- [[products--sales]] — `SaleItem` referencia (PROTECT) + snapshot de nombre; precio autoritativo del server.
- [[reports--tenants]] — el export usa nombre/logo del negocio; 500 si `tenant` None.
