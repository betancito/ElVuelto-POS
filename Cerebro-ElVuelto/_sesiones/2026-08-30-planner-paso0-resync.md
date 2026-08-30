---
tags: [sesion, planner, paso0, resync, verificacion]
status: activo
updated: 2026-08-30
---

# Sesión 2026-08-30 — planner — PASO 0 en frío, con el commit ya hecho

Arranque con [[INIT-AGENTS]]; el owner pidió el init como **Planner y Dev en un solo agente**. Esta
sesión es **solo el PASO 0**: re-sincronizar el cerebro contra el código real. Cero código tocado.

## Lo primero que cambió: el owner commiteó todo
| chequeo | resultado |
|---|---|
| HEAD | **`abee9d8`** "deploy ready commit" (2026-08-27 23:29) — **75 archivos, +10838/-165** |
| `main` vs `origin/main` | **iguales** (pusheado) |
| árbol de app | **limpio**; `git ls-files --others --exclude-standard` → vacío |
| `npx tsc --noEmit` | **exit 0**, cero líneas |
| `makemigrations --check` | *No changes detected*, exit 0 |
| prompts 🟡 en curso | ninguno en los 7 registros |
| Docker / Postgres | **apagados hoy** (daemon caído; `5432` connection refused) |

Todo el bloque de riesgo que abría los PASO 0 del 08-24, 08-26 y 08-27 —"nada está commiteado"— **está
resuelto**. Docker, el `.exe` y la caja quedaron versionados de una.

## Cómo se verificó
8 verificadores independientes contra código real + 4 escépticos encima de las conclusiones de
"resuelto/cerrado" (~970k tokens, 282 tool calls). La regla de [[GOBERNANZA]] §1 en modo duro: **el
código es la verdad, un comentario del autor no es evidencia**. Los tres hallazgos que siguen salieron
de los escépticos, no de los verificadores.

## Hallazgo 1 — el índice estaba FALSO, y por el lado contrario al de siempre
[[00-INDEX]] y `00-registro-sales` decían que **3 de los 7 arreglos de la caja no cierran**. Ya no es
cierto: hubo una **tercera pasada** (08-27 20:14, arreglos 1 y 2) y una **cuarta** (22:10, el rollo,
contra la térmica real del dueño). Verificado en código: `IdleScreensaver.tsx:58,221` ·
`pos.css:1984` (los tres botones dentro de `.pos-success-modal__footer`, y **ese** es el sticky) ·
`main.js:143` (`getBoundingClientRect`) y `:175-182` (ventana oculta de 420×400 explícitos).

Es la primera vez que el cerebro se equivoca **subestimando** el trabajo hecho. Las otras veces
sobreestimaba.

> [!warning] Ninguna de las dos pasadas tiene handoff
> [[GOBERNANZA]] §7 pide archivo de sesión por sesión. El último de `_sesiones/` era del 08-27 18:32.
> La tercera pasada quedó como anexo dentro del RUN; de la **cuarta**, `grep -rn "cuarta pasada"` sobre
> todo el vault devuelve **una sola línea** — y el RUN ni siquiera tiene sección para ella.

## Hallazgo 2 — el arreglo del toque dejó una regresión peor que el bug
El escéptico refutó el "cerrado" del arreglo #1 y tiene razón. Atar la ventana al gesto trajo un
`if (dedoAbajo) { re-agendar; return }` (`IdleScreensaver.tsx:207-213`) donde `dedoAbajo` **solo** baja
con el `pointerup`/`pointercancel` del mismo `pointerId` (`:182-183`). Si ese evento no llega —el
escenario que el propio archivo enumera en `:60-66` como razón de existir de la red de seguridad— el
tragador de clicks (`:220`) **nunca se apaga** y el POS deja de responder a todo toque y click, sin
auto-curación, hasta recargar la página.

- El bug viejo metía **un producto de más**. Este **congela la caja**. Y la versión anterior sí se
  curaba sola a los 5 s.
- **El banco de pruebas no lo ve — y lo dice.** `probar-tragador-reposo.mjs` da 8/8 porque sus 8 casos
  **siempre sueltan el dedo** (`:111-166`). Su encabezado `:19-21` advierte: *"Si algún día pasa 8/8 con
  el código roto, el banco está mintiendo."* Con 3 casos agregados sale **1/4, exit 1**.
