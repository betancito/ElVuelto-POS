#!/usr/bin/env python3
"""Generador manual de la app de escritorio de caja de El Vuelto (Windows).

Pregunta entorno (Test/Prod), la URL del servidor y el negocio, y deja el
.exe listo para entregar. Sin dependencias fuera de la stdlib: lo pesado lo
hace npm. Genera SIEMPRE para Windows x64 — es donde vive la caja.

    python build.py                 # interactivo
    python build.py --env test --url 192.168.1.50:5173 --slug bambipan --yes

En TEST la URL se pide siempre (el servidor de pruebas vive en otra máquina
de la red local, no acá). En PROD el dominio se pregunta una vez y queda
guardado en urls.json.
"""
from __future__ import annotations

import argparse
import json
import re
import shutil
import subprocess
import sys
from pathlib import Path
from urllib.parse import urlparse

RAIZ = Path(__file__).resolve().parent
APP = RAIZ / "app"
DIST = RAIZ / "dist"
URLS = RAIZ / "urls.json"  # estado local (gitignored): recuerda a dónde apuntaste
ICO = RAIZ / "tools" / "elvuelto.ico"

SLUG_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")


# ── utilidades de consola ────────────────────────────────────────────────
def titulo(texto: str) -> None:
    print(f"\n\033[1;38;5;130m{texto}\033[0m")


def ok(texto: str) -> None:
    print(f"  \033[32m✓\033[0m {texto}")


def error(texto: str) -> int:
    print(f"  \033[31m✗\033[0m {texto}", file=sys.stderr)
    return 1


def preguntar(etiqueta: str, defecto: str = "", mostrar_defecto: bool = True) -> str:
    sufijo = f" [{defecto}]" if defecto and mostrar_defecto else ""
    try:
        respuesta = input(f"{etiqueta}{sufijo}: ").strip()
    except (EOFError, KeyboardInterrupt):
        print()
        sys.exit(1)
    return respuesta or defecto


