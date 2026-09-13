---
tags: [tarea, gobernanza, cerebro, meta, deuda]
status: 🔴
prioridad: alta
updated: 2026-09-13
---

# GLOBAL-20260913-la-mitad-estructural-del-cerebro-esta-congelada — 42 días de desfase, medidos

> [!danger] No es "el cerebro se desfasa un poco": publica 🔴 que el código ya cerró
> Todos los PASO 0 desde el 08-13 trabajan sobre `planeacion/backlog/` y tres patrones. **La otra mitad
> del vault —`modules/`, `_conexiones/`, 6 de 8 patrones, los riesgos de módulo, las preguntas— no la
> abre nadie desde el 2026-08-02.** Un agente que arranque por ahí va a ir a arreglar cosas que ya
> están arregladas, con anclas muertas.

## El desfase, medido (no estimado)
| bloque | archivos | `updated` | estado |
|---|---|---|---|
| `estado-<mod>` de sales · inventory · reports | 3 | **2026-08-02** | preceden a **6 commits** |
| `estado-products` · `estado-users` | 2 | 08-03 · 08-09 | products trae un 🔴 falso |
| `_conexiones/` completa | 7 | **2026-08-02** | una contradice un ADR aceptado |
| `_global/patrones/` | **6 de 8** | **2026-08-02** | `patron-jwt-refresh` tiene 2 afirmaciones falsas de seguridad |
| riesgos de módulo en `abierto`/`vivo` | **19** | 08-02 / 08-04 | de 6 verificados, **5 están cerrados** |
| `preguntas-<mod>.md` | 7 | **2026-08-02** | **38 preguntas** sin cerrar; `preguntas-sales` tiene 6 y **cero** respuestas |
| `00-modulos.md` · `00-conexiones.md` | 2 | **2026-08-02** | marcan ⚠️ ya resueltos |

Crecimiento del código en ese mismo período: `features/sales` pasó de los **~2032 LOC** que declara su
nota a **4349** (**+114 %**); `apps/products/serializers.py` de 82 a **164** líneas (el doble).

## Las contradicciones duras (una muestra verificada)
1. **`sales--inventory.md:13`** dice que `_resolve_products` *"valida stock suficiente"*. El
   [[ADR-SALES-20260816-stock-negativo-permitido]] decidió **lo contrario** y el código lo ejecutó. La
   nota de conexión contradice de frente un ADR aceptado.
2. **`inventory/riesgos/ajuste-stock-negativo.md`** (`abierto`) propone como fix *"hacer `stock_actual`
   un `PositiveIntegerField`"* — exactamente lo que el ADR **deshizo** en la migración `products/0004`.
3. **`estado-sales.md:30`** publica 🔴 *"Sin guard `monto_recibido >= total`"*. El guard existe en
   `apps/sales/serializers.py:179-183`, y **el propio registro del módulo lo da por cerrado hace 41
   días** (`00-registro-sales.md:16`).
4. **`estado-inventory.md:23`** y **`estado-products.md:30`** publican 🔴 *"el front traga los 400"*.
   Los dos archivos importan y usan `applyServerErrors` (`InventoryPage.tsx:255-256`,
   `ProductsPage.tsx:18,206,635`), y `grep console.error` da 0. Lo cerró
   `RUN-20260803-errores-400-products-inventory`.
5. **`patron-jwt-refresh.md:30`** advierte *"el login por cédula no exige `tenant_id` → riesgo
   cross-tenant"*. `apps/users/serializers.py:169` declara `tenant_id = UUIDField(required=True)`, y la
   ficha que la propia nota enlaza está 🟢. Su tabla `:20` tampoco menciona el throttling, que existe.
6. **`_global/00-global.md:23`** dice que el superadmin accede *"vía impersonación"*; cuatro líneas más
   abajo, `:27`, enlaza el ADR que decidió **no** impersonar. El índice se desdice a sí mismo.
7. ✅ **Ya corregidas hoy:** [[TENANCY-20260802-toggle-active-fantasma]] y
   [[TENANCY-20260802-slug-divergente]] seguían `status: 🔴` con anclas muertas mientras el índice las
   daba por 🟢 — las dos verificadas contra código y cerradas en esta sesión.

## Deuda de gobernanza asociada
- **Faltan TRES notas de sesión** ([[GOBERNANZA]] §7), no una: **2026-08-11** (Swagger),
  **2026-08-16** (dos features + dos ADR + dos RUN, incluido un cambio de regla de negocio en dinero) y
  **2026-08-30 tarde** (Azure + factura + el deploy).
- **El trabajo de Azure/TLS/deploy no tiene RUN *ni fila*** en ningún `00-registro-*`:
  `grep -i 'azure\|caddy\|tls'` sobre los 7 registros → **0 hits**.
- **`modules/inventory/` es el único módulo sin carpeta `prompts/`** ni `00-registro-inventory.md`,
  aunque su código cambió en dos commits.

## Superficie de código con CERO cobertura en el vault
| qué | evidencia | por qué importa |
|---|---|---|
| `seed_may_sales.py` + `seed_test_sales.py` (262 líneas) | 0 menciones en las 305 notas; los dos hardcodean `TENANT_ID = "1dbae3f2-…"`, que **no** es el tenant de la BD actual | escriben `Sale`/`SaleItem` **saltándose** `SaleCreateSerializer`, o sea sin las reglas de dinero y stock |
| fieldsets del Django admin (`apps/users/admin.py:19-24`) | `tenant`, `rol`, `is_staff`, `is_superuser` **editables** desde `/admin/` | [[AUTH-20260913-admin-django-sin-rate-limit]] acaba de cambiar el modelo de amenaza y ninguna nota conecta las dos cosas |
| `/super-admin/billing` y `/super-admin/history` | `router.tsx:57-58`, placeholders ruteados **en producción**; `grep BillingPage` sobre el vault → **0** | son pantallas vacías que un cliente puede abrir |

## Qué hay que hacer (es una sesión propia, no un parche)
El propio cerebro viene diciendo desde el 08-27 que esto *"merece su propia sesión"*. Ahora está
**medido**, así que se puede planear:
1. **Barrido de `modules/`**: los 7 `estado-<mod>`, sus riesgos y sus preguntas, contra código, uno por
   uno. Empezar por **sales** (el más desfasado y el que más cambió).
2. **Barrido de `_conexiones/`** (7 notas) — ahí viven los contratos entre módulos.
3. **Los 6 patrones congelados**, empezando por `patron-jwt-refresh` (tiene afirmaciones falsas de
   seguridad, que es la peor clase).
4. **Reconciliar `00-planeacion` con el frontmatter de cada ficha**: hay 4 pares que se contradicen.
5. Las tres notas de sesión faltantes, reconstruidas desde los RUN y los ADR que sí existen.

## Criterio de aceptación
Ninguna nota de `modules/` ni `_conexiones/` publica un 🔴 que el código haya cerrado, y
`00-planeacion` coincide con el frontmatter de cada ficha que enlaza.

## Enlaces
[[GOBERNANZA]] · [[GLOBAL-20260913-el-cerebro-se-publica-solo]] · [[00-modulos]] · [[00-conexiones]] ·
[[ADR-SALES-20260816-stock-negativo-permitido]] · [[2026-09-13-planner-paso0-resync]]