- Ficha: [[POS-20260830-tragador-reposo-puede-trabar-la-caja]].

## Hallazgo 3 — hay un cuarto trabajo dentro del commit que el cerebro nunca supo
El vault cubre Docker, el `.exe` y la caja. Lo que no cubre: un **pase de deploy a Azure con TLS** —
`base.py:70-77` (`DB_SSLMODE`, *"Azure Database for PostgreSQL EXIGE TLS"*), `production.py:11-43`
(bloque HTTPS entero) y `.env.example:74-89`. `grep -rn "Azure|sslmode|DB_SSLMODE"` sobre el vault → **0
hits**. Sin RUN, sin ADR, sin ficha. La única traza es el mensaje del commit.

Adentro va una **decisión de topología** que responde una pregunta abierta desde el 08-11 (TLS termina
en el borde, **Caddy**, que habla HTTP a nginx en la red privada) y que vive **solo en un comentario de
código**. Ficha: [[INFRA-20260830-deploy-azure-sin-registro]].

Efecto: [[BACKEND-20260811-falta-https-enforcement-produccion]] pasa de 🔴 a **🟡**. Todo lo que pedía
existe, pero adentro de un `if SECURE_SSL:` con `default=False` (`production.py:21,23`) que
`docker-compose.prod.yml:44` fija en `0`. **De "no existe" a "hay un botón correcto y está en off"** —
no es lo mismo que estar protegido. El apagado, eso sí, está bien argumentado: el mismo settings module
corre prod en LAN por HTTP.

## Hallazgo 4 — un 500 en el endpoint más expuesto, que el relevamiento viejo perdió
El escéptico de [[BACKEND-20260805-residuos-del-triaje]] confirmó las 15 anclas al byte, y encontró que
el relevamiento del punto 1 se hizo con `grep query_params.get` — así que se le escapó la **tercera**
instancia, y es la peor: `apps/users/serializers.py:72` lee `tenant_id` **crudo** en el login **público
y `AllowAny`**. Un no-UUID levanta la `ValidationError` de Django, que DRF no mapea → **500 HTML**. El
hermano `CashierLoginSerializer:162` declara `serializers.UUIDField(required=True)` para el mismo dato:
es olvido, no diseño. Ficha: [[BACKEND-20260830-login-publico-500-tenant-id-no-uuid]].

## Lo demás, en corto
- ⚠️ **`vite.config.js` no es basura inerte: GANA sobre el `.ts`.** `vite/dist/node/constants.js:33-40`
  lo pone primero en `DEFAULT_CONFIG_FILES`. Editar `vite.config.ts` es invisible para `npm run dev`
  hasta el próximo `npm run build`. Hoy los dos coinciden: armado, no disparado.
  [[FRONT-20260830-vite-config-js-pisa-al-ts]].
- 📐 **Toda ancla a un `CLAUDE.md` anterior al 08-27 está corrida** (+48 / +23 / +69 líneas). De las 14
  mentiras de [[DOCS-20260813-claudemd-drift-post-features]], **11 siguen y 3 se cayeron** (las de
  recibos/credenciales, corregidas de rebote por el run de la caja). **Dos puntos nuevos**, los dos
  nacidos del commit: el raíz se contradice sobre `VITE_API_URL` (`:66` vs `:112,133`), y
  `CSRF_TRUSTED_ORIGINS` quedó documentado en el `.env` equivocado con un remedio **inerte**
  (`docker-compose.yml:50` pisa el `env_file`, y una var presente-pero-vacía anula el default de
  `decouple`).
- 🟢 **Tenancy sigue igual y con un dato nuevo:** `abee9d8` **no tocó ni un archivo** bajo
  `el_vuelto_backend/apps/`. De **11 vistas tenant-scoped**, `CategoryViewSet` es **la única** que
  recibe el filtro automático (`ProductViewSet` pisa `get_queryset()`). El docstring de
  `viewsets.py:20-21` dice *"impossible at the API layer"* describiendo **1 de 11**. Y el contraejemplo
  lo escribió el propio equipo 35 líneas más abajo: `products/views.py:58-59`. Residuo nuevo: import
  muerto en `inventory/views.py:9`.
