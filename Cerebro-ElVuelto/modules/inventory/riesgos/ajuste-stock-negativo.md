---
tags: [modulo, riesgo]
status: abierto
module: inventory
severity: medio
updated: 2026-08-02
---

# Riesgo — AJUSTE puede dejar stock_actual negativo

**Ancla:** `el_vuelto_backend/apps/inventory/serializers.py:59-65`

## Qué pasa
Al crear un movimiento, el serializer actualiza el stock sin piso:
```
Product.objects.filter(pk=movement.product_id).update(
    stock_actual=F("stock_actual") + movement.cantidad
)
```
Para `AJUSTE`, la única validación es `cantidad != 0` (`serializers.py:46-49`). Un `AJUSTE` con `cantidad` negativa mayor al stock disponible deja `Product.stock_actual` en **negativo**. Ejemplo: stock 10 + `AJUSTE -30` → `stock_actual = -20`.

## Por qué no lo atrapa nada
- **Modelo/BD:** `stock_actual = IntegerField(default=0)` (`products/models.py:45`), sin check `>= 0`, sin `PositiveIntegerField`.
- **Serializer:** no compara `cantidad` contra `stock_actual` (a diferencia de la venta).
- **Front:** el input de `AJUSTE` permite negativos (`min` se quita para `AJUSTE`, `InventoryPage.tsx:358`) y de hecho la ayuda dice "Negativo para retirar" (`:366`).

## Contraste con ventas
La creación de venta SÍ valida stock con `select_for_update()` antes de decrementar (ver [[sales--inventory]], `sales/serializers.py`). El ajuste manual **no** tiene esa red.

## Impacto
- KPIs de valor de stock (`InventoryPage.tsx:617-620`) y `bajo_minimo` se calculan sobre un stock corrupto.
- Un stock negativo puede propagarse a reportes y a la validación de ventas futuras.
- Severidad **media**: requiere que un ADMIN registre un ajuste incoherente, pero nada lo impide.

## Sugerencia (backlog)
Validar en el serializer que `stock_actual + cantidad >= 0` para `AJUSTE` (con lectura bajo `select_for_update` para evitar carrera), o hacer `stock_actual` un `PositiveIntegerField` con manejo del error.

Relacionado: [[preguntas-inventory]] P-5 · [[products--inventory]].
