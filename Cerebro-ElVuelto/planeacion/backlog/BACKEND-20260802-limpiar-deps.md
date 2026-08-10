---
tags: [tarea, backend, limpieza]
status: 🟢
prioridad: alta
updated: 2026-08-03
---

> [!decision] 🟢 RESUELTO 2026-08-03 — `requirements.txt` con 1 sola `cloudinary` y sin `python-escpos` (0 usos). Docs corregidas (root + backend CLAUDE.md: recibos en el front, sin dependencia de impresión). ([[PROMPT-FIX-CLEANUP-20260803-d4-codigo-muerto-deps-ruta-test]])

# BACKEND-20260802-limpiar-deps — Deduplicar cloudinary y quitar python-escpos

**Tipo:** limpieza · **Sprint:** [[Sprint-2026-08-02-estabilizacion-doc]] · **Decisión:** D-4

## Problema
- `cloudinary==1.44.2` duplicado en `requirements.txt:9-10`.
- `python-escpos==3.1` (`requirements.txt:7`) no se usa (grep=0). Ver [[patron-impresion-recibos]] y [[riesgo-deps-duplicadas-y-escpos]].

## Criterio de aceptación
`requirements.txt` sin duplicados y sin `python-escpos`. `pip install -r requirements.txt` limpio. `grep -r escpos` sigue en 0.

## Notas para el Dev
- Antes de quitar `python-escpos`, confirmar (grep) que de verdad no se importa en ningún `.py`.
- Doble actualización: corregir la afirmación de "impresión ESC/POS backend" en `CLAUDE.md` raíz y `backend/CLAUDE.md` (va junto con [[DOCS-20260802-corregir-claudemd-drift]]).