# ── configuración de URLs ────────────────────────────────────────────────
def cargar_urls() -> dict:
    try:
        return json.loads(URLS.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {"test": "", "prod": ""}


def guardar_urls(urls: dict) -> None:
    URLS.write_text(json.dumps(urls, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


IP_RE = re.compile(r"^\d{1,3}(?:\.\d{1,3}){3}(?::\d+)?$")


def normalizar_url(url: str) -> str | None:
    url = url.strip().rstrip("/")
    if not url:
        return None
    if not url.startswith(("http://", "https://")):
        # Una IP de red local o un host con puerto va por http; un dominio,
        # por https. Poner https sobre 192.168.x.x deja la caja sin abrir.
        sin_ruta = url.split("/")[0]
        casero = IP_RE.match(sin_ruta) or sin_ruta.startswith("localhost") or ":" in sin_ruta
        url = ("http://" if casero else "https://") + url
    partes = urlparse(url)
    if not partes.netloc:
        return None
    return f"{partes.scheme}://{partes.netloc}{partes.path.rstrip('/')}"


def resolver_base_url(entorno: str, urls: dict, url_manual: str | None, interactivo: bool) -> str | None:
    if url_manual:
        base = normalizar_url(url_manual)
        if not base:
            error(f"URL inválida: «{url_manual}».")
        return base

    # TEST: se pregunta SIEMPRE. El servidor de pruebas vive en otra máquina
    # de la red local y su IP cambia; hornear una vieja es hornear un binario
    # que no abre.
    if entorno == "test":
        if not interactivo:
            error("En test hay que pasar --url (ej: --url 192.168.1.50:5173).")
            return None
        pista = f" — la última fue {urls['test']}" if urls.get("test") else ""
        print(f"\n  ¿Dónde está corriendo el servidor de pruebas?{pista}")
        base = normalizar_url(preguntar("  IP:puerto o URL (ej: 192.168.1.50:5173)"))
        if not base:
            error("URL inválida.")
            return None
        urls["test"] = base
        guardar_urls(urls)
        return base

    # PROD: el dominio no cambia, se pregunta una vez y queda guardado.
    guardada = urls.get("prod", "")
    if guardada:
        return normalizar_url(guardada)
    if not interactivo:
        error("No hay dominio de prod guardado. Pasalo con --url o llená urls.json.")
        return None
    print("\n  No hay dominio de PROD guardado. Escribilo una vez y queda guardado.")
    base = normalizar_url(preguntar("  Dominio de PROD (ej: elvuelto.com)"))
    if not base:
        error("URL inválida.")
        return None
    urls["prod"] = base
    guardar_urls(urls)
    ok(f"Guardado en urls.json → {base}")
    return base


# ── build ────────────────────────────────────────────────────────────────
def version_electron() -> str:
    pkg = json.loads((RAIZ / "package.json").read_text(encoding="utf-8"))
    return pkg["devDependencies"]["electron"].lstrip("^~")


def version_app() -> str:
    return json.loads((APP / "package.json").read_text(encoding="utf-8"))["version"]


def asegurar_dependencias() -> bool:
    if (RAIZ / "node_modules").is_dir():
        return True
    titulo("Instalando dependencias (solo la primera vez)")
    resultado = subprocess.run(["npm", "install"], cwd=RAIZ)
    return resultado.returncode == 0


def empaquetar(nombre: str, plataforma: str, arquitectura: str) -> Path | None:
    comando = [
        "npx", "--yes", "@electron/packager", str(APP), nombre,
        f"--platform={plataforma}",
        f"--arch={arquitectura}",
        f"--electron-version={version_electron()}",
        f"--app-version={version_app()}",
        f"--out={DIST}",
        "--overwrite",
    ]
    if subprocess.run(comando, cwd=RAIZ).returncode != 0:
        return None
    destino = DIST / f"{nombre}-{plataforma}-{arquitectura}"
    return destino if destino.is_dir() else None


def marcar_exe(carpeta: Path, nombre: str, display: str) -> bool:
    exe = carpeta / f"{nombre}.exe"
    if not exe.is_file():
        error(f"No apareció {exe.name} — el empaquetado no terminó bien.")
        return False
    producto = f"El Vuelto — {display}" if display else "El Vuelto POS"
    comando = ["node", str(RAIZ / "tools" / "patch-exe.js"), str(exe), str(ICO), producto, version_app()]
    return subprocess.run(comando, cwd=RAIZ).returncode == 0


def comprimir(carpeta: Path, nombre: str) -> Path:
    destino = DIST / nombre
    if destino.with_suffix(".zip").exists():
        destino.with_suffix(".zip").unlink()
    return Path(shutil.make_archive(str(destino), "zip", root_dir=carpeta.parent, base_dir=carpeta.name))


def tamano(ruta: Path) -> str:
    if ruta.is_file():
        bytes_ = ruta.stat().st_size
    else:
        bytes_ = sum(f.stat().st_size for f in ruta.rglob("*") if f.is_file())
    return f"{bytes_ / 1024 / 1024:.0f} MB"


# ── main ─────────────────────────────────────────────────────────────────
def main() -> int:
    parser = argparse.ArgumentParser(description="Genera la app de escritorio de caja de El Vuelto.")
    parser.add_argument("--env", choices=["test", "prod"], help="entorno al que apunta el ejecutable")
    parser.add_argument("--slug", help="slug del negocio (el de /login/<slug>)")
    parser.add_argument("--name", help="nombre visible del negocio")
    parser.add_argument("--url", help="URL base a la fuerza (ignora urls.json)")
    parser.add_argument("--yes", action="store_true", help="no pedir confirmación")
    args = parser.parse_args()

    interactivo = sys.stdin.isatty()
    urls = cargar_urls()

    titulo("El Vuelto — generador de app de caja")

    # 1) entorno
    entorno = args.env
    if not entorno:
        if not interactivo:
            return error("Falta --env (test|prod).")
        print("  1. Test  (te pregunto la IP del servidor)")
        print(f"  2. Prod  ({urls.get('prod') or 'sin definir — te lo pregunto'})")
        opcion = preguntar("Entorno [1/2]", "1", mostrar_defecto=False)
        if opcion not in ("1", "2"):
            return error("Elegí 1 o 2.")
        entorno = "test" if opcion == "1" else "prod"

    base_url = resolver_base_url(entorno, urls, args.url, interactivo)
    if not base_url:
        return 1

    # 2) negocio
    slug = args.slug
    if not slug:
        if not interactivo:
            return error("Falta --slug.")
        slug = preguntar("Slug del negocio")
    slug = slug.strip().lower()
    if not SLUG_RE.match(slug):
        return error(f"Slug inválido: «{slug}». Solo minúsculas, números y guiones (ej: panaderia-lucia).")

    display = args.name if args.name is not None else (preguntar("Nombre visible", slug) if interactivo else slug)

    destino_url = f"{base_url}/login/{slug}"
    plataforma, arquitectura = "win32", "x64"  # la caja es Windows; no se genera para otra cosa
    nombre = f"ElVuelto-{slug}"

    print()
    print(f"  Negocio : {display} ({slug})")
    print(f"  Entorno : {entorno.upper()}")
    print(f"  Abre    : {destino_url}")
    print(f"  Genera  : {nombre}.exe (Windows x64)")

    if not args.yes and interactivo:
        if preguntar("\n¿Generar? [S/n]", "S", mostrar_defecto=False).lower() not in ("s", "si", "sí", "y", "yes"):
            print("Cancelado.")
            return 0

    if not asegurar_dependencias():
        return error("Falló `npm install`.")

    # 3) config horneada: a qué negocio y a qué servidor apunta este binario
    titulo("Horneando la configuración")
    config = {"env": entorno, "baseUrl": base_url, "slug": slug, "displayName": display}
    (APP / "config.json").write_text(json.dumps(config, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    ok(f"app/config.json → {destino_url}")

    titulo(f"Empaquetando ({plataforma}/{arquitectura}) — la primera vez baja ~100 MB de Electron")
    carpeta = empaquetar(nombre, plataforma, arquitectura)
    if not carpeta:
        return error("Falló el empaquetado.")
    ok(f"{carpeta.name} ({tamano(carpeta)})")

    titulo("Marcando el ejecutable con el logo de El Vuelto")
    if not marcar_exe(carpeta, nombre, display):
        return error("Falló el ícono/metadata del .exe.")

    titulo("Comprimiendo para entregar")
    zip_final = comprimir(carpeta, nombre)
    ok(f"{zip_final.name} ({tamano(zip_final)})")

    print(f"\n\033[1;32mListo.\033[0m Pasá este archivo al equipo de la caja:\n  {zip_final}")
    print(f"\n  Allá: descomprimir y abrir \033[1m{nombre}.exe\033[0m.")
    print("  La primera vez pide la impresora. Windows va a avisar que el archivo")
    print("  no está firmado → \"Más información\" → \"Ejecutar de todas formas\".")
    print(f"\n  Si algo no imprime, corrélo desde cmd con la traza prendida:")
    print(f"    set ELVUELTO_DEBUG=1 && {nombre}.exe")

    return 0


if __name__ == "__main__":
    sys.exit(main())
