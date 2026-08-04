---
tags: [modulo, preguntas]
status: vivo
module: reports
updated: 2026-08-02
---

# Reports — Preguntas abiertas (append-only)

> Formato GOBERNANZA §6. Nunca se reordena. Cada P-N con hipótesis, respuesta y fecha.

---

P-1 [reports] ¿Es intencional que `summary` y `top-productos` agreguen TODO el histórico del tenant cuando no se envían params de fecha?
   Evidencia: `views.py:29-34` (summary) y `:194-197` (top-productos) — sin `fecha` ni `fecha_inicio/fecha_fin`, no se aplica ningún filtro temporal.
   Mi hipótesis: es un default no intencional; el front siempre manda fechas, así que nunca se dispara en la práctica, pero un consumidor directo del API obtendría métricas de por vida.
   Si no contestas: asumo que es aceptable (front siempre acota) y lo marco ❓ como "default no acotado" en [[contratos-reports]].
   Impacto: medio
   Respuesta: (pendiente)

P-2 [reports] Un `SUPERADMIN` pasa `IsAdmin` pero su JWT no trae `tenant_id`, así que `request.tenant` es None. ¿Debe un SUPERADMIN poder ver reports (y de qué tenant)?
   Evidencia: `permissions.py:15-23` (IsAdmin incluye SUPERADMIN) + `middleware.py:13-15` (sin `tenant_id` → None) + `views.py:26` (`filter(tenant=None)` → vacío) y `views.py:169` (`request.tenant.nombre` → 500 en sales-detail).
   Mi hipótesis: reports está pensado solo para ADMIN de tenant; que SUPERADMIN entre es un efecto colateral de reusar `IsAdmin`. Hoy resulta en datos vacíos (summary/hora/día/top) y en **500** (sales-detail).
   Si no contestas: asumo que SUPERADMIN no debería usar reports; registro el 500 como riesgo ([[sales-detail-500-si-tenant-none]]) y sugiero endurecer.
   Impacto: alto

P-3 [reports] ¿Qué debería pasar con un `?fecha` mal formado o `?limit=abc`? Hoy no hay validación y probablemente sale un 500.
   Evidencia: `views.py:30` pasa `fecha` crudo a `created_at__date=fecha`; `views.py:190` hace `int(request.query_params.get("limit",10))` sin try/except.
   Mi hipótesis: nunca se probó con entrada inválida porque el front construye siempre valores válidos; el back devolvería 500 en vez de 400.
   Si no contestas: lo marco ❓ como robustez de entrada faltante; no bloquea al front actual.
   Impacto: bajo

P-4 [reports] ¿Se espera que Dashboard/Reports se refresquen solos cuando entra una venta nueva? Hoy no ocurre porque nada invalida el tag `Report`.
   Evidencia: `apiBase.ts:48` declara `Report`; las 5 queries lo `provide` (`reportsApi.ts:64-80`); `createSale` invalida `Sale, InventoryMovement, Product` (`salesApi.ts:54`) pero **no** `Report`.
   Mi hipótesis: es un olvido; se esperaría que una venta refresque KPIs del dashboard. Hoy solo se actualiza al remontar la página o por refetch manual.
   Si no contestas: lo dejo como riesgo abierto ([[reports-tag-nunca-se-invalida]]) para que el dev decida si `createSale` debe invalidar `Report`.
   Impacto: medio

## Respuestas del owner (2026-08-02)
> [!decision] P-2 — RESUELTA: el **SUPERADMIN no** debe ver reports ni datos operativos del tenant. Verá datos de un negocio solo **impersonando** al admin (feature nueva, aún no construida: [[SUPERADMIN-20260802-impersonar-tenant]]). Mientras tanto, los endpoints rechazan `tenant=None` con 403. Ver [[ADR-G-20260802-modelo-de-acceso-por-rol]] y [[REPORTS-20260802-endpoints-500-tenant-none]]. (P-1, P-3, P-4 siguen abiertas.)
