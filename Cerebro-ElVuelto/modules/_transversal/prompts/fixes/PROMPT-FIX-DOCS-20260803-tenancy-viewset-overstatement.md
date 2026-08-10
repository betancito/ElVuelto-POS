---
tags: [prompt, docs, tenancy, fix]
status: 🟢
updated: 2026-08-03
---

# Prompt DEV — Fix: `TenantModelViewSet` NO lo usan "todos" (residuo de la corrección de tenancy)

**Fix de:** [[PROMPT-FIX-DOCS-20260803-claudemd-tenancy]] · **Tarea:** [[DOCS-20260802-corregir-claudemd-tenancy]]
**Alcance:** SOLO doc, 1-2 frases. No código. No git.

## Qué faltó
La corrección anterior arregló las 3 mentiras peligrosas ✅, pero quedó un residuo (era el paso 2, sin hacer):
- `el_vuelto_backend/CLAUDE.md:69` — "**TenantModelViewSet** — base ViewSet class **used by all tenant-scoped resources**. Overrides `get_queryset()` to auto-filter…". **Falso:** hoy solo lo usan `CategoryViewSet` y `ProductViewSet`. `reports` (5 APIViews), `SaleViewSet`, `StockView`/`InventoryMovementViewSet` y `UserViewSet` **no** lo heredan → filtran a mano. Además esto **contradice** el bullet "Follow-up (not yet guarded)" que el mismo archivo ya tiene al final.

## Qué hacer
1. Reescribir `backend/CLAUDE.md:69` para que diga la verdad, p.ej.: "`TenantModelViewSet` — base para los `ModelViewSet` tenant-scoped que la heredan (hoy: `CategoryViewSet`, `ProductViewSet`); filtra en `get_queryset()` y asigna `tenant` en `perform_create()`. **La mayoría de las demás vistas (reports, sales, inventory, users) NO la heredan y filtran a mano.**" (Puedes conservar "auto-filter" describiendo lo que hace la base; el problema es el "used by all".)
2. Revisar que el texto nuevo de la raíz (`CLAUDE.md:49`) no sugiera que **todos** los `ModelViewSet` la extienden; si hace falta, matízalo a "los `ModelViewSet` tenant-scoped la extienden (convención para nuevos)".

## Restricciones
- Solo doc. No código. No re-toques las 3 frases ya corregidas (están bien).

## Entregable / verificación
- `grep -niE "used by all tenant-scoped" el_vuelto_backend/CLAUDE.md` → **0** (pegar salida).
- Confirmar que :69 ya no afirma adopción universal y coincide con [[patron-tenancy]] y con el bullet "Follow-up (not yet guarded)".
- Veredicto ✅ / 🔴.
