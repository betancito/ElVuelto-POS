---
tags: [riesgo, global, backend, deps]
status: resuelto
severidad: baja
updated: 2026-08-30
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


> [!warning] Re-verificado el 2026-08-30 — y ahora el `.venv` está desalineado en las DOS direcciones
> **Le sobra** (sigue igual): `pip list` en `el_vuelto_backend/.venv` devuelve `python-escpos 3.1` con
> su cola completa — `appdirs 1.4.4`, `argcomplete 3.7.0`, `importlib_resources 7.1.0`,
> `python-barcode 0.16.1`, `PyYAML 6.0.3`, `qrcode 8.2`, `six 1.17.0`. `requirements.txt` tiene 11
> líneas y ninguna es escpos; `grep -rn escpos --include=*.py apps elvuelto` → **0 hits**.
>
> **Le falta** (nuevo desde `abee9d8`): `pip show gunicorn` → *"Package(s) not found"*, aunque
> `requirements.txt:11` lo declara desde este commit. No rompe nada hoy
> (`docker/backend/Dockerfile:42` lo instala en su propio `/opt/venv` y el dev local corre
> `runserver`), pero el `.venv` ya **no es reproducible desde `requirements.txt` en ninguna dirección**.
>
> **Dato nuevo sobre Pillow:** `pip show pillow` → `Required-by: python-escpos`. O sea que en el venv
> Pillow **no es top-level**: es cola del escpos muerto. Sigue declarado en `requirements.txt:6` y sigue
> sin usarse — los únicos hits de `ImageField` son migraciones históricas
> (`products/migrations/0001_initial.py:44`, `tenants/migrations/0001_initial.py:23`); los modelos vivos
> usan `URLField` (`products/models.py:18-19`, `tenants/models.py:69-70`).
> Ver [[2026-08-30-planner-paso0-resync]].
