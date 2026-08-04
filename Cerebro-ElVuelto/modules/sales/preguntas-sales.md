---
tags: [modulo, preguntas]
status: vivo
module: sales
updated: 2026-08-02
---

# Sales — Preguntas abiertas

Append-only (GOBERNANZA §6). No reordenar. Cada P-N con evidencia, hipótesis, fallback e impacto.

---

P-1 [sales] ¿La ausencia del guard `monto_recibido >= total` en el backend es un olvido o intencional (se confía 100% en el front)?
   Evidencia: `serializers.py:67-76` solo valida que `monto_recibido` no sea `None`; `serializers.py:124-125` calcula `cambio = monto_recibido - total` sin piso → `cambio` negativo persistible. El front sí lo bloquea (`PosPage.tsx:277-278`).
   Mi hipótesis: olvido. El backend debería validar `monto_recibido >= total` para EFECTIVO, porque cualquier POST directo (o bug de front) crea ventas con vuelto negativo.
   Si no contestas: asumo que es un bug a corregir y lo dejo como riesgo alto en [[dinero-y-guard-monto]] con ❓.
   Impacto: alto

P-2 [sales] ¿El manejo de dinero debe ser entero (pesos sin centavos) en todo el flujo, o se esperan precios con decimales?
   Evidencia: `CashInputModal.tsx:37` usa `parseInt` (descarta centavos); `formatCOP` hace `Math.round`; pero `DecimalField(10,2)` en `Sale`/`SaleItem`/`Product` guarda 2 decimales.
   Mi hipótesis: en la práctica los precios COP son enteros, por eso el front asume enteros; los 2 decimales del modelo son por convención Django, casi siempre `.00`.
   Si no contestas: asumo enteros y marco la incoherencia float↔Decimal como riesgo medio en [[dinero-y-guard-monto]].
   Impacto: medio

P-3 [sales] ¿`GET /api/sales/{id}/` (retrieve) se usa en algún lado, o es código muerto? El docstring dice "receipt reprint" pero está protegido con `IsAdmin` y no encuentro consumidor del hook `getSale`.
   Evidencia: `views.py:20` docstring; `salesApi.ts:49-51` define `getSale`/`useGetSaleQuery` pero no aparece importado en las páginas de sales; la reimpresión usa objetos `Sale` ya en memoria (`SuccessModal`, `SalesHistoryPage`).
   Mi hipótesis: `getSale` es un endpoint reservado/futuro; hoy la reimpresión no lo necesita.
   Si no contestas: lo marco como endpoint disponible pero sin consumidor conocido (❓) en [[contratos-sales]].
   Impacto: bajo

P-4 [sales] La generación de `codigo` (7 chars) hace check-then-save sin lock; ¿hay manejo previsto para el `IntegrityError` en la colisión rara?
   Evidencia: `models.py:37-41` loop `filter(...).exists()` + `super().save()`; `unique=True` en BD. Sin `try/except IntegrityError`.
   Mi hipótesis: se acepta el riesgo (36^7 espacio) y una colisión sería un 500 esporádico, no se maneja a propósito.
   Si no contestas: lo dejo como nota de bajo riesgo en [[datos-sales]].
   Impacto: bajo

P-5 [sales] Los filtros `fecha_inicio`/`fecha_fin` del historial se comparan con `created_at__date` en la TZ del servidor (`America/Bogota`); ¿el front asume esa misma TZ al elegir la fecha con `<input type="date">`?
   Evidencia: `views.py:38-41` usa `__date__gte/lte`; `SalesHistoryPage.tsx:146-157` manda el string `YYYY-MM-DD` crudo. `USE_TZ`/`TIME_ZONE` = `America/Bogota` (CLAUDE.md).
   Mi hipótesis: coincide en la práctica porque los usuarios están en Colombia; una venta cerca de medianoche UTC podría caer en el día "equivocado" del filtro.
   Si no contestas: lo marco como riesgo de borde bajo y sigo.
   Impacto: bajo

P-6 [sales] `IsCajero` permite SUPERADMIN crear ventas, pero SUPERADMIN tiene `tenant=None`; ¿es un caso que deba bloquearse explícitamente?
   Evidencia: `users/permissions.py:26-34` incluye SUPERADMIN; `serializers.py:108-109` toma `request.tenant` (None para SA) → `_resolve_products` filtra `tenant=None` (sin productos) y `Sale.objects.create(tenant=None)` violaría el FK not-null.
   Mi hipótesis: caso no contemplado; en la práctica SUPERADMIN nunca abre el POS, así que nadie lo dispara.
   Si no contestas: lo documento como borde de bajo riesgo en [[tenant-filter-manual-y-superadmin]].
   Impacto: bajo
