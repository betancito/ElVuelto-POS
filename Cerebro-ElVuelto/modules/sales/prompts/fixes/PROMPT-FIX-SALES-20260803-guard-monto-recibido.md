---
tags: [prompt, sales, fix, dinero, seguridad]
status: 🔴
updated: 2026-08-03
---

# Prompt DEV — Guard `monto_recibido >= total` en la creación de venta (backend)

**Tarea backlog:** [[SALES-20260802-guard-monto-recibido]] · **Riesgo:** [[dinero-y-guard-monto]] (parte A)
**Alcance:** UNA cosa — rechazar en el backend una venta EFECTIVO con pago insuficiente. Solo backend. No git. No editar el cerebro.

## Contexto mínimo necesario
- Leer: `el_vuelto_backend/CLAUDE.md` (sección **Serializers → SaleCreateSerializer** y **Sales**), `apps/sales/serializers.py` completo, `apps/sales/views.py:60-65`.
- **Regla dura — DINERO:** montos = `Decimal` en el back; el servidor **recalcula** el `total` (no confía en el front); debe existir el guard `monto_recibido >= total`. Ver [[patron-formato-cop]].

## El bug (anclado)
- `SaleCreateSerializer.validate` (`serializers.py:67-76`) solo exige que `monto_recibido` no sea `None` en EFECTIVO. **No hay piso contra `total`.**
- `create()` (`serializers.py:123-125`): `cambio = monto_recibido - total` sin chequeo → si `monto_recibido < total`, `cambio` queda **negativo** y se persiste con **201**. Un `POST /api/sales/` directo cobra de menos sin error.
- Hoy solo lo bloquea el front (`features/sales/PosPage.tsx:277-278`), que es esquivable.

## Qué hacer (pasos)
1. En `apps/sales/serializers.py`, dentro de `create()`, **justo después** de calcular el `total` (después de `serializers.py:121`) y **antes** de calcular `cambio` (`:123`), añadir el guard:
   ```python
   if metodo_pago == PaymentMethod.EFECTIVO and monto_recibido is not None and monto_recibido < total:
       raise serializers.ValidationError(
           {"monto_recibido": f"El monto recibido ({monto_recibido}) es menor que el total ({total})."}
       )
   ```
2. Dejar el resto igual: el `total` ya se recalcula server-side con `Decimal` (`:118-121`) — **no** lo tomes del request. `monto_recibido` ya es `DecimalField` (`:60-65`), así que la comparación es `Decimal < Decimal` (sin floats).

### Por qué en `create()` y NO en `validate()` (no lo "arregles" moviéndolo)
El guard necesita el `total`, y el `total` sale de `_resolve_products()` que usa `select_for_update()` (`:85`) — eso **requiere** estar dentro del bloque `@transaction.atomic`, que solo existe en `create()` (`:106`). Si mueves el cálculo a `validate()` pierdes el lock o rompes con "select_for_update cannot be used outside of a transaction". Lanzar `serializers.ValidationError` dentro de `create()` es correcto: la vista hace `serializer.save()` sin try/except (`views.py:63`), el exception handler de DRF lo convierte en **400 por campo**, y `@transaction.atomic` revierte los locks de lectura (aún no hubo writes: el guard va antes de `Sale.objects.create`).

## Restricciones
- Stack inmutable. Solo tocas `apps/sales/serializers.py`. NEQUI_TRANSFERENCIA **no** se afecta (el guard es solo EFECTIVO).
- No toques `@transaction.atomic` ni `select_for_update` ni el `F()` de stock.
- **Fuera de alcance** (NO lo hagas aquí): surface del error en el POS y la parte B del riesgo (floats en el front). Son follow-ups.
- **Doble actualización:** en `el_vuelto_backend/CLAUDE.md`, sección **Serializers → `SaleCreateSerializer`**, cambiar la línea de EFECTIVO a algo como: "`EFECTIVO` requires `monto_recibido` **>= `total`** (recalculado server-side) → 400 por campo `monto_recibido` si es insuficiente".

## Entregable / verificación (salida REAL)
1. `DJANGO_SETTINGS_MODULE=elvuelto.settings.local python manage.py makemigrations --check --dry-run` → **"No changes detected"** (no tocaste modelos). Pegar salida.
2. **Repro del guard (Django shell, no muta la BD — lanza antes de escribir):**
   ```bash
   source .venv/bin/activate
   DJANGO_SETTINGS_MODULE=elvuelto.settings.local python manage.py shell
   ```
   ```python
   from types import SimpleNamespace
   from apps.tenants.models import Tenant
   from apps.users.models import User
   from apps.products.models import Product
   from apps.sales.serializers import SaleCreateSerializer

   t = Tenant.objects.first()
   cajero = User.objects.filter(tenant=t, rol="CAJERO").first()
   p = Product.objects.filter(tenant=t, activo=True).first()
   ctx = {"request": SimpleNamespace(tenant=t, user=cajero)}

   # Insuficiente: 1 unidad, monto_recibido = 1.00 (< precio_venta)
   data = {"items": [{"product": str(p.id), "cantidad": 1}],
           "metodo_pago": "EFECTIVO", "monto_recibido": "1.00"}
   s = SaleCreateSerializer(data=data, context=ctx)
   print("is_valid:", s.is_valid(), "precio:", p.precio_venta)
   try:
       s.save()
       print("NO LANZÓ — guard ausente")   # <- fallo
   except Exception as e:
       print(type(e).__name__, e)          # <- esperado: ValidationError monto_recibido
   ```
   Esperado: imprime `ValidationError` con el mensaje de `monto_recibido`. Pegar salida.
   - (Opcional, sanity) Repetir con `monto_recibido` = un valor `>= total` → `s.save()` crea la venta (ojo: eso SÍ escribe en la BD dev y descuenta stock; envuélvelo en `transaction.atomic()` + `raise` para revertir, o bórrala luego).
3. Veredicto ✅ / 🔴 con la evidencia real.
