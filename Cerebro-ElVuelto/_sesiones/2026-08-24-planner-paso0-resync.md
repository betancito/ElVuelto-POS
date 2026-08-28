---
tags: [sesion, planner, paso0, resync]
status: activo
updated: 2026-08-24
---

# Sesión 2026-08-24 — planner — PASO 0 en frío

Arranque del Planner con [[INIT-AGENTS]]. El owner pidió **solo el init**: esta nota cubre el PASO 0 y
nada más. No se propuso ni se arrancó trabajo.

## Qué se leyó
[[00-INDEX]] + [[GOBERNANZA]] + la última nota de sesión ([[2026-08-20-planner-paso0-resync]], con la
sección del 08-21 anexada) + [[00-planeacion]] + [[DESKTOP-20260821-app-escritorio-cajero-exe]].

## Método
Igual que las veces anteriores: la nota del 08-20/08-21 se tomó como **hipótesis**. Se contrastó contra
`git log`, `git status`, `git show --stat`, `mtime` de cada archivo y lectura directa del código. Esta
vez había una razón concreta para desconfiar de poco: **han pasado 3 días sin actividad** y ninguna
feature nueva tocó archivos citados por el backlog.

## Hallazgo 1 — nada se movió (la nota anterior queda confirmada, no corregida)
- HEAD = **`eacaae0`** (2026-08-20 20:43), igual que el 08-21. **`main` == `origin/main`**: el commit
  está **pusheado**, no solo local.
- **Árbol de app limpio.** `git status` fuera del cerebro → cero archivos.
- Último archivo de app tocado: `SuccessModal.tsx`, **2026-08-16 17:50** — ocho días de silencio en el
  código.
- Cerebro tocado por última vez el **2026-08-21 08:37**; tres días.
- **Ningún prompt 🟡 en curso** en los 7 `00-registro-<mod>`: los únicos hits de 🟡 son la línea de
  leyenda de cada registro y una anotación histórica del 2026-08-04 dentro de una fila ya 🟢
  (`00-registro-transversal:21`), cuyo trabajo real se sigue en
  [[DOCS-20260813-claudemd-drift-post-features]]. Sin trabajo a medias.

## Hallazgo 2 — el entorno sigue verde
- `makemigrations --check --dry-run` → **No changes detected** (exit 0).
- `npx tsc --noEmit` → **exit 0**, cero líneas de salida.

## Hallazgo 3 — los 5 ítems de peso siguen abiertos, y esta vez SIN una sola ancla corrida
Verificados hoy contra el código, no heredados de la nota. Como el código no se tocó desde `eacaae0`,
las 7 anclas que se corrigieron el 08-20 **siguen exactas**:

| ítem | estado | evidencia de hoy |
|---|---|---|
| [[BACKEND-20260813-docstring-tenancy-miente-aislamiento]] | 🔴 SIGUE-ABIERTO | `tenants/viewsets.py:20-21` sigue diciendo *"automatically adds `.filter(tenant=request.tenant)`"* + *"cross-tenant data leakage is impossible"*; `products/views.py:57` sigue siendo el contraejemplo (el override tumba el guard, y su propio comentario lo admite); `inventory/views.py:9` sigue importando `TenantModelViewSet` y **es el único hit del archivo** — import muerto |
| [[DOCS-20260813-claudemd-drift-post-features]] | 🔴 SIGUE-ABIERTO | front `:330` = *"jsPDF receipt for download"*, front `:331` = *"exports credentials as `.txt`"* — las dos mentiras intactas y en la línea que dice la ficha; front `:172` y `:162` y back `:578` también coinciden |
| [[BACKEND-20260811-manage-py-settings-fallback-inseguro]] | 🔴 SIGUE-ABIERTO | `manage.py:8` sigue con `setdefault(..., "elvuelto.settings.local")` |
| [[BACKEND-20260811-falta-https-enforcement-produccion]] | 🔴 SIGUE-ABIERTO | `grep -c 'SECURE_\|SESSION_COOKIE_SECURE\|CSRF_COOKIE_SECURE'` sobre `settings/production.py` → **0** |
| [[BACKEND-20260805-residuos-del-triaje]] | 🔴 SIGUE-ABIERTO | `sales/views.py:43` y `:52` (el `?user=` sin validar), `products/models.py:87` (`unique_tenant_barcode`) — anclas exactas |

