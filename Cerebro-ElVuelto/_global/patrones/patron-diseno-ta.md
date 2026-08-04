---
tags: [patron, global, diseno, frontend]
status: vivo
updated: 2026-08-02
---

# Patrón — Sistema de diseño `ta-*` ("The Hearth & The Ledger")

> [!warning] LÉEME SI VAS A TOCAR: cualquier página de admin o super-admin.

## Reglas duras
- Las páginas de admin usan las clases **`ta-*` directamente** en `className`. **NO crees un `.module.css` nuevo por página.** Todo el CSS compartido vive en `src/styles/tenant-admin.css`.
- Las primitivas de `src/components/ui/*` (Button, Card, Modal, Input, Badge, Spinner…) **sí** tienen su propio `.module.css`: son componentes reutilizables, distintos del sistema `ta-*`.

## Tokens (`src/styles/globals.css`)
- `--primary` `#6a2600` (terracota) · `--surface-container` `#f4ede2` (pergamino) · `--background` `#fff8f0`.
- Fuentes: `--font-sans` Plus Jakarta Sans (UI), `--font-serif` Noto Serif (títulos), `--font-mono` JetBrains Mono (números/códigos).

## Shell de layout
- `AdminLayout` (`src/layouts/AdminLayout.tsx`) y `SuperAdminLayout` (`src/features/layout/super-admin/index.tsx`) comparten `LayoutContext` (**canónico en `src/layouts/LayoutContext.tsx`**; el de `features/layout/super-admin/` es un re-export).
- Sidebar 3 modos (expanded ≥1450px, collapsed rail 72px, mobile overlay ≤768px). CSS vars: `--sa-sidebar-w: 256px`, `--sa-sidebar-collapsed-w: 72px`, `--sa-header-h: 64px`.

## Nota Fase 3
El catálogo completo de clases `ta-*` está hoy embebido en el `CLAUDE.md` raíz → candidato a extraer a `CLAUDE_DESIGN.md`. Ver [[DOCS-20260802-corregir-claudemd-drift]].

## Enlaces
[[patron-cloudinary]]
