---
tags: [tarea, sales, seguridad]
status: 🔴
prioridad: alta
updated: 2026-08-02
---

# SALES-20260802-guard-monto-recibido — Validar monto recibido ≥ total

**Tipo:** bug / seguridad · **Sprint:** [[Sprint-2026-08-02-estabilizacion-doc]]

## Problema
`SaleCreateSerializer.validate` (`apps/sales/serializers.py:67-76`) exige `monto_recibido` en EFECTIVO pero **no valida que sea ≥ `total`**. El API acepta una venta con cambio negativo; solo el front lo bloquea (`el_vuelto_frontend/src/features/sales/PosPage.tsx:275-278`). Ver [[patron-formato-cop]].

## Criterio de aceptación
Una venta EFECTIVO con `monto_recibido < total` responde **400** con error por campo. Las de NEQUI_TRANSFERENCIA no se afectan.

## Notas para el Dev
- El `total` se calcula en `create` (`serializers.py:118-121`), después de `validate`. Opción: mover el cálculo (o `_resolve_products` + suma) a `validate`, o añadir el chequeo al inicio de `create` antes de `Sale.objects.create`.
- Mantener `@transaction.atomic` y `select_for_update`.
- Doble actualización: reflejar la regla en el `CLAUDE.md` del backend (sección Serializers/SaleCreateSerializer).
