---
tags: [modulo, preguntas]
status: vivo
module: inventory
updated: 2026-08-02
---

# Inventory — Preguntas abiertas

Append-only (GOBERNANZA §6). No se reordena. Cada P-N con hipótesis, respuesta y fecha.

---

P-1 [inventory] ¿El path lead-cashier `ENTRADA` (backend) debe tener UI, o es capacidad futura/muerta?
   Evidencia: `views.py:34-39` permite a un CAJERO con `lead_cashier=True` crear `ENTRADA`; pero la ruta `/inventory` es solo ADMIN (`router.tsx:88-97`) y no hay pantalla de inventario para CAJERO.
   Mi hipótesis: capacidad backend adelantada; se planea dar a lead cashiers una pantalla de ingreso, aún sin construir.
   Si no contestas: asumo que es intencional-a-futuro y lo marco 🟡 "backend sin UI" en [[estado-inventory]].
   Impacto: medio
   Respuesta: —

P-2 [inventory] ¿`InventoryPage.module.css` (vacío, no importado) debe borrarse?
   Evidencia: `features/inventory/InventoryPage.module.css` tiene 1 línea y no hay `import` en `InventoryPage.tsx`; la página usa clases `ta-*` inline (convención del CLAUDE.md).
   Mi hipótesis: archivo vestigial del scaffold; código muerto.
   Si no contestas: lo marco como código muerto en [[mapa-inventory]], sin tocarlo.
   Impacto: bajo
   Respuesta: —

P-3 [inventory] ¿`precio_costo` debe ser obligatorio en el formulario, incluso para `AJUSTE`?
   Evidencia: Zod `precio_costo: z.string().min(1,'Requerido')` (`InventoryPage.tsx:29`); el modelo lo tiene `null=True, blank=True` (`models.py:30`) y el serializer no lo exige. Un `AJUSTE` (corrección de conteo) no tiene por qué llevar costo.
   Mi hipótesis: la regla se pensó para `ENTRADA` (compra a proveedor) y se aplicó a todo el form por descuido.
   Si no contestas: lo dejo como divergencia 🟡 en [[precio-costo-obligatorio-front]] sin cambiar código.
   Impacto: medio
   Respuesta: —

P-4 [inventory] ¿El `catch {}` vacío del submit es provisional?
   Evidencia: `InventoryPage.tsx:254` traga cualquier error de `createMovement`. Errores reales que quedan invisibles: 403 lead_cashier, 400 producto de otro tenant, 400 formato de Decimal, 400 `SALIDA_VENTA`.
   Mi hipótesis: se asumió que Zod cubre toda validación; no cubre los 403/400 del servidor.
   Si no contestas: lo marco 🔴 en [[errores-servidor-silenciados]] como deuda de UX/integridad.
   Impacto: alto
   Respuesta: —

P-5 [inventory] ¿Se debe impedir que un `AJUSTE` deje `stock_actual` en negativo?
   Evidencia: `serializers.py:59-65` hace `stock_actual = F('stock_actual') + cantidad` sin piso; no hay check en modelo ni BD. Un `AJUSTE -100` sobre stock 10 deja `-90`.
   Mi hipótesis: es un descuido; el negocio no debería permitir stock negativo por corrección manual (la venta sí valida stock, el ajuste no).
   Si no contestas: lo dejo 🔴 en [[ajuste-stock-negativo]] como riesgo, sin tocar código.
   Impacto: medio
   Respuesta: —

P-6 [inventory] ¿Un SUPERADMIN debería poder usar `/inventory/`?
   Evidencia: `IsAdmin` permite SUPERADMIN, que tiene `tenant=None`. GET devuelve vacío silencioso; POST intentaría `save(tenant=None)` → IntegrityError (FK NOT NULL). Este viewset no usa `TenantModelViewSet` (que sí lanza `PermissionDenied` con tenant None).
   Mi hipótesis: no es un caso de uso real (el superadmin no gestiona stock de un tenant), pero el endpoint no lo bloquea limpiamente.
   Si no contestas: lo documento en [[superadmin-tenant-none]] como riesgo de robustez, no de seguridad de datos.
   Impacto: bajo
   Respuesta: —
