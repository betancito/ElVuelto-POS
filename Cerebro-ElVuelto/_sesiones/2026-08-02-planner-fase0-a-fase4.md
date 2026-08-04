---
tags: [sesion, planner]
status: activo
updated: 2026-08-02
---

# Sesión 2026-08-02 — planner — Fase 0 a Fase 4 (construcción del cerebro)

## Qué hice
- **Fase 0 (reconocimiento):** leí todo el backend + inventario del frontend. Mapa de módulos, riesgos, orden, piloto, y veredicto de las PISTAS. Cerré 4 decisiones con el owner (ver abajo).
- **Fase 1 (esqueleto):** creé el vault `Cerebro-ElVuelto/` con `GOBERNANZA`, `00-INDEX`, `README`, 7 plantillas, config de Obsidian (`.obsidian/`), `.gitattributes` (merge=union en índices), `.gitignore`.
- **Fase 2 (módulos):** vía **workflow** (7 documentadores + 7 verificadores adversariales, 0 errores) documenté tenancy, auth, users, products, inventory (piloto), sales, reports — cada uno con 6 notas + riesgos. Consolidé los hallazgos.
- **Fase 3 (parcial):** los 8 `patrones/` de `_global` son el **contenido propuesto** para los `CLAUDE_*.md`. La creación/edición real de esos archivos es tarea del Dev: [[DOCS-20260802-corregir-claudemd-tenancy]] y [[DOCS-20260802-corregir-claudemd-drift]].
- **Fase 4:** `INIT-AGENTS.md` con los prompts de los dos roles, calibrados con las trampas reales.

## Decisiones del owner (2026-08-02)
- **D-1 Tenancy:** se mantiene el filtrado manual; RLS = meta post-estabilización. → [[ADR-G-20260802-tenancy-isolation]].
- **D-2 Piloto:** `inventory`.
- **D-3 Login cajero:** exigir `tenant_id` siempre. → [[AUTH-20260802-exigir-tenant-id-login-cajero]].
- **D-4 Arreglos prioritarios:** los 4 (guard dinero, código muerto, deps, ruta /test).
- **Objetivo raíz:** estabilizar + documentar en paralelo. → [[EPIC-20260802-estabilizacion]].

## Estado al cerrar
- 🟢 Cerebro base construido (~120 archivos). Los 7 módulos documentados y **verificados** (format_ok en los 7; tenancy CONFIRMED; resto ISSUES triviales).
- 🟢 Backlog: 19 ítems (9 base + 10 descubiertos en la auditoría). Ver [[00-planeacion]].

## Hallazgos NUEVOS importantes (más allá de la Fase 0)
- 🔒 **ALTA — products:** `CategoryViewSet`/`ProductViewSet` sin `permission_classes` → default `IsAuthenticated`; un CAJERO puede CRUD de productos. [[PRODUCTS-20260802-viewsets-sin-permiso]].
- 🔴 **ALTA — tenancy:** creación de tenant no atómica → 500 + tenant huérfano con `admin_correo` duplicado. [[TENANCY-20260802-creacion-tenant-atomica]].
- 🔴 **ALTA — front (transversal):** los formularios se tragan el 400 por campo (catch vacío / toast genérico). [[FRONT-20260802-errores-400-silenciados]].
- 🔴 **ALTA — users:** Zod no condiciona requeridos por rol (CAJERO→cedula, ADMIN→correo). [[USERS-20260802-zod-requeridos-por-rol]].
- 🔴 **ALTA — reports:** tag `Report` nunca se invalida (dashboards stale); `sales-detail` da 500 con `tenant=None`. [[REPORTS-20260802-invalidar-tag-report]], [[REPORTS-20260802-endpoints-500-tenant-none]].
- 🟡 **MEDIA:** PATCH nulifica campos omitidos ([[USERS-20260802-patch-nulifica-campos]]), toggle_active fantasma, slug divergente.

## Preguntas abiertas (necesitan al owner)
Viven en `modules/<mod>/preguntas-<mod>.md`. Alto impacto:
- tenancy P-2: ¿creación de tenant transaccional? (hip: sí, falta).
- auth P-1: ¿login por cédula sin tenant_id intencional? (hip: no, cerrar).
- products P-1: ¿CAJERO debe poder CRUD de productos? (hip: no, es bug de permisos).
- sales P-1: ¿falta guard monto_recibido≥total intencional? (hip: olvido).
- reports P-2: ¿SUPERADMIN debe ver reports y de qué tenant? (hip: no, efecto colateral de IsAdmin).

## Residual / deuda del cerebro
- El verify marcó ~10 imprecisiones triviales de ancla (off-by-one de rangos de línea) en notas de auth/users/products/inventory/sales. No cambian el sentido; cleanup pendiente.
- Piloto inventory: la matriz de paridad no incluye una fila explícita para la regla `lead_cashier` (el verify lo pidió). Ajuste menor pendiente.
- **Wikilinks de conexión sin estandarizar:** los agentes referenciaron conexiones con nombres propios (`[[tenancy--auth]]`, `[[users--inventory]]`, `[[sales--products]]`, etc.) y a módulos por nombre pelado (`[[tenancy]]`, `[[users]]`…). Se crearon las conexiones canónicas de más valor (`products--sales`, `reports--tenants`); el resto quedan como forward-links suaves (permitido por GOBERNANZA §3). Cleanup: unificar a `estado-<mod>` y a los basenames canónicos de `_conexiones/`.

## Por dónde retomar en frío (PASO 0)
1. Leer [[00-INDEX]] + [[GOBERNANZA]] + [[00-planeacion]] + esta sesión.
2. Contrastar contra `git log` y los archivos reales.
3. Con el owner: responder las preguntas de alto impacto (arriba) — cada respuesta que cambie diseño = ADR.
4. Arrancar el Sprint [[Sprint-2026-08-02-estabilizacion-doc]] pasándole tareas al **Agente B** (Dev) con los prompts de [[INIT-AGENTS]]; empezar por lo 🔒 (products permisos) y las ALTAS.

## Actualización — respuestas del owner (2026-08-02)
El owner respondió las 4 preguntas de alto impacto → 2 ADRs nuevos + 1 feature:
- **Cajero solo-lectura del catálogo** + **superadmin solo plataforma** (datos vía impersonación) → [[ADR-G-20260802-modelo-de-acceso-por-rol]].
- **Correo del admin único global + creación de tenant atómica** → [[ADR-TENANCY-20260802-correo-admin-unico-global]].
- **Impersonación (login-as)**: feature nueva, **no existe hoy** (grep=0) → [[SUPERADMIN-20260802-impersonar-tenant]].
- **PIN 4 dígitos del cajero: intencional** (táctil) → [[USERS-20260802-unificar-reglas-password]] reformulada (coherencia por rol, no aplanar).
Respuestas cerradas en `preguntas-{products,tenancy,reports,users}`. Quedan abiertas las de impacto menor (products P-2/P-3/P-4, tenancy P-1/P-3..P-7, reports P-1/P-3/P-4, users P-1/P-2/P-4/P-5/P-6).
