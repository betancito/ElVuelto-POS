---
tags: [modulo, formularios, auditoria]
status: vivo
module: inventory
updated: 2026-08-02
---

# Inventory — Auditoría de formularios

Un único formulario en el módulo: **MovementModal**. (La pestaña Stock y el escáner no son formularios; alimentan el modal.)

---

## MovementModal — Registrar movimiento de inventario

- **Componente:** `features/inventory/InventoryPage.tsx:224-415` · **Modo:** solo **crear** (no hay edición de movimientos; son inmutables).
- **Schema Zod:** `InventoryPage.tsx:25-35`, **estático** (no depende de rol/tenant). `zodResolver(schema)` en `:229`. NO se pasan `mode`/`reValidateMode` → default `onSubmit`. `superRefine` (`:31-34`) agrega la regla `ENTRADA → cantidad >= 1`.
- **`defaultValues` (`:230-237`):** `product = initialProductId ?? ''`, `tipo_movimiento = 'ENTRADA'`, `cantidad = 1`, `precio_costo = ''`, `nota = ''`. Se evalúan **en cada montaje**: el modal se monta fresco cada apertura (`{showModal && <MovementModal .../>}`, `:786`), así que **no hay defaults stale**; no se usa `reset()` para recargar (solo `reset()` post-éxito, `:253`).
- **Patrón RHF atípico:** NO usa `register()`. Lee con `watch(...)` y escribe con `setValue(...)` en cada input (`:284, 360-361, 377-378, 391-392`). El `ProductPicker` y el toggle de tipo son botones custom que llaman `setValue`.
- **Estructura dinámica:**
  - `tipo_movimiento` se elige con dos botones (`ENTRADA`/`AJUSTE`, `:329-347`) — **`SALIDA_VENTA` no es seleccionable** (ni está en el enum Zod).
  - `watch('tipo_movimiento')` dispara: `min` del input cantidad (`:358`), y una nota de ayuda "Positivo/Negativo" solo en `AJUSTE` (`:364-368`).
  - `useEffect [selectedId]` (`:243-247`) pre-llena `precio_costo` con `selectedProduct.precio_costo` cuando se elige/escanea un producto (solo si viene truthy).
- **Submit (`:249-255`):** `handleSubmit(onSubmit)` → `createMovement(data).unwrap()` → `POST /inventory/movements/`. Sin transformación: envía `data` tal cual (`{product, tipo_movimiento, cantidad, precio_costo, nota}`). En éxito: `setSuccess(true)`, y a los 1200ms `reset()` + `onClose()`. Invalida tags `InventoryMovement` + `Product` (`inventoryApi.ts:40`) → refetch de historial y stock.
- **⚠️ Errores del servidor:** `catch {}` **vacío** (`:254`). Ningún 400/403 se mapea a `setError`, ni a toast, ni a banner. El usuario no ve nada (el modal queda abierto sin feedback). Ver [[errores-servidor-silenciados]].

### Matriz de paridad por campo

