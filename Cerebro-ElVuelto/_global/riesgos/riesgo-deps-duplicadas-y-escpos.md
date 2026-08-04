---
tags: [riesgo, global, backend, deps]
status: vivo
severidad: baja
updated: 2026-08-02
---

# Riesgo — Dependencias: `cloudinary` duplicado y `python-escpos` muerto

**Severidad:** 🟡 baja (higiene) · **Fix prioritario:** sí (decisión D-4)

## Qué
- `cloudinary==1.44.2` aparece **dos veces** en `requirements.txt:9-10`.
- `python-escpos==3.1` (`requirements.txt:7`) **no se importa en ningún `.py`** del backend (grep = 0). Dependencia muerta; contradice la afirmación de "impresión ESC/POS backend" de los CLAUDE.md (ver [[patron-impresion-recibos]]).

## Impacto
Bajo: ruido en el entorno, instala una librería que nadie usa, y alimenta una mentira en la documentación.

## Fix
Deduplicar `cloudinary`, eliminar `python-escpos`, corregir los CLAUDE.md. Ver [[BACKEND-20260802-limpiar-deps]] y [[DOCS-20260802-corregir-claudemd-drift]].
