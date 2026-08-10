---
tags: [tarea, docs]
status: 🟢
prioridad: media
updated: 2026-08-05
---

> [!done] CERRADO 2026-08-05 — las 13 afirmaciones corregidas en dos tandas: [[RUN-20260805-usercreate-tenant-y-docs]] (10) y [[RUN-20260805-seed-cajero-y-3-docs]] (3). Lo único diferido sigue siendo partir `backend/CLAUDE.md` (>400 líneas), opcional por decisión del owner.

> [!warning] 🟡 REABIERTO 2026-08-04 — el 🟢 fue prematuro
> El PASO 0 auditó los tres `CLAUDE.md` completos contra código y quedan **12 afirmaciones que el código desmiente**. Lo que sí está cerrado: la mentira peligrosa de tenancy ("auto-filtra") y lo de ESC/POS — ambos verificados. Lo que falta:
>
> | Gravedad | Afirmación falsa | Ancla |
> |---|---|---|
> | 🔒 alta | `ProductViewSet` "gets it for free" de `require_tenant` — no, sobreescribe `get_queryset()` | `backend/CLAUDE.md:460` |
> | 🔒 alta | `filter(tenant=None)` "→ empty (not 500)" — es 500 (`TypeError`), verificado ejecutando | `backend/CLAUDE.md:462` |
> | media | `POST /api/inventory/movements/` documentado como `IsAdmin`; es `IsCajero` + `lead_cashier` | `backend/CLAUDE.md:291` vs `apps/inventory/views.py:29-39` |
> | media | credenciales del cajero de `seed_dev_data` no coinciden | `backend/CLAUDE.md:448` vs `seed_dev_data.py:65-77` |
> | media | `DashboardPage.tsx` ubicado en `features/reports/`; vive en `features/dashboard/` | `frontend/CLAUDE.md:148` |
> | media | `npm run commit` listado como comando del frontend; el script solo existe en la raíz | `frontend/CLAUDE.md:13` y `CLAUDE.md:36` |
> | media | `backend/CLAUDE.md` mide **463** líneas (presupuesto <400) | GOBERNANZA §3 |
> | baja | query params inexistentes en inventory y sales | `backend/CLAUDE.md:290,300` |
> | baja | `?fecha` "obligatorio" en ventas-por-hora; omite `top_productos` | `backend/CLAUDE.md:329-330` |
> | baja | falta `support_number` en el modelo `Tenant` | `backend/CLAUDE.md:127-131` |
> | baja | `var(--font-serif)` mapeado a Noto Serif; en `globals.css` es Playfair Display | `frontend/CLAUDE.md:228` |
> | baja | tabla de rutas incompleta (`/profile`, `/super-admin/history`, `/staff`) | `frontend/CLAUDE.md:162-177` |
>
> Las **dos 🔒 altas se extrajeron a su propia tarea** por ser garantías de seguridad falsas: [[DOCS-20260804-claudemd-garantia-falsa]]. Esta tarea se queda con el resto.

> [!decision] 🟢 Parcialmente resuelto 2026-08-03 (correcciones) — ruta `apiBase`, reports=5, `lead_cashier` (verificado: cajero líder puede ENTRADA) y `UpdateMeView` documentados. ESC/POS ya se había corregido en la limpieza D-4. **Diferido (opcional):** partir `backend/CLAUDE.md` (~460>400 líneas) — el owner decidió dejarlo opcional; solo ~60 líneas sobre presupuesto. ([[PROMPT-FIX-DOCS-20260803-claudemd-drift]])

# DOCS-20260802-corregir-claudemd-drift — Corregir drift y partir CLAUDE.md

**Tipo:** doc

## Problema (drift doc↔código detectado)
- Ruta muerta: `app/api/baseApi.ts` (real: `src/app/apiBase.ts`, instancia `apiBase`). `CLAUDE.md:56`, `frontend/CLAUDE.md:45`.
- Impresión ESC/POS backend = falso (es frontend). Ver [[patron-impresion-recibos]].
- `reports`: docs listan 3 endpoints, hay **5** (`ventas-por-dia`, `sales-detail`). Ver [[sales--reports]].
- `lead_cashier` (rol de cajero líder) no documentado.
- `UpdateMeView` (`PATCH /api/auth/me/update/`) no documentado.
- `backend/CLAUDE.md` = **445 líneas** > presupuesto de 400 → partir (ej. `CLAUDE_MODELS.md`, `CLAUDE_API.md`).

## Criterio de aceptación
Cada `CLAUDE_*.md` < 400 líneas, con "LÉEME SI VAS A TOCAR: …" al inicio. Rutas y conteos corregidos. Sin repetir el cerebro (se enlazan).

## Notas para el Dev
- Fuente: los patrones de `_global/` y los `contratos-<mod>` del cerebro.
- Solo doc; no tocar código.
