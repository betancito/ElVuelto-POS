---
tags: [riesgo, global, backend, deps]
status: resuelto
severidad: baja
updated: 2026-08-15
---

# Riesgo — Dependencias: `cloudinary` duplicado y `python-escpos` muerto

**Severidad:** 🟡 baja (higiene) · **Estado:** 🟢 RESUELTO 2026-08-03 — `requirements.txt` deduplicado y sin `python-escpos`; docs corregidas. Ver [[BACKEND-20260802-limpiar-deps]].

## Qué
- `cloudinary==1.44.2` aparece **dos veces** en `requirements.txt:9-10`.
- `python-escpos==3.1` (`requirements.txt:7`) **no se importa en ningún `.py`** del backend (grep = 0). Dependencia muerta; contradice la afirmación de "impresión ESC/POS backend" de los CLAUDE.md (ver [[patron-impresion-recibos]]).

## Impacto
Bajo: ruido en el entorno, instala una librería que nadie usa, y alimenta una mentira en la documentación.

## Fix
Deduplicar `cloudinary`, eliminar `python-escpos`, corregir los CLAUDE.md. Ver [[BACKEND-20260802-limpiar-deps]] y [[DOCS-20260802-corregir-claudemd-drift]].

> [!warning] El repo quedó limpio; el `.venv` no — verificado en el PASO 0 del 2026-08-15
> `requirements.txt` hoy tiene 10 líneas y ninguna es escpos (se borró en el commit `a15f6cc`). Pero en
> el virtualenv local **`python-escpos 3.1` sigue instalado** como paquete top-level, arrastrando
> `python-barcode 0.16.1`, `qrcode 8.2`, `appdirs`, `argcomplete`, `importlib_resources` y `setuptools`
> que nadie más pide. Se removió de la declaración; nunca se corrió el `pip uninstall`.
>
> Hallazgo nuevo del mismo chequeo: **`Pillow==11.1.0` (`requirements.txt:6`) es dependencia muerta** —
> cero `from PIL`/`import PIL` en todo el backend, cero `ImageField`/`FileField` en los modelos (las
> imágenes van a Cloudinary como `CharField` de URL + `public_id`), y `cloudinary` **no lo requiere**
> (`Requires: certifi, six, urllib3`). Su único `Required-by` en el venv es justamente el escpos ya
> retirado. `pip check` → *No broken requirements found*: es higiene, no rompe nada en runtime.
>
> Ojo con la ancla vieja de arriba: `requirements.txt:7` **hoy dice `psycopg2-binary==2.9.10`**, no
> escpos. La referencia quedó corrida cuando el archivo cambió.
