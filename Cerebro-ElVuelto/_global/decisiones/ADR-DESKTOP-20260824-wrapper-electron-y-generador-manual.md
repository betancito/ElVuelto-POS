---
tags: [adr, desktop, global, impresion]
status: aceptado
updated: 2026-08-24
---

# ADR-DESKTOP-20260824 — Wrapper Electron para la caja y generador manual del `.exe`

## Contexto
[[DESKTOP-20260821-app-escritorio-cajero-exe]] dejó evaluada la app de escritorio y propuso Electron,
pero **nada implementado** y con dos supuestos que condicionaban el plan: que hacía falta CI en Windows
para producir un `.exe`, y que la fase 1 se validaría en el Mac contra `localhost`.

El 2026-08-24 el owner pidió **adelantar una beta manual**: un comando local que pregunte
**Test/Prod** y el **tenant**, y genere el ejecutable — sin módulo de descarga, sin CI, sin firma.
Sumó el selector de impresora en el primer arranque. Y puso dos restricciones que corrigen la ficha:

> "NO VOY A TESTEAR EN LA MAC… ESTE WEBAPP ESTA PENSADO PARA WINDOWS NO PARA MAC" ·
> "CUANDO SEA TEST NO LO PONGAS LOCALHOST POR DEFECTO PONLO PARA QUE EL QUE EJECUTE EL COMANDO TENGA QUE
> PROVEER LA IP (VOY A MONTAR Y EXPONER A MI RED LOCAL EL PROYECTO… DESDE UNO LINUX YO ME ENCARGO)"

El motivo que sostiene todo sigue siendo el mismo: `printReceipt.ts:22` abre una ventana y llama
`win.print()`, o sea **el diálogo del SO en cada venta**. Es lo único que un navegador no puede evitar.

## Decisión
Aprobada por el owner el 2026-08-24 (modo plan, [[GOBERNANZA]] §10).

1. **Electron**, ratificando la propuesta de la ficha. Carpeta nueva `el_vuelto_desktop/` con su propio
   `package.json` — tercer paquete del monorepo, junto a backend y frontend.
2. **Generador manual en Python** (`build.py`, solo stdlib): pregunta entorno y negocio, hornea
   `app/config.json`, empaqueta y marca el `.exe`. **Sin módulo de descarga en el tenant admin** — eso
   queda para la fase 2.
3. **Solo Windows x64.** No se genera para macOS ni Linux: la caja es Windows y generar para Mac era
   trabajo que nadie iba a usar.
4. **La URL de Test se pregunta siempre**, sin default. El servidor de pruebas vive en otra máquina de
   la red local (Linux, la monta el owner) y su IP cambia. El dominio de Prod sí se guarda una vez.
   Una IP o un host con puerto salen por `http`; un dominio, por `https`.
5. **La impresora se elige en el primer arranque, en la máquina del cajero** — no al generar. El
   generador corre en otro equipo y no puede conocer las impresoras de un POS que no ha visto.
6. **El puente de impresión va por dos caminos a la vez:** un shim de `window.open` inyectado en la
   página (funciona contra la web ya desplegada, sin redeploy) y `window.elVuelto.printReceipt(html)`,
   que `printReceipt.ts` prefiere si existe. En navegador el `if` no se cumple y no cambia nada.

## Estado
Aceptado. Ratifica la propuesta de tecnología de [[DESKTOP-20260821-app-escritorio-cajero-exe]] y
**corrige uno de sus supuestos** (ver abajo). No reemplaza ningún ADR.

## El supuesto que se cayó
La ficha decía: *"Trabaja en macOS. Desde ahí **no se genera un `.exe` confiable**… El camino limpio es
CI en Windows"*. **Es falso**, probado el 2026-08-24 en el Mac del owner (arm64, **sin wine**):

| paso | herramienta | evidencia |
|---|---|---|
| Empaquetar Windows x64 | `@electron/packager` + electron 44.0.0 | `file` → `PE32+ executable (GUI) x86-64, for MS Windows` |
| PNG → `.ico` | Pillow 11.1.0 (ya estaba en el `.venv`) | 7 tamaños, 16→256 px |
| Ícono + metadatos en el `.exe` | **`resedit` v3 (JavaScript puro)** | 7 `RT_ICON` + 1 `RT_GROUP_ICON`, PE re-parseado válido |

Lo que exigía Windows o wine era **`rcedit`**; `resedit` hace lo mismo sin salir de Node. Corolario:
**el CI en Windows no es un prerrequisito** para tener binarios; será útil para firmar y automatizar,
no para producir. De paso, `Pillow` deja de ser la dependencia muerta que denuncia
[[riesgo-deps-duplicadas-y-escpos]] — aunque sigue siendo del backend, no de esto (el `.ico` se genera
una vez y se commitea, así que `build.py` **no** depende de Pillow).

## Consecuencias
**Positivas**
- Hay ejecutable **hoy**, sin esperar deploy, CI ni certificado.
- El shim hace que la beta imprima en silencio **contra la web ya desplegada**, sin tocar el servidor.
- `printReceipt.ts` queda igual de bueno en navegador: una rama con fallback, cero riesgo de regresión.
- El config horneado hace innecesario, por ahora, el truco del slug en el nombre del archivo.

**Negativas / deuda aceptada**
- 🔴 **Sin firma:** SmartScreen avisa. Contradice el motivo #3 del owner ("verse profesional"); es
  tolerable en beta, **no** para vender.
- 🔴 **Config horneada adentro del paquete.** Cuando entre la firma hay que sacarla (nombre de archivo o
  config de primer arranque): agregarle bytes a un `.exe` firmado invalida la firma.
- 🟡 **~150 MB por ZIP**, 366 MB descomprimido. Es el costo de Electron.
- 🟡 **`elvuelto:print` queda expuesto a la página remota** — es la feature, no un descuido. Mitigado
  con serialización de impresiones y tope de 512 KB por recibo.
- 🔴 **Nada se probó imprimiendo de verdad:** este Mac no tiene impresoras y el owner pidió no gastar
  tiempo en Mac. La validación funcional es suya, en Windows con la térmica.

## Enlaces
[[DESKTOP-20260821-app-escritorio-cajero-exe]] · [[RUN-20260824-beta-manual-exe-caja]] ·
[[patron-impresion-recibos]] · [[BACKEND-20260811-falta-https-enforcement-produccion]]
