---
tags: [tarea, tenancy, sales, recibo, feature]
status: 🟢
prioridad: feature
updated: 2026-08-30
---

# TENANCY-20260830-factura-electronica-por-tenant — el bloque del recibo, condicionado por negocio

> [!done] Corrida y verificada el 2026-08-30. Falta el ojo del owner y prender BambiPan.

Pedido directo del owner. Decisión: [[ADR-TENANCY-20260830-factura-electronica-por-tenant]].

## Lo que se pidió
1. Toggle por tenant en el super admin: «¿Factura electrónica?».
2. Encendido ⇒ el recibo muestra la pregunta + correo + teléfono del negocio.
3. Apagado ⇒ no muestra ninguno de los tres.
4. Se quita «El Vuelto POS» del recibo; la última línea pasa a ser «Gracias por su compra».

## Lo que se encontró al mapear (y que el pedido no decía)
La condición de hoy era **implícita y siempre verdadera**: `generateReceipt.ts:113` usaba
`tenant.email || tenant.supportPhone`, y `Tenant.correo` es obligatorio. O sea que el bloque no se
mostraba «para los que tienen datos»: se mostraba **siempre**.

## Entregado
| capa | archivos |
|---|---|
| modelo | `apps/tenants/models.py:20` + `migrations/0005_tenant_factura_electronica.py` |
| API | `apps/tenants/serializers.py` (`Meta.fields` es lista EXPLÍCITA) · `apps/tenants/admin.py` |
| cadena al cajero | `apps/users/serializers.py:52-58` (`_user_payload`, cubre los 3 logins de una) |
| front · auth | `authApi.ts` (tipo + los DOS mapeos) · `authSlice.ts` |
| front · recibo | `generateReceipt.ts` (contrato, condición, marca fuera, `.marca` fuera, `overflow-wrap`) |
| front · call sites | `SuccessModal.tsx` · `SalesHistoryPage.tsx` |
| front · super admin | `tenantsApi.ts` · `super-admin/tenants/index.tsx` (crear + editar) · `TenantsTable.tsx` (badge) |
| seed | `seed_dev_data.py` — el tenant de ejemplo nace con el flag ENCENDIDO y con teléfono |
| doc | los dos `CLAUDE.md` |

## Deuda que nace o queda anotada
- 🔴 **[[FRONT-20260830-flag-factura-no-llega-en-caliente]]** — el flag viaja solo en el login.
- 🟡 **Prender BambiPan.** Con `default=False` quedó apagado; sus recibos salen sin el bloque.
- 🟡 **La previa en pantalla no refleja el toggle.** `ReceiptPreview.tsx` nunca mostró el bloque (ni
  antes ni ahora): si el owner prueba mirando el `SuccessModal` sin imprimir, **no va a ver ninguna
  diferencia** y va a creer que no funciona. Hay que probarlo imprimiendo.
- 🟡 Sin auditoría de quién movió el flag (`TenantViewSet` es un `ModelViewSet` pelado).
- 🟡 Reimprimir usa el flag de hoy, no el de la venta.

## Enlaces
[[ADR-TENANCY-20260830-factura-electronica-por-tenant]] · [[patron-impresion-recibos]] ·
[[2026-08-30-planner-paso0-resync]]
