#!/usr/bin/env python3
"""Genera tools/elvuelto.ico desde el favicon del frontend.

Se corre UNA vez y el .ico queda commiteado: build.py no depende de Pillow.
Requiere Pillow (está en el .venv del backend):
    source el_vuelto_backend/.venv/bin/activate
    python el_vuelto_desktop/build/make-ico.py
"""
from pathlib import Path

from PIL import Image

RAIZ = Path(__file__).resolve().parents[2]
ORIGEN = RAIZ / "el_vuelto_frontend/assets/icons/El Vuelto - El_Vuelto_favicon_BG .png"
DESTINO = Path(__file__).resolve().parent / "elvuelto.ico"
TAMANOS = [(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]

img = Image.open(ORIGEN).convert("RGBA")
img.save(DESTINO, sizes=TAMANOS)
print(f"{DESTINO.name} escrito desde {ORIGEN.name} ({len(TAMANOS)} tamaños)")
