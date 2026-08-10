---
tags: [prompt, docs, tenancy, seguridad]
status: 🔴
updated: 2026-08-03
---

# Prompt DEV — Corregir la mentira de tenancy en los CLAUDE.md

**Tarea backlog:** [[DOCS-20260802-corregir-claudemd-tenancy]] · **Sprint:** [[Sprint-2026-08-03-correccion-docs]]
**Alcance:** SOLO doc. Corregir 3 afirmaciones falsas sobre aislamiento de tenant. **No tocar código.** No git.

## Contexto — la verdad verificada
Leer `Cerebro-ElVuelto/_global/patrones/patron-tenancy.md` (fuente de verdad, verificada contra código) y `apps/tenants/models.py`, `apps/tenants/viewsets.py`.
- `TenantMixin` (`apps/tenants/models.py`) **solo añade un FK `tenant`** — NO filtra nada.
- El aislamiento es por **filtrado explícito**: o `.filter(tenant=request.tenant)` a mano en cada vista, o heredar `TenantModelViewSet` (que filtra vía `_get_tenant()` → `require_tenant`). Hoy **solo** `CategoryViewSet`/`ProductViewSet` usan la base; reports, sales, inventory, users **filtran a mano**.
- No hay RLS de Postgres: **no hay red de seguridad en la BD**. Si olvidas filtrar, filtras datos de todos los tenants.

## Las mentiras a corregir (anclas actuales)
1. `CLAUDE.md:49` (raíz) — "all models use `TenantMixin` which **auto-filters** QuerySets by `tenant_id`". **Falso.**
2. `CLAUDE.md:93` (raíz) — "Tenant scoping is automatic via `TenantMixin`; **never manually filter** by tenant in views — rely on the mixin". **Falso y peligroso** (invita a NO filtrar).
3. `el_vuelto_backend/CLAUDE.md:61` — "**Core rule: never manually filter** by tenant in views. The system enforces isolation automatically." **Falso y peligroso.**

## Qué hacer
1. Reescribir esas 3 afirmaciones para que digan la regla REAL, p.ej.:
   - `TenantMixin` **agrega el FK `tenant`**, no filtra.
   - **Regla dura:** toda vista/queryset tenant-scoped DEBE filtrar por `request.tenant` — a mano (`.filter(tenant=request.tenant)`) o heredando `TenantModelViewSet`. Nunca asumas que "el mixin" filtra.
   - Superadmin/tenant inválido = `request.tenant` None → usar `require_tenant(request)` (403). **Nunca `request.tenant is None`** (es `SimpleLazyObject`; ver el gotcha en `backend/CLAUDE.md` "Design Patterns").
   - RLS = meta futura; hoy no hay red de seguridad en BD.
2. En `backend/CLAUDE.md`, revisar que el punto 3 de "How it works" (`:69`, `TenantModelViewSet`) aclare que **la mayoría de vistas NO heredan la base** y filtran a mano (para no dar a entender que aplica a todo).

## Restricciones
- Solo doc (`CLAUDE.md` raíz + `el_vuelto_backend/CLAUDE.md`). NO cambiar código.
- **Fuera de alcance:** partir `backend/CLAUDE.md` (455>400 líneas) y el resto del drift → van en [[DOCS-20260802-corregir-claudemd-drift]]. (Opcional: si quieres extraer un `CLAUDE_TENANCY.md`, coordínalo con esa tarea; no es obligatorio aquí.)

## Entregable / verificación
- `grep -niE "auto-filter|never manually filter|rely on the mixin" CLAUDE.md el_vuelto_backend/CLAUDE.md` → **0 resultados** (pegar salida).
- Confirmar (leyendo) que el texto nuevo coincide con [[patron-tenancy]].
- Veredicto ✅ / 🔴.
