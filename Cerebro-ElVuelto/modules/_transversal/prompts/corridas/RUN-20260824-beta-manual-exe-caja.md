---
tags: [corrida, run, desktop, transversal]
status: activo
updated: 2026-08-24
---

# RUN-20260824 — Beta manual del `.exe` de caja (pedido directo)

**Pedido directo del owner** ([[GOBERNANZA]] §10), implementado por el Planner con modo plan aprobado.
Decisión: [[ADR-DESKTOP-20260824-wrapper-electron-y-generador-manual]].

## Qué se entregó
Carpeta nueva `el_vuelto_desktop/` (11 archivos) + un cambio de 8 líneas en el frontend.

| archivo | qué es |
|---|---|
| `build.py` (257 líneas) | el generador: entorno → URL → slug → `.exe` → `.zip` |
| `tools/patch-exe.js` | ícono + metadatos con `resedit` (JS puro, sin wine) |
| `tools/make-ico.py` | one-shot: `.ico` desde el favicon del front (Pillow) |
| `tools/elvuelto.ico` | commiteado; `build.py` no depende de Pillow |
| `app/main.js` (~360 líneas) | ventana, guardas, impresión silenciosa, setup |
| `app/preload.js` · `app/setup-preload.js` | dos puentes separados: uno angosto para la página remota, otro para la pantalla local |
| `app/setup.html` | selector de impresora + prueba de impresión |
| `app/config.js` | config horneada vs config del cajero |
| `README.md` | cómo generar y cómo diagnosticar |
| `el_vuelto_frontend/src/utils/printReceipt.ts` | rama de escritorio con fallback a navegador |

## Verificación con salida real

### 1. El pipeline de generación (probado de punta a punta, 2 corridas)
```
$ python3 build.py --env test --url 192.168.1.50:5173 --slug bambipan --name "BambiPan" --yes
  ✓ app/config.json → http://192.168.1.50:5173/login/bambipan
  ✓ ElVuelto-bambipan-win32-x64 (366 MB)
     ícono + metadatos escritos (RT_ICON: 7) — PE re-parseado OK
  ✓ ElVuelto-bambipan.zip (150 MB)
```
Sobre el binario resultante:
- `file` → `PE32+ executable (GUI) x86-64, for MS Windows`
- `resedit` re-parseado → `RT_ICON: 7 | RT_GROUP_ICON: 1`
- `ProductName: El Vuelto — BambiPan` · `CompanyName: El Vuelto` ·
  `OriginalFilename: ElVuelto-bambipan.exe`
- `resources/app/config.json` → `{"env":"test","baseUrl":"http://192.168.1.50:5173","slug":"bambipan",…}`
- el `.zip` contiene el `.exe`, `config.json` y `setup.html`

### 2. El CLI interactivo (11/11, contra una tty real por `pty`)
| caso | resultado |
|---|---|
| Test pide la IP y no asume localhost | ✅ (`localhost` no aparece ni una vez en la corrida) |
| arma `http://192.168.1.77:5173/login/bambipan` con lo tecleado | ✅ |
| cancelar en la confirmación no compila nada | ✅ |
| slug `Panadería Lucía!` rechazado con el formato de ejemplo | ✅ |
| dominio de Prod → `https://`, IP → `http://` | ✅ |
| el dominio de Prod se pregunta **una** vez y queda guardado | ✅ (2ª corrida ya no pregunta) |

### 3. Verificación de API contra el Electron instalado (44.0.0)
- `getPrintersAsync()` **existe** (`electron.d.ts:18180`).
- `WebContentsPrintOptions` acepta `silent`, `deviceName`, `margins`, `pageSize` y
  **`usePrinterDefaultPageSize`**.
- **`PrinterInfo` NO tiene `isDefault` ni `status`** — solo `description`, `displayName`, `name`,
  `options`. Ver hallazgo 2.
- Único otro `window.open` del front es el de WhatsApp (`SuccessModal.tsx:34`), con URL no vacía: el
  shim **no** se lo puede tragar.

### 4. Typecheck
`npx tsc --noEmit` → **exit 0** después del cambio en `printReceipt.ts`.

## Revisión adversarial — 5 hallazgos propios, los 5 arreglados
Hecha por el Planner leyendo su propio código contra la API real, **no** con un fan-out de agentes
(el owner tiene pedido explícito de no lanzar agentes/workflows en esta sesión). Es una desviación de
[[GOBERNANZA]] §10 punto 2 y se anota, no se esconde.

1. 🔴 **La pantalla de impresoras se apoyaba en campos que no existen.** Leía `p.isDefault` y `p.status`;
   en Electron 44 `PrinterInfo` no los tiene. Efecto: nunca preseleccionaba nada y **Guardar quedaba
   deshabilitado** hasta que el cajero tocara un radio. → `esPredeterminada()` mira `options` de forma
   defensiva y, si no hay señal, preselecciona la primera.
2. 🔴 **El tamaño de página estaba al revés para una térmica.** "Automático" no mandaba nada, y sin nada
   Chromium asume Carta/A4 — sobre un rollo de 80 mm eso sale cortado o comiéndose el papel. →
   `usePrinterDefaultPageSize: true`, que es exactamente "usá el tamaño del driver".
3. 🔴 **Diálogo modal colgado de una ventana oculta.** Si el servidor no responde, `ready-to-show` nunca
   dispara: el aviso "no se pudo conectar" podía quedar invisible detrás de una ventana que no se mostró.
   → se fuerza `show()` antes del diálogo.
4. 🔴 **El setup se abría antes que su ventana padre.** Era hija de `mainWindow` y se lanzaba en
   `whenReady`, no en `ready-to-show`. → se abre desde `ready-to-show`.
5. 🔴 **El `.gitignore` raíz se estaba tragando piezas esenciales.** La carpeta se llamaba `build/`, y
   `.gitignore:33` ignora `build/` (regla legítima, del frontend). Efecto: `elvuelto.ico` y
   `patch-exe.js` **no** habrían entrado al commit y en un clon nuevo `build.py` fallaba al marcar el
   `.exe`. Salió de mirar qué archivos veía `git` de verdad, no de leer código. → carpeta renombrada a
   `tools/`, sin tocar la regla global; regenerado desde cero para confirmar.

## ⚠️ Lo que NO se probó, y por qué
**No salió un solo recibo de papel.** Este Mac no tiene ninguna impresora (`lpstat -p` → *No
destinations added*) y el owner pidió explícitamente no gastar tiempo probando en Mac. Queda sin
verificar, todo del lado de Windows:
- que el `.exe` arranque y muestre el ícono;
- que la lista de impresoras salga poblada;
- que `silent: true` imprima sin diálogo en la térmica 80 mm;
- cuál de las dos opciones de tamaño de página se ve bien en el papel.

Para eso está la traza: `set ELVUELTO_DEBUG=1 && ElVuelto-<slug>.exe` imprime en consola si el shim se
instaló, cuántos bytes de recibo llegaron, con qué opciones se mandó y qué contestó el driver.

## Doble actualización
- `CLAUDE.md` raíz: `el_vuelto_desktop/` como tercer paquete del monorepo.
- `el_vuelto_frontend/CLAUDE.md`: `printReceipt.ts` es **desktop-aware** y por qué no se puede borrar el
  fallback de navegador.
- Cerebro: este RUN + [[ADR-DESKTOP-20260824-wrapper-electron-y-generador-manual]] + ficha y backlog.

## Veredicto
✅ **Generación verificada de punta a punta; impresión sin verificar por falta de hardware.** El
entregable está listo para que el owner lo pruebe en Windows con la térmica.
