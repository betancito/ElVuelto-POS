---
tags: [corrida, sales, review, dinero, seguridad]
status: cerrado
updated: 2026-08-03
---

# RUN 2026-08-03 — PROMPT-FIX-SALES-…-guard-monto-recibido

**Prompt:** [[PROMPT-FIX-SALES-20260803-guard-monto-recibido]] · **Veredicto:** 🟢 PASÓ · **Ítem:** [[SALES-20260802-guard-monto-recibido]] → cerrado · **Riesgo:** [[dinero-y-guard-monto]] parte A → resuelta (parte B float sigue abierta)

## Qué hizo el Dev (git diff, working tree)
- `apps/sales/serializers.py` (`create()`, tras el cálculo de `total` en `:121`, antes de `cambio`): guard nuevo
  ```python
  if (metodo_pago == PaymentMethod.EFECTIVO
      and monto_recibido is not None
      and monto_recibido < total):
      raise serializers.ValidationError(
          {"monto_recibido": f"El monto recibido ({monto_recibido}) es menor que el total ({total})."})
  ```
- `el_vuelto_backend/CLAUDE.md` (Serializers→SaleCreateSerializer) actualizado con la regla `>= total` y el porqué de ubicarlo en `create()`.

## Review del Planner (código real + ejecución real)
- ✅ Ubicación correcta: después del `total` server-side (`:118-121`), antes de `cambio`/`Sale.objects.create` → al lanzar, `@transaction.atomic` revierte los locks sin persistir.
- ✅ Solo EFECTIVO; NEQUI_TRANSFERENCIA intacto. Comparación `Decimal < Decimal` (sin floats). `total` sigue recalculado server-side (no del request).
- ✅ La vista (`views.py:63`) hace `serializer.save()` sin try/except → DRF lo vuelve **400 por campo**.
- ✅ Solo tocó `sales/serializers.py` + backend `CLAUDE.md`. Sin scope creep. Sin git.

## Verificación ejecutada por el Planner (shell, producto temporal en tx con rollback)
- `makemigrations --check --dry-run` → **"No changes detected"**.
- Insuficiente (1.00 < 5000): `ValidationError {'monto_recibido': 'El monto recibido (1.00) es menor que el total (5000.00).'}` ✅
- Exacto (5000 == 5000): venta OK, `cambio=0.00` ✅
- Sobra (6000 > 5000): venta OK, `cambio=1000.00` ✅
- NEQUI sin `monto_recibido`: venta OK, no afectada por el guard ✅
- Rollback total: nada persistido en la BD dev.

## Deuda residual (NO cubierta aquí)
- Parte B del riesgo ([[dinero-y-guard-monto]]): dinero como float en el front (`PosPage.tsx`, `CashInputModal`) — descuadre potencial de centavos. Sigue 🔴.
- Surface del 400 `monto_recibido` (y errores de items) en el POS → parte del ítem [[FRONT-20260802-errores-400-silenciados]] (aún 🟡).

**Veredicto: 🟢 corrido-ok.**
