---
tags: [patron, global, errores, forms]
status: vivo
updated: 2026-08-02
---

# Patrón — Errores DRF ↔ RTK Query (y formularios)

> [!warning] LÉEME SI VAS A TOCAR: cualquier formulario que envía a la API.

## Forma del error del backend (DRF)
- **Error por campo:** `serializer.ValidationError({"campo": "mensaje"})` → HTTP 400 con `{campo: [mensaje]}`. Ejemplos: `UserCreateSerializer.validate` (`users/serializers.py:170,172,182,188`), `ProductSerializer.validate` (`products/serializers.py:47-52`), `SaleCreateSerializer.validate` (`sales/serializers.py:73`).
- **Error de objeto:** cae en `non_field_errors`.
- **Auth:** `AuthenticationFailed("...")` → 401 `{detail: "..."}` (`users/serializers.py:42`).
- **Unicidad:** se valida SOLO en el backend (correo global, cédula por tenant, barcode por tenant). El 400 correspondiente es la única señal → **el formulario DEBE manejarlo**.

## Cómo lo maneja el front (confirmado en la auditoría 2026-08-02)
- **Divergencia sistémica:** la mayoría de formularios se **tragan** el 400 por campo (toast/banner genérico o `catch {}` vacío) sin mapearlo a `setError`: users (`UsersPage.tsx:118,144`), tenants (`super-admin/tenants/index.tsx:67-69,91-93`), POS (`PosPage.tsx:270-272`), products, inventory. **Único bien hecho:** `ProfilePage.tsx`.
- **Consecuencia:** como la unicidad (correo/cedula/nit/barcode) se valida solo server-side, el usuario no sabe qué campo chocó.
- **Regla objetivo:** un helper `applyServerErrors(err, setError)` que mapee el 400 por campo a los inputs y los `non_field_errors` a un toast. Ver [[FRONT-20260802-errores-400-silenciados]].

## Enlaces
[[patron-formato-cop]] · cada `formularios-<mod>` audita el mapeo real.
