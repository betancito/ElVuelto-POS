---
tags: [conexion, sales, reports]
status: vivo
updated: 2026-08-02
---

# Conexión — sales ↔ reports

## Contrato: reports recomputa desde Sale/SaleItem
`apps/reports/` **no tiene modelos ni serializers**: cada `APIView` lee `Sale`/`SaleItem` directamente y agrega en tiempo real (`reports/views.py`). No duplica la lógica de venta, pero **recomputa** los agregados (totales, por hora, por día, top productos).

## Puntos de acoplamiento (frágiles, sin tests)
- Usa `PaymentMethod.EFECTIVO` / `NEQUI_TRANSFERENCIA` (`reports/views.py:45-46`) → si cambian los choices en `sales/models.py:10-12`, los porcentajes se rompen en silencio.
- Usa `SaleItem.product_nombre` (snapshot) para top-productos (`reports/views.py:200`), no el FK → los reportes sobreviven a renombres de producto.
- Filtra tenant a mano en cada vista (`reports/views.py:26,72,124,135`) → depende de [[patron-tenancy]].

## Drift de documentación
Los CLAUDE.md documentan 3 endpoints de reports; el código tiene **5** (`ventas-por-dia`, `sales-detail` añadidos). Ver [[DOCS-20260802-corregir-claudemd-drift]].

## Enlaces
[[patron-formato-cop]]
