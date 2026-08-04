---
tags: [patron, global, impresion, recibos]
status: vivo
updated: 2026-08-02
---

# Patrón — Impresión y recibos (¡es todo FRONTEND!)

> [!warning] Corrige una mentira de los CLAUDE.md
> Ambos `CLAUDE.md` dicen que la impresión es backend vía `python-escpos`. **Falso.** La impresión/recibos son **100% frontend**.

## Realidad (verificado)
- `el_vuelto_frontend/src/utils/printReceipt.ts` — recibo térmico 80mm (impresión navegador).
- `el_vuelto_frontend/src/utils/generateReceipt.ts` — recibo PDF con **jsPDF** (`jspdf ^4.2.1` en `package.json`) para descarga.
- `el_vuelto_frontend/src/utils/downloadCredentials.ts` — exporta credenciales a `.txt`.
- `el_vuelto_backend/apps/reports/views.py:112-178` (`SalesDetailExportView`) provee los **datos** de exportación (incl. `tenant_nombre`, `tenant_logo_url`), pero **no imprime**.

## Dependencia muerta
- `python-escpos==3.1` está en `requirements.txt:7` pero **no se importa en ningún `.py`** (grep = 0). Es una dependencia muerta. Ver [[BACKEND-20260802-limpiar-deps]] y [[DOCS-20260802-corregir-claudemd-drift]].

## Enlaces
[[patron-cloudinary]] · [[patron-formato-cop]]
