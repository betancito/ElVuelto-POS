---
tags: [corrida, products, review]
status: cerrado
module: products
updated: 2026-08-02
---

# RUN 2026-08-02 — PROMPT-FIX-PRODUCTS-…-categorias-read-cajero

**Prompt:** [[PROMPT-FIX-PRODUCTS-20260802-categorias-read-cajero]] · **Veredicto:** 🟢 PASÓ · **Cierra:** [[PRODUCTS-20260802-viewsets-sin-permiso]]

## Qué hizo el Dev (git diff)
- `CategoryViewSet`: quitó `permission_classes = [IsAdmin]` y agregó `get_permissions` → `list`/`retrieve` → `IsCajero`, resto → `IsAdmin` (`apps/products/views.py:17-22`).
- `ProductViewSet`: `[IsAdmin]` intacto; acción `pos` sigue `IsCajero`.
- `backend/CLAUDE.md` (Products): `categories list/retrieve` → `IsCajero`; `create/update/delete/upload_image` → `IsAdmin`.

## Review del Planner
- ✅ Correcto: el cajero puede **leer** categorías (chips del POS) y tiene **bloqueada la escritura**. `upload_image` cae en la rama `else` → `IsAdmin`. Tenant scoping intacto (`TenantModelViewSet.get_queryset`).
- Junto con el fix previo de products, cierra la escalada de privilegios del cajero.
- ⚠️ Nota: no se adjuntó salida de pruebas manuales; verificado por **revisión de código + semántica DRF** (permisos por acción). Recomendable correr una vez el POS como cajero para confirmar en runtime.

**Veredicto: 🟢 corrido-ok.**
