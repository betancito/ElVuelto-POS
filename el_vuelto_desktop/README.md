# el_vuelto_desktop — app de escritorio de la caja (Windows)

Genera un `.exe` que abre la caja de un negocio en su propia ventana y, sobre
todo, **imprime el recibo sin el diálogo de Windows**. Eso último es lo único
que un navegador no puede hacer, y es la razón de que esto exista.

Es un wrapper: adentro corre la misma web de El Vuelto. **No funciona sin
servidor** — si se cae la red, la caja se cae igual que en el navegador.

## Generar un ejecutable

```bash
cd el_vuelto_desktop
python3 build.py
```

```
El Vuelto — generador de app de caja
  1. Test  (te pregunto la IP del servidor)
  2. Prod  (https://…)
Entorno [1/2]: 1

  ¿Dónde está corriendo el servidor de pruebas?
  IP:puerto o URL (ej: 192.168.1.50:5173): 192.168.1.50:5173
Slug del negocio: bambipan
Nombre visible [bambipan]: BambiPan

  Abre    : http://192.168.1.50:5173/login/bambipan
¿Generar? [S/n]: s
```

Sale `dist/ElVuelto-<slug>.zip` (~150 MB). Se descomprime en el equipo de la
caja y se abre `ElVuelto-<slug>.exe`.

Sin preguntas, para repetir:

```bash
python3 build.py --env test --url 192.168.1.50:5173 --slug bambipan --name "BambiPan" --yes
```

- **Test** pide la IP **siempre**: el servidor de pruebas vive en otra máquina
  de la red y su IP cambia. Hornear una vieja = un `.exe` que no abre.
- **Prod** pregunta el dominio una vez y lo guarda en `urls.json` (local, no va a git).
- Una IP o un host con puerto salen por `http`; un dominio, por `https`.

## Primer arranque en la caja

1. Windows avisa que el archivo no está firmado → **Más información → Ejecutar
   de todas formas**. (Se quita comprando un certificado; para la beta no.)
2. La app pide **a qué impresora salen los recibos**, con la lista del equipo y
   un botón **Imprimir prueba**. Queda guardado; se cambia desde el menú
   *El Vuelto → Impresora…*.
3. De ahí en adelante cada venta imprime sola.

El **tamaño de página** viene en **80 mm** de fábrica y así debe quedarse: el
ancho lo pone la app y el alto **se mide del recibo**, así que no sobra ni falta
papel. La opción *Automático* deja decidir al driver, y un driver que reporta
mal la página es justo lo que hace salir el recibo con blanco arriba y recortado
abajo y a la derecha. Cambiala solo si tu impresora no es de 80 mm.

## Si algo no imprime

```cmd
set ELVUELTO_DEBUG=1
ElVuelto-<slug>.exe
```

Deja la traza en consola: si el shim se instaló, cuántos bytes de recibo
llegaron, con qué opciones se mandó a imprimir y qué contestó el driver.

## Cómo está armado

| archivo | qué hace |
|---|---|
| `build.py` | el generador: pregunta, hornea `app/config.json`, empaqueta, marca el `.exe` y comprime |
| `tools/patch-exe.js` | mete ícono y metadatos en el `.exe` con `resedit` (JS puro — **no** necesita wine ni Windows) |
| `tools/make-ico.py` | one-shot: genera `elvuelto.ico` desde el favicon del front (necesita Pillow) |
| `app/main.js` | ventana, guardas de navegación, impresión silenciosa, setup |
| `app/preload.js` | puente angosto para la página remota: solo `printReceipt` y abrir el setup |
| `app/setup.html` | pantalla local de selección de impresora |

### El puente de impresión, por dos caminos

1. **Shim de `window.open`** inyectado en la página: intercepta la secuencia de
   `printReceipt.ts` tal como está hoy y desvía el HTML a la térmica. Sirve
   **contra la web ya desplegada, sin redeploy**.
2. **`window.elVuelto.printReceipt(html)`**, que `printReceipt.ts` prefiere si
   existe. En el navegador ese `if` no se cumple y todo sigue igual que siempre.

## Lo que NO da

Firma de código · auto-update · modo kiosko · **modo offline**. Sigue siendo un
navegador contra el servidor: no le vendas al cliente que funciona sin internet.
