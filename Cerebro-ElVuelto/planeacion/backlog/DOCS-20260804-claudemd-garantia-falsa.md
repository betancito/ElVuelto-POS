---
tags: [tarea, docs, seguridad]
status: 🟢
prioridad: alta
updated: 2026-08-04
---

> [!done] Cerrado 2026-08-04 — ✅ [[RUN-20260804-guard-tenant-none-y-doc]]
> Las dos frases falsas corregidas, y el Dev fue más allá de reescribirlas: agregó una **tabla de dónde está guardado cada camino** y un gotcha nuevo **"Guards must fail CLOSED"** con el patrón malo y el bueno lado a lado. También quedó coherente el punto 3 de Multi-Tenancy (`:69`).
> **Queda una imprecisión menor** en la viñeta *"Still NOT guarded"* que el propio Dev añadió: dice que `POST /users/` como superadmin *"creates a user with `tenant=None`"* — verificado que no, lanza `ValueError` → 500 sin crear nada. Se corrige junto con [[BACKEND-20260804-guard-tenant-usercreateserializer]].

# 🔒 DOCS-20260804-claudemd-garantia-falsa — El CLAUDE.md del backend afirma dos cosas falsas sobre tenancy

**Tipo:** doc/seguridad · **Descubierto:** PASO 0 del 2026-08-04 · **Verificado a mano por el Planner**

Este es el patrón que ya motivó [[ADR-G-20260802-tenancy-isolation]] y el sprint [[Sprint-2026-08-03-correccion-docs]]: **el CLAUDE.md dice que algo está protegido cuando no lo está.** Un agente que lea esto y confíe, escribe una fuga.

## Mentira 1 — "`ProductViewSet` lo obtiene gratis" (🔒 garantía de seguridad falsa)

`el_vuelto_backend/CLAUDE.md:460` dice:
> Used by `TenantModelViewSet._get_tenant()` (so `CategoryViewSet`/`ProductViewSet` **get it for free**)

**Falso para `ProductViewSet`.** `apps/products/views.py:50-55` **sobreescribe** `get_queryset()` y hace `Product.objects.filter(tenant=self.request.tenant)` directo, sin `super()` y sin `require_tenant`. El guard heredado se pierde. `CategoryViewSet` sí lo hereda (no sobreescribe).

## Mentira 2 — "devuelve vacío (no 500)"

`el_vuelto_backend/CLAUDE.md:462` dice:
> their `get_queryset()` still does `filter(tenant=request.tenant)` → **empty (not 500)** for `tenant=None`

**Falso.** Verificado ejecutando Django con el venv del repo:
```
User  -> RAISES TypeError : one of the hex, bytes, bytes_le, fields, or int arguments must be given
Sale  -> RAISES TypeError : one of the hex, bytes, bytes_le, fields, or int arguments must be given
```
`filter(tenant=SimpleLazyObject→None)` **revienta con `TypeError` → 500**, no devuelve queryset vacío. La frase minimiza la severidad y es la que hizo que [[BACKEND-20260803-guard-tenant-none-viewsets-restantes]] naciera con prioridad media.

## Criterio de aceptación
1. `:460` deja de prometer que `ProductViewSet` está cubierto; dice que **sobreescribe `get_queryset()` y hoy no llama a `require_tenant`**.
2. `:462` dice **500 (`TypeError`)**, no "empty".
3. `:69` se revisa por coherencia (referencia la misma nota de follow-up).

## Notas para el Dev
- Es doc, no código. **No** arregles los viewsets aquí — eso es [[BACKEND-20260803-guard-tenant-none-viewsets-restantes]].
- Residual conocido y aparte: `backend/CLAUDE.md` mide **463 líneas** contra el presupuesto de <400 (GOBERNANZA §3). Partirlo sigue siendo opcional según el owner.
- El resto del drift de docs (POST inventory documentado como IsAdmin, credenciales del seed, `DashboardPage` mal ubicado, `npm run commit`, `var(--font-serif)`) → [[DOCS-20260802-corregir-claudemd-drift]], reabierto.