Los 7 ítems 🔴 de prioridad baja **no** se re-verificaron, por la razón de siempre: hacerlo es el
"seguir buscando trabajo" que el owner pidió no hacer ([[elvuelto-cierre-estabilizacion]]).
**No se abrió ningún ítem nuevo.**

## Hallazgo 4 — la corrección del 08-21 es cierta (se auditó a sí misma)
[[patron-impresion-recibos]] se corrigió el 08-21 porque describía dos archivos al revés. Hoy se
verificó **la corrección**, no solo el hecho de que existiera:
- `src/utils/generateReceipt.ts` → `grep jspdf` **cero hits**. No genera PDF; la nota corregida acierta.
- `src/utils/downloadCredentials.ts:1` importa `jsPDF`, `:130` arma A5 apaisado, `:239` guarda `.pdf`.
- `src/utils/printReceipt.ts:13` → `win.print()` dentro de un `setTimeout`, seguido de `win.close()`:
  el diálogo del SO en cada venta que motiva la app de escritorio, confirmado.
- `UsersPage.tsx:235` → `ta-url-card`, el molde citado por la ficha de escritorio. Existe.

## Hallazgo 5 — una imprecisión de la nota del 08-21, corregida acá (no se edita la nota vieja)
La sección *"Por dónde retomar en frío"* del 08-21 dice que el cerebro tiene sin commitear *"los del
08-13, 08-15, 08-20 y los de hoy"*. **Ya no es cierto, y en realidad no lo era al escribirlo:**
`git show --stat eacaae0 -- Cerebro-ElVuelto` muestra que ese commit se llevó **el cerebro completo
hasta el 08-20** adentro (61 archivos en total, incluidas las tres notas de sesión y los tres RUN).
Lo único sin commitear hoy son **los 5 archivos del 08-21**: `00-INDEX.md`,
`patron-impresion-recibos.md`, `2026-08-20-planner-paso0-resync.md`, `00-planeacion.md` (modificados) y
`DESKTOP-20260821-app-escritorio-cajero-exe.md` (nuevo). Nada de app.
Por [[GOBERNANZA]] §7 las notas de sesión no se editan: la corrección vive acá.

## Estado al cerrar el PASO 0
Sin trabajo en curso, sin prompt pendiente, entorno verde, árbol de app limpio y pusheado. El cerebro
quedó sincronizado en un solo punto (Hallazgo 5); todo lo demás del 08-20/08-21 se confirmó tal cual.

**La pregunta para el owner, sin cambios respecto al 08-21:**
1. **[[DESKTOP-20260821-app-escritorio-cajero-exe]]** — el trabajo firme que él mismo dijo que va "sí o
   sí". El siguiente paso natural es **modo plan sobre la fase 1** (wrapper Electron + puente de
   impresión silenciosa, contra `localhost`, en el Mac). No depende del deploy.
2. **Confirmación visual de las tres features del 08-15/08-16** (pegar logo ⌘V, teclado numérico, stock
   negativo en pantalla). Es abrir el navegador y mirar: la deuda más barata del tablero, y arrastra
   nueve días.
3. El bloque *"la doc miente"* (alta, barato, anclas verificadas hoy).
4. La config de deploy (2 ítems; necesita una respuesta suya sobre infraestructura).
5. RLS ([[GLOBAL-20260802-migracion-rls-postgres]], desbloqueado desde el 08-09, mini-proyecto).

