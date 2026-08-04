---
tags: [modulo, riesgo]
status: abierto
module: inventory
severity: alto
updated: 2026-08-02
---

# Riesgo — Errores del servidor silenciados en MovementModal

**Ancla:** `el_vuelto_frontend/src/features/inventory/InventoryPage.tsx:249-255`

## Qué pasa
El submit del formulario de movimiento hace:
```
async function onSubmit(data) {
  try {
    await createMovement(data).unwrap()
    setSuccess(true); setTimeout(() => { reset(); onClose() }, 1200)
  } catch {}   // ← vacío
}
```
Cualquier error del backend (`.unwrap()` rechaza) cae en un `catch {}` **vacío**: no hay `setError` por campo, ni toast, ni banner, ni `console.error`. El modal queda abierto sin cambio visible; el usuario puede creer que "no pasó nada" y reintentar o abandonar.

## Errores reales que quedan invisibles
- **403** gate lead_cashier: "Solo los cajeros líderes..." / "Los cajeros solo pueden registrar ENTRADA" (`views.py:34-39`).
- **400** producto de otro tenant (`serializers.py:52-57`).
- **400** `SALIDA_VENTA` manual (`serializers.py:31-36`) — improbable desde el form, pero posible por payload manual.
- **400** cantidad inválida por tipo (`serializers.py:38-50`) — Zod suele atraparlo antes, no siempre.
- **400** `precio_costo` con formato no numérico → `Decimal` inválido (ver [[precio-costo-obligatorio-front]]).

## Impacto
- **UX:** acción que falla en silencio; el operador de caja no sabe por qué no se registró la entrada.
- **Integridad percibida:** riesgo de doble intento o de asumir stock actualizado cuando no lo está.
- Severidad **alta** por combinarse con [[precio-costo-obligatorio-front]] (form que puede generar 400 de formato con facilidad).

## Sugerencia (no se aplica aquí — va a backlog)
Mapear el error de `.unwrap()`: `non_field_errors`/mensajes de campo → `setError`, y un fallback a toast. Los 403 deberían mostrar el `detail` del `PermissionDenied`.

Relacionado: [[preguntas-inventory]] P-4 · [[formularios-inventory]] (divergencia 1).