| campo | Zod (tipo/regla) | RHF (control, requerido) | tipo TS | serializer DRF | modelo Django | constraint BD | ⚠️ divergencia |
|---|---|---|---|---|---|---|---|
| `product` | `z.string().min(1)` (`:26`) | `ProductPicker`+`setValue` (`:284`), req | `product: string` | escribible, `validate_product` mismo tenant (`:52-57`) | FK PROTECT NOT NULL | FK NOT NULL | picker solo lista `CON_CODIGO` activos; back acepta cualquier producto del tenant |
| `tipo_movimiento` | `z.enum(['ENTRADA','AJUSTE'])` (`:27`) | toggle botones (`:329-347`), req | `'ENTRADA'\|'SALIDA_VENTA'\|'AJUSTE'` | rechaza `SALIDA_VENTA` (`:31-36`) | `CharField(20)` choices 3 valores | — | TS incluye `SALIDA_VENTA` pero el form nunca lo produce; back lo rechaza si llegara |
| `cantidad` | `z.coerce.number().refine(!=0)` + superRefine `ENTRADA>=1` (`:28,32-34`) | input number+`setValue` (`:355-362`), req | `cantidad: number` | `ENTRADA>0`, `AJUSTE!=0` (`:38-50`) | `IntegerField` NOT NULL | sin check de signo | ✅ paridad; ⚠️ ni front ni back impiden `AJUSTE` que deje stock negativo → [[ajuste-stock-negativo]] |
| `precio_costo` | `z.string().min(1,'Requerido')` (`:29`) — **OBLIGATORIO** | input text `inputMode numeric` (`:372-379`) | `precio_costo: string` (no null) | escribible, **opcional** | `DecimalField(10,2)` null/blank (`:30`) | nullable | 🔴 **front exige, back opcional**; obligatorio incluso en `AJUSTE`. Además texto crudo sin strip de formato → un `"$1.234"` rompería el Decimal. Ver [[precio-costo-obligatorio-front]] |
| `nota` | `z.string().optional()` (`:30`) | input text `setValue` (`:387-393`) | `nota: string \| null` | escribible | `TextField(blank=True)` NOT NULL | — | TS dice `null` pero BD guarda `""` (nunca null) |
| `proveedor` | ❌ no está en el schema | ❌ no hay input | ❌ omitido en la interface (`inventoryApi.ts:3-14`) | escribible, opcional | `CharField(200)` null/blank (`:31`) | nullable | 🟡 **campo del back que el form no expone** → desde inventory siempre `null` |
| `user` | — | — | `user: string` (read) | `read_only`, lo pone `perform_create` | FK PROTECT | FK NOT NULL | ✅ inyectado server-side |
| `tenant` | — | — | — (no en payload) | `read_only`, `perform_create` | FK PROTECT (TenantMixin) | FK NOT NULL | ✅ inyectado; ⚠️ `None` si SUPERADMIN → [[superadmin-tenant-none]] |
| `id`/`created_at` | — | — | read | `read_only` | UUID / auto_now_add | — | ✅ |

### Notas de precisión monetaria (crítico en POS)
- `precio_costo` viaja como **string** en front→back (`inventoryApi.ts:11`, input `:377`) → llega a `DecimalField`. Bien: el string preserva precisión. **Riesgo:** el input no formatea ni limpia (a diferencia de ProductsPage, que sí hace strip dot-thousands). Si el usuario teclea separadores, el `Decimal` falla con 400 → y ese 400 se traga ([[errores-servidor-silenciados]]).
- `valorTotal` KPI (`InventoryPage.tsx:617-620`) usa `parseFloat` + multiplicación en JS `number` — solo para mostrar, no se envía; aceptable pero es aritmética float sobre dinero.

## ⚠️ Divergencias detectadas
1. 🔴 **Errores 400/403 silenciados** — `InventoryPage.tsx:254` (`catch {}`) vs todas las `ValidationError`/`PermissionDenied` del back (`serializers.py:31-57`, `views.py:34-39`). → [[errores-servidor-silenciados]].
2. 🔴 **`precio_costo` obligatorio en front, opcional en back** — `InventoryPage.tsx:29` vs `models.py:30` / serializer sin regla. Sin sentido en `AJUSTE`. → [[precio-costo-obligatorio-front]].
3. 🟡 **`proveedor` nunca capturado** — modelo/serializer lo soportan (`models.py:31`, `serializers.py:24`) pero el form y el tipo TS lo omiten (`inventoryApi.ts:3-14`).
4. 🟡 **Tipos TS imprecisos** — `precio_costo: string` (debería ser `string|null`; los `SALIDA_VENTA` de sales llegan con `null`) y `nota: string|null` (nunca es null en BD).

## ❓ Por confirmar
- ¿`precio_costo` obligatorio es intención de negocio (toda entrada debe llevar costo) o descuido copiado a `AJUSTE`? → [[preguntas-inventory]] P-3.
- ¿El `catch {}` vacío es provisional o se asume que Zod cubre todo? (No cubre: lead_cashier, tenant-mismatch, formato de Decimal). → [[preguntas-inventory]] P-4.
