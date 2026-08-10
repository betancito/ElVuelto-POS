---
tags: [prompt, docs, drift]
status: 🟢
updated: 2026-08-03
---

# Prompt DEV — Corregir drift doc↔código en los CLAUDE.md

**Tarea backlog:** [[DOCS-20260802-corregir-claudemd-drift]] · **Sprint:** [[Sprint-2026-08-03-correccion-docs]]
**Alcance:** SOLO doc — 4 correcciones factuales. No código. No git. (El split del `backend/CLAUDE.md` va aparte; ver "Fuera de alcance".)

## Contexto
Fuente de verdad: el código real + los `contratos-<mod>` del cerebro. Reconfirmado 2026-08-03 (confirma al abrir).

## Qué corregir
1. **Ruta mala de la API base.** `CLAUDE.md:56` (raíz) y `el_vuelto_frontend/CLAUDE.md:45` citan `app/api/baseApi.ts`. Real: **`src/app/apiBase.ts`**, instancia **`apiBase`** (`injectEndpoints`). Corregir ambas.
2. **Conteo de endpoints de reports.** `el_vuelto_frontend/CLAUDE.md:144` lista 3 (`getSummary`, `getVentasPorHora`, `getTopProductos`); faltan **`getVentasPorDia`** y **`getSalesDetail`** (real = 5, ver `reportsApi.ts`). Revisar también la sección Reports del `el_vuelto_backend/CLAUDE.md` (endpoints `ventas-por-dia/` y `sales-detail/` faltan) y agregarlos.
3. **`lead_cashier` sin documentar.** Es un campo real de `User` (`apps/users/models.py:46`, `BooleanField`, "cajero líder"). Documentarlo en el modelo User del `backend/CLAUDE.md` (y en la interfaz `AuthUser` del `frontend/CLAUDE.md` si aplica al payload).
4. **`UpdateMeView` sin documentar.** Existe: `PATCH /api/auth/me/update/` (`apps/users/views.py:38-39`, `urls.py:15`) — actualiza nombre/correo/password propios. Agregarlo a la tabla de endpoints Auth del `backend/CLAUDE.md` (junto a `GET /api/auth/me/`).

## Restricciones
- Solo doc (`CLAUDE.md` raíz, `el_vuelto_frontend/CLAUDE.md`, `el_vuelto_backend/CLAUDE.md`). NO código.
- No dupliques el cerebro; corrige el texto existente.
- **Fuera de alcance (NO en este prompt):** partir `backend/CLAUDE.md` (455>400). Es un follow-up opcional que el owner decidirá; si lo hicieras, sería otra tarea. No lo abordes aquí.

## Entregable / verificación (salida REAL)
- `grep -rniE "app/api/baseApi" CLAUDE.md el_vuelto_frontend/CLAUDE.md` → **0** (pegar salida).
- `grep -niE "ventas-por-dia|sales-detail|getVentasPorDia|getSalesDetail" el_vuelto_frontend/CLAUDE.md el_vuelto_backend/CLAUDE.md` → aparecen (reports = 5).
- `grep -rniE "lead_cashier|me/update" el_vuelto_backend/CLAUDE.md` → aparecen ambos.
- Veredicto ✅ / 🔴.
