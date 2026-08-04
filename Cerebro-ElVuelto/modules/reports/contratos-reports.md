---
tags: [modulo, contratos, api]
status: vivo
module: reports
updated: 2026-08-02
---

# Reports — Contratos de API

Prefijo: `/api/reports/` (`elvuelto/urls.py:13` → `apps/reports/urls.py:11-16`).
**Permiso en las 5 rutas:** `IsAdmin` (`users/permissions.py:15-23`) = rol `ADMIN` **o** `SUPERADMIN`. **No hay `AllowAny`.**
**Tenant:** filtrado **manual** por `request.tenant` en cada vista (no via `TenantModelViewSet`). `request.tenant` lo inyecta `TenantMiddleware` (`tenants/middleware.py:23-31`) desde `tenant_id` del JWT; si el token no trae `tenant_id` o el tenant no está `activo=True` → `request.tenant = None`.
**Sin paginación:** son `APIView` que retornan `Response` directo (arrays/dicts planos), el `DEFAULT_PAGINATION` de DRF no aplica.
**Dinero:** todo `DecimalField` se serializa con `float(...)` → number en JSON. Ver [[dinero-como-float]].

---

## GET `/api/reports/summary/`
- **Vista:** `SummaryReportView` (`views.py:16-58`) · **Permiso:** `IsAdmin`
- **Request (query params, todos opcionales):** `fecha=YYYY-MM-DD` **ó** `fecha_inicio=YYYY-MM-DD&fecha_fin=YYYY-MM-DD`. Precedencia: si viene `fecha` gana; si no, el rango; **si no viene ninguno → agrega TODO el histórico del tenant** (`views.py:29-34`). Ver [[agregados-sin-fecha-todo-el-historico]].
- **Response 200 (dict):**
  ```
  { total_ventas: float, num_transacciones: int, unidades_vendidas: int,
    porcentaje_efectivo: int, porcentaje_nequi: int }
  ```
  Porcentajes redondeados a entero (`views.py:47-48`); suman ~100 solo si todo pago es EFECTIVO o NEQUI.
- **Errores:** 401 sin token · 403 rol CAJERO · con SUPERADMIN (tenant None) → `filter(tenant=None)` = vacío (todo en 0), no error.
- **Llama:** `getSummary` (`reportsApi.ts:63`). `DashboardPage.tsx:82` con `{fecha}`; `ReportsPage.tsx:487` con `{fecha_inicio, fecha_fin}`.

## GET `/api/reports/ventas-por-hora/`
- **Vista:** `VentasPorHoraView` (`views.py:61-109`) · **Permiso:** `IsAdmin`
- **Request:** `?fecha=YYYY-MM-DD`. **Opcional**: si falta usa hoy en Bogotá (`views.py:68-69`). (`CLAUDE.md` lo marca "required" → DRIFT menor.)
- **Response 200 (array de 24, horas 0..23 siempre presentes):**
  ```
  [{ hora: int(0-23), total: float, transacciones: int,
     top_productos: [{ nombre: str, unidades: int }] }]  // hasta 3 por hora
  ```
  ⚠️ `top_productos` **no está en `CLAUDE.md`** pero sí existe (`views.py:92-97,104`) y lo tipa `reportsApi.ts:15`.
- **Llama:** `getVentasPorHora` (`reportsApi.ts:67`). `DashboardPage.tsx:83`; `ReportsPage.tsx:489` (solo si `periodo === 'diario'`).

## GET `/api/reports/ventas-por-dia/`
- **Vista:** `VentasPorDiaView` (`views.py:221-259`) · **Permiso:** `IsAdmin`
- **Request:** `?fecha_inicio&fecha_fin`. Si falta alguno → **últimos 7 días** (hoy-6 .. hoy) en Bogotá (`views.py:229-232`).
- **Response 200 (array, un elemento por día del rango, días sin ventas en 0):**
  ```
  [{ fecha: "YYYY-MM-DD", total: float, transacciones: int }]
  ```
- **Llama:** `getVentasPorDia` (`reportsApi.ts:71`). `ReportsPage.tsx:490` (skip cuando `periodo === 'diario'`).

## GET `/api/reports/top-productos/`
- **Vista:** `TopProductosView` (`views.py:181-218`) · **Permiso:** `IsAdmin`
- **Request:** `?fecha` **ó** `?fecha_inicio&fecha_fin` (opcionales; sin ninguno → todo el histórico). `?limit=10` por defecto, tope `min(limit,100)` (`views.py:190`).
- **Response 200 (array ordenado por `-unidades`):**
  ```
  [{ product_id: "uuid-str", nombre: str, unidades: int, total: float }]
  ```
  `nombre` = `product_nombre` (snapshot del `SaleItem`), no el nombre actual del producto.
- **Llama:** `getTopProductos` (`reportsApi.ts:75`). `DashboardPage.tsx:84` `{fecha, limit:5}`; `ReportsPage.tsx:488` `{fecha_inicio, fecha_fin, limit:10}`.

## GET `/api/reports/sales-detail/`
- **Vista:** `SalesDetailExportView` (`views.py:112-178`) · **Permiso:** `IsAdmin`
- **Request:** `?fecha` **ó** `?fecha_inicio&fecha_fin`; sin params → hoy (`views.py:132-135`).
- **Response 200 (dict):**
  ```
  { fecha: str, label: str, tenant_nombre: str, tenant_logo_url: str|null,
    total_ventas: float, num_transacciones: int,
    sales: [{ id, codigo, cajero, metodo_pago(label), total,
              monto_recibido: float|null, cambio: float|null, hora "HH:MM:SS",
              items: [{ producto, precio_unitario, cantidad, subtotal }] }] }
  ```
  `metodo_pago` aquí es el **label** (`get_metodo_pago_display()`, "Efectivo"/"Nequi / Transferencia"), no el enum. `hora` en TZ Bogotá.
- **Errores:** ⚠️ **500** si `request.tenant is None` (SUPERADMIN o tenant inactivo) porque `views.py:169` hace `request.tenant.nombre`. Ver [[sales-detail-500-si-tenant-none]].
- **Llama:** `getSalesDetail` (`reportsApi.ts:79`). `ReportsPage.tsx:491` con skip `!exportMenuOpen && !exporting` (solo se pide al abrir/usar export).

---

## ❓ Por confirmar
- Comportamiento esperado cuando no se envían params de fecha (agregar todo el histórico) → ver [[preguntas-reports]] P-1.
- Si un SUPERADMIN debería poder ver reports de algún tenant → P-2.