## Por dónde retomar en frío
1. Leer [[00-INDEX]] (sección del 2026-08-24) + [[GOBERNANZA]] + esta nota.
2. HEAD = `eacaae0`, pusheado. Árbol de app **limpio**. Sin commitear: solo los 5 archivos de cerebro
   del 08-21 + esta nota y el índice de hoy.
3. Backlog verificado al 2026-08-24 en sus 5 ítems de peso, **anclas exactas**.
4. Nada implementado de la app de escritorio.

---

# 2026-08-24 (tarde) — beta manual del `.exe` de caja

Pedido directo del owner ([[GOBERNANZA]] §10), con modo plan aprobado. Detalle completo:
[[RUN-20260824-beta-manual-exe-caja]] · decisión:
[[ADR-DESKTOP-20260824-wrapper-electron-y-generador-manual]].

## Qué pidió
Un comando local que pregunte **1. Test / 2. Prod**, después el **tenant**, y genere el ejecutable con
el logo de El Vuelto apuntando a `/login/<slug>` — sin módulo de descarga, sin CI, sin firma. Más, en
sus palabras, "una fumada mía": que **durante el setup pregunte cuál impresora usar, con una lista**.
No era una fumada: `getPrintersAsync()` + `print({silent:true, deviceName})` es API documentada de
primera clase, y es justo lo que hace que la app valga la pena.

A mitad de camino corrigió dos cosas que estaban en la ficha y en mi plan:
- **Windows y nada más.** Yo iba a validar el puente en el Mac como `.app`; lo cortó ("ahorrate ese
  proceso"). Se borró el build de Mac y el harness que estaba armando.
- **Test no debe asumir `localhost`.** El servidor de pruebas lo monta él en una máquina **Linux** de su
  red; la IP la provee quien corre el comando. Ahora se pregunta siempre y nunca hay default.

## Lo que más valió
**Probar el supuesto antes de planear sobre él.** La ficha del 08-21 afirmaba que desde macOS *"no se
genera un `.exe` confiable"* y que el camino limpio era CI en Windows. Antes de escribir el plan corrí
la prueba de fuego: `@electron/packager` para `win32/x64` + **`resedit`** (JS puro) para ícono y
metadatos → `PE32+ executable (GUI) x86-64`, **sin wine**. Lo que exigía wine era `rcedit`.
Si me hubiera creído la ficha, el plan habría arrancado por montar CI en Windows — semanas antes de
tener nada que probar.

## Lo que quedó y lo que no
🟢 Generación verificada punta a punta (binario real, ícono de 7 tamaños, config horneada, ZIP de
150 MB) y CLI 11/11 contra una tty real.
🔴 **Nada se imprimió.** Este Mac no tiene impresoras y el owner testea en Windows. Es la única parte
que decide si la feature sirve.

## Deuda que nace acá
Sin firma (SmartScreen avisa — contradice el motivo "verse profesional" del propio owner) · el
`config.json` horneado adentro del paquete hay que sacarlo cuando se firme · `elvuelto:print` queda
expuesto a la página remota, mitigado con serialización y tope de 512 KB por recibo.

## Por dónde retomar en frío (actualizado)
1. Leer [[00-INDEX]] (sección del 2026-08-24, la de arriba) + esta nota.
2. `el_vuelto_desktop/` es carpeta nueva **sin commitear**, igual que los cambios de `printReceipt.ts`,
   los dos `CLAUDE.md` y el cerebro. Commitear es del owner ([[GOBERNANZA]] §0).
3. **Lo primero que corresponde no es código:** que el owner corra `ElVuelto-<slug>.exe` en Windows con
   la térmica. Si el recibo sale sin diálogo, la fase 1 se cierra 🟢; si no, el diagnóstico sale de
   `set ELVUELTO_DEBUG=1`.
4. Fase 2 (módulo de descarga en el tenant admin, firma, hosting) **no arrancar** hasta eso.
5. Siguen esperando el ojo del owner las tres features del 08-15/08-16.