- 🧹 **`.venv` desalineado en las dos direcciones:** le sobra `python-escpos 3.1` (con Pillow colgando)
  y le **falta** `gunicorn`, declarado en `requirements.txt:11` desde este commit.
- 🔵 `manage.py:8` y `docs_views.py:113-117` **sin mover una línea**: sus dos fichas siguen abiertas con
  anclas exactas.

## Qué se escribió (solo cerebro — cero código tocado)
**Fichas nuevas (4):** [[POS-20260830-tragador-reposo-puede-trabar-la-caja]] ·
[[BACKEND-20260830-login-publico-500-tenant-id-no-uuid]] · [[INFRA-20260830-deploy-azure-sin-registro]] ·
[[FRONT-20260830-vite-config-js-pisa-al-ts]].

**Corregidas (8):** [[00-INDEX]] (5 afirmaciones falsas tachadas + sección nueva) ·
[[00-planeacion]] · `00-registro-sales` (🟡 → 🟢) · [[POS-20260827-tres-arreglos-a-medias]] (callout
contradictorio + anclas re-ancladas) · [[POS-20260827-caja-1366x768-y-reposo]] ·
[[ADR-POS-20260827-caja-para-adulto-mayor-en-1366x768]] ·
[[BACKEND-20260811-falta-https-enforcement-produccion]] (🔴 → 🟡) ·
[[BACKEND-20260813-docstring-tenancy-miente-aislamiento]] ·
[[BACKEND-20260805-residuos-del-triaje]] · [[DOCS-20260813-claudemd-drift-post-features]] ·
[[riesgo-deps-duplicadas-y-escpos]].

## Lo que NO se tocó, y por qué
- 🟡 **El módulo `sales` sigue sin enterarse de nada.** Sus seis notas y `00-modulos` siguen en
  `updated: 2026-08-02`; cero menciones de `IdleScreensaver`, `ClearCartModal` ni `generateReceiptHTML`.
  `inventory` y `reports` también están en el 08-02. Es un resync de módulo completo, no un parche —
  merece su propia sesión. (Ya estaba anotado el 08-27 y sigue igual.)
- 🟡 **`el_vuelto_desktop/README.md`** sigue sin mencionar el fullscreen ni F11 y describe el
  comportamiento viejo de "Forzar 80 mm". Está **fuera del vault**: es doc de la app.
- 🔵 **Los 7 ítems de prioridad baja** no se re-verificaron a propósito.

## Preguntas abiertas
- **P-1 [pos] ¿El escaneo sobre el `SuccessModal` es un hábito de caja?** Sin respuesta desde el 08-26;
  bloquea [[POS-20260827-escaner-activo-con-modales]].
- **P-2 [infra] ¿El deploy a Azure ya corrió, o quedó preparado nomás?** El código lo da por decidido
  (Caddy en el borde) pero **Caddy no está en el repo** y `SECURE_SSL` viene en `0`. Hipótesis: está
  preparado, no desplegado. Si ya corrió, [[INFRA-20260830-deploy-azure-sin-registro]] pasa de "falta
  documentar" a "falta documentar **y** hay prod sin HTTPS forzado". Impacto: **alto**.

## Por dónde retomar en frío
1. **Lo más urgente sí es código, y por primera vez en semanas:**
   [[POS-20260830-tragador-reposo-puede-trabar-la-caja]]. Un `.exe` en pantalla completa que deja de
   responder no tiene salida obvia para un cajero adulto mayor — que es exactamente el usuario para el
   que se rediseñó la caja.
2. **Contestar la P-2.** Cambia la prioridad de todo el bloque de HTTPS.
3. Después: [[BACKEND-20260830-login-publico-500-tenant-id-no-uuid]] (barato, y es la puerta pública).
4. Sigue esperando el ojo del owner: el `.exe` en Windows con la térmica, y las tres features del
   08-15/08-16 — **catorce días**.

## Enlaces
[[00-INDEX]] · [[GOBERNANZA]] · [[2026-08-27-planner-cierre-run-caja]] ·
[[RUN-20260827-caja-adulto-mayor-y-recibo]] · [[INFRA-20260826-dockerizacion-stack]]
