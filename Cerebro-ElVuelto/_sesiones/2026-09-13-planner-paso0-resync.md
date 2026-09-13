---
tags: [sesion, planner, paso0, resync, verificacion, seguridad, deploy]
status: activo
updated: 2026-09-13
---

# Sesión 2026-09-13 — planner — PASO 0 en frío: el sistema salió a producción y el cerebro no se enteró

Arranque con [[INIT-AGENTS]] (bloque Agente A). Esta sesión es **solo el PASO 0**: re-sincronizar el
cerebro contra el código real. **Cero código de app tocado.**

## El estado, en una tabla
| chequeo | resultado |
|---|---|
| HEAD | **`89d3f41`** *"feat(bills): removed message foe elctronic bill (nw optional)"* (2026-08-30 13:48 -0500) |
| `main` vs `origin/main` | **iguales** |
| silencio en el código | **14 días** — ni un commit desde el 08-30 |
| `npx tsc --noEmit` | **exit 0**, cero salida |
| `makemigrations --check` | *No changes detected*, exit 0 |
| prompts 🟡 en curso | **ninguno** en los 7 registros |
| Postgres / Docker | **arriba** (`naia-postgres` healthy hace 3 días) — a diferencia del 08-30 |
| árbol de app | **2 entradas sucias**, y las dos importan (ver abajo) |
| **producción** | 🟢 **VIVA** en `https://elvuelto.online` desde el 2026-08-30 |

## Cómo se verificó, y qué falló al verificar
13 agentes: 9 verificadores independientes contra código real, 3 escépticos sobre las conclusiones más
riesgosas y 1 crítico de completitud. **La corrida fue accidentada — 10 terminaron, 3 se cayeron**
(~3,3 M tokens, 895 tool calls, 3h40m). Lo que NO se cubrió, dicho explícitamente:

- El **verificador del POS** murió por error de API → esa área la verifiqué **a mano** (Hallazgo 7).
- Los escépticos de **infra/HTTPS** y de **seguridad del repo** se colgaron (6 intentos cada uno, sin
  progreso) → esas dos áreas quedan con **verificación de una sola pasada**, sin nadie que haya
  intentado refutarlas. Las conclusiones de los Hallazgos 1, 2 y 3 las re-verifiqué yo contra la
  producción viva, pero no pasaron por un escéptico independiente.
- El escéptico que **sí** corrió (factura electrónica) no pudo tumbar ninguna de las 16 afirmaciones,
  pero corrigió un método: se había dado por cerrado el fix de `overflow-wrap` con *"está en el bundle
  desplegado"*. **Presencia no es verificación.** El propio ADR es más honesto (*"nada se vio en
  pantalla"*), y este repo ya pagó esa lección el 08-27: un recibo se cierra **contra la térmica**.

Lo digo porque es exactamente el tipo de detalle que después se lee como "se verificó todo".

---

## Hallazgo 1 — 🔒 La llave privada del servidor está a un `git add -A` de GitHub
`elvuelto-vm_key.pem` (387 bytes, `-----BEGIN OPENSSH PRIVATE KEY-----`, mtime 2026-08-28) está
**untracked y sin ignorar** en la raíz. El repo es **público**
(`api.github.com/repos/betancito/ElVuelto-POS` → `"private": false`).

No es una inferencia: **`git add -An` imprime literal `add 'elvuelto-vm_key.pem'`**. Ninguno de los
**4** `.gitignore` del repo tiene una regla `*.pem`/`*.key`/`id_rsa`.

**El historial está limpio** — verificado por 5 vías independientes (por nombre de archivo con
`--diff-filter=A`, y por contenido con `-S` sobre las 4 cabeceras PEM). Por eso hoy se arregla en un
minuto, y mañana sería rotar credenciales.

**Agravante que ninguna nota registraba:** ese mismo `git add -A` sube también las fichas de este PASO 0,
que traen la **IP pública de la VM** (hoy ausente de HEAD) y el mapa de la vulnerabilidad. El commit
entregaría *la llave, la dirección y el instructivo*.
Ficha: [[INFRA-20260913-clave-ssh-de-la-vm-sin-ignorar]].

## Hallazgo 2 — El deploy a Azure YA CORRIÓ, y contesta la P-2 del 08-30
La pregunta abierta era *"¿ya corrió o quedó preparado?"*; la hipótesis del cerebro era **"preparado,
no desplegado"**. Es **falsa**:

- `https://elvuelto.online` → **HTTP/2 200**, `via: 1.1 Caddy`, `server: nginx/1.31.4`.
- Cert Let's Encrypt `CN=elvuelto.online`, **2026-08-30 → 2026-11-28**.
- `last-modified` del `index.html`: **2026-08-30 19:16 GMT**, 28 minutos después de `89d3f41`
  (18:48 GMT) ⇒ **lo desplegado es HEAD**.
- `el_vuelto_desktop/app/config.json` → `{"env":"prod","baseUrl":"https://elvuelto.online","slug":"bambipan"}`.
  El `.exe` del cajero ya apunta al negocio real.
- La topología del [[ADR-INFRA-20260830-deploy-azure-tls-en-el-borde]] **no es intención: está corriendo**.

Ficha: [[INFRA-20260913-el-deploy-a-azure-ya-corrio]].

### Y el estado de HTTPS se pudo medir sin entrar a la VM
`csrftoken` vuelve con flag **`Secure`**, y `CSRF_COOKIE_SECURE` solo se fija dentro del
`if SECURE_SSL:` (`production.py:23,33`) ⇒ **`SECURE_SSL=1` en la VM**. Que `/admin/login/` responda
**200** y no **301** prueba además que el `X-Forwarded-Proto` **sí** llega hasta gunicorn. Y `DEBUG=False`
está confirmado desde afuera (404 pelado de 179 bytes; `production.py:4` es literal, ninguna env lo
prende).

⇒ De los 4 warnings del criterio de [[BACKEND-20260811-falta-https-enforcement-produccion]],
**tres están cerrados en el deploy real** (W008, W012, W016) y **queda W004**: no hay
`strict-transport-security` porque `SECURE_HSTS_SECONDS` arranca en `0` y se sube **a mano**. El motivo
para no subirlo —*"después de confirmar que el dominio sirve bien por https"* (`production.py:35-38`)—
**ya se cumplió hace catorce días**.

## Hallazgo 3 — El dominio resuelve a dos servidores, y uno no es nuestro
`dig elvuelto.online` devuelve **dos registros A** en round-robin: `20.36.129.173` (la VM) y
`31.214.178.55` → PTR **`parkingsrv0.dondominio.com`**, el estacionamiento del registrador.

| | :80 | :443 |
|---|---|---|
| VM | `308 → https`, Caddy | **200**, la app |
| parking | `302 → http://www.…`, Apache + `PHPSESSID` | **conexión rechazada** |

Y **`www` está 100% roto**: `curl https://www.elvuelto.online/` → `tlsv1 alert internal error`. Caddy no
tiene sitio ni cert para `www`. O sea: el cliente teclea `elvuelto.online` → 50% cae en el parking →
`302` a **`www`** → https falla y http vuelve al parking. **No llega nunca.**

Tercer efecto, el que tiene fecha: la renovación ACME de Caddy arranca ~**2026-10-29** y Let's Encrypt
valida desde varios puntos de red, cada uno resolviendo por su cuenta. Es un riesgo deducido del
mecanismo, no un hecho observado — la emisión del 08-30 funcionó.
Ficha: [[INFRA-20260913-dominio-apunta-tambien-al-parking]].

## Hallazgo 4 — El 500 del login público NO era el que decía la ficha (y yo repetí el error)
[[BACKEND-20260830-login-publico-500-tenant-id-no-uuid]] sostenía que un `tenant_id` no-UUID produce un
**500**. **Falso**: devuelve **400 JSON**. `Serializer.run_validation`
(`rest_framework/serializers.py:635-640`) envuelve la llamada a `self.validate()` en
`except (ValidationError, DjangoValidationError)` y la re-lanza como error de DRF. La excepción nunca
llega al `exception_handler`.

**El 500 real existe y es otro:** `cedula` no-string → `cedula.strip()` → `AttributeError`
(`serializers.py:78`). Reproducido full-stack con `django.test.Client`: `{"cedula":123}` → **500
text/html**. Era la nota al pie de la ficha; es el defecto.

> [!warning] La lección vale más que el bug
> El razonamiento falso se escribió, entró al `00-INDEX`, sobrevivió un PASO 0 entero — y hoy **yo lo
> "reproduje"** llamando al ORM directo, que es donde sí falla, y lo di por confirmado. Verificar la
> pieza no es verificar el sistema. Lo cazó un verificador que **sí** levantó el endpoint.

También se corrigió la arqueología: las dos líneas del defecto son de `3ade509a` (2026-04-24), no de
`ca5db4d`; de `ca5db4d` es solo el guard parcial que les pasó por al lado.

## Hallazgo 5 — `/admin/login/` está en internet sin límite de intentos
El throttling de [[AUTH-20260805-sin-throttling-en-login]] es **de DRF**, y `admin.site.urls`
(`elvuelto/urls.py:9`) sirve su propio formulario **fuera** de DRF. `base.py:113-115` documenta que no
hay `DEFAULT_THROTTLE_CLASSES` **a propósito**; nginx proxea `/admin/` sin `limit_req`
(`docker/nginx/prod.conf:52-55`); no hay `django-axes`. Hasta el 08-30 era un formulario en una LAN.
Atenúa —y está verificado— que `is_staff` quedó restringido a SUPERADMIN, así que es **una** cuenta.
Ficha nueva: [[AUTH-20260913-admin-django-sin-rate-limit]].

## Hallazgo 6 — El cerebro se publica solo, y nadie lo decidió
`Cerebro-ElVuelto/` es **305 de los 605** archivos del repo público (**50,4 %**), con **105** notas de
riesgo y backlog. Hoy no es un mapa de ataque explotable —los dos riesgos peores del vault están
cerrados en código—, pero la próxima ficha sobre un hueco **abierto** se publica sola. Tres salidas
posibles, todas válidas; la que no sirve es la de hoy: no haber elegido.
Ficha nueva: [[GLOBAL-20260913-el-cerebro-se-publica-solo]].

## Hallazgo 7 — La regresión del reposo sigue abierta, con las anclas exactas
Verificado a mano (el verificador de POS no volvió). `IdleScreensaver.tsx`: `dedoAbajo` solo baja en
`:183`, gateado por `pointerId` (`:182`); `vencer()` se re-agenda infinito si sigue arriba
(`:207-213`); el tragador es `window.addEventListener('click', …, {capture:true})` (`:220`) y solo lo
suelta `cerrar()`. Si el `pointerup` no llega, **la caja entera deja de responder** hasta recargar. La
única salida es el `useEffect` de desmontaje (`:232`), que en un POS montado no ocurre.

**Y el banco de pruebas sigue mintiendo, con pruebas:** corrí
`node scripts/probar-tragador-reposo.mjs` → **PASAN: 8, FALLAN: 0**. Su propio encabezado advierte
*"si algún día pasa 8/8 con el código roto, el banco está mintiendo"*. Está mintiendo.
Ficha (sin cambios, anclas intactas): [[POS-20260830-tragador-reposo-puede-trabar-la-caja]].

---

## Hallazgo 8 — La mitad estructural del cerebro está congelada, y ahora está medida
Lo trajo el crítico de completitud, y es lo más grande del día. Todos los PASO 0 desde el 08-13 —este
incluido— trabajan sobre `planeacion/backlog/` y tres patrones. **Nadie abre `modules/`,
`_conexiones/`, 6 de los 8 patrones, los 19 riesgos de módulo ni los 7 `preguntas-<mod>` desde el
2026-08-02.** Y no están vacíos: publican **🔴 que el código ya cerró**.

- `estado-sales:30` reclama el guard `monto_recibido >= total`. Existe (`sales/serializers.py:179-183`)
  y **el propio `00-registro-sales:16` lo da por cerrado hace 41 días**.
- `_conexiones/sales--inventory:13` dice que la venta *"valida stock suficiente"* — contradice de frente
  el [[ADR-SALES-20260816-stock-negativo-permitido]].
- `inventory/riesgos/ajuste-stock-negativo` propone como fix volver a `PositiveIntegerField`, que es
  justo lo que la migración `products/0004` deshizo.
- `patron-jwt-refresh:30` advierte *"el login por cédula no exige `tenant_id`"* → `serializers.py:169`
  lo declara `UUIDField(required=True)`.
- `_global/00-global.md:23` dice que el superadmin *"impersona"*; `:27`, cuatro líneas abajo, enlaza el
  ADR que decidió no impersonar.

Medición: `features/sales` pasó de los ~2032 LOC que declara su nota a **4349 (+114 %)**.
Y hay **3 superficies de código con cero cobertura**: `seed_may_sales.py`/`seed_test_sales.py` (262
líneas que escriben ventas **saltándose** el serializer, con un tenant hardcodeado que ya no existe),
los fieldsets del Django admin, y `/super-admin/billing` + `/history` (placeholders ruteados en
producción, 0 menciones en el vault).
Ficha con el plan: [[GLOBAL-20260913-la-mitad-estructural-del-cerebro-esta-congelada]].

## Correcciones al cerebro (esto es lo que se escribió)

**Fichas nuevas (6):** [[INFRA-20260913-clave-ssh-de-la-vm-sin-ignorar]] ·
[[INFRA-20260913-el-deploy-a-azure-ya-corrio]] · [[INFRA-20260913-dominio-apunta-tambien-al-parking]] ·
[[AUTH-20260913-admin-django-sin-rate-limit]] · [[GLOBAL-20260913-el-cerebro-se-publica-solo]] ·
[[GLOBAL-20260913-la-mitad-estructural-del-cerebro-esta-congelada]].

**Cerradas contra código (2):** [[TENANCY-20260802-toggle-active-fantasma]] (el front dejó **lápida**:
`tenantsApi.ts:147` *"Deliberately no `toggleTenantActive`"*) y [[TENANCY-20260802-slug-divergente]]
(las tres anclas muertas: `grep _nombre_to_slug|toSlug` → 0 en todo el repo). Las dos llevaban **42
días en 🔴** mientras `00-planeacion` ya las daba por 🟢.

**Arreglo de forma:** `00-registro-tenancy.md:22` tenía una **línea en blanco dentro de la tabla** que
partía el markdown en dos y dejaba la fila de la feature 12a sin renderizar como fila. Lo encontró el
escéptico, después de que el verificador auditara el **contenido** de esa fila carácter por carácter
sin mirar nunca si se veía.

**Notas corregidas (8):**
- [[patron-tenancy]] — decía *"Único pendiente: `UserCreateSerializer`"* y **ese guard está cerrado**
  (`users/serializers.py:289`, `:317`). Es el peor renglón posible para equivocarse: es el que un
  agente lee para decidir qué falta hacer. Además decía que el superadmin *"debe impersonar"* cuando el
  repo lo niega explícitamente (`tenants/views.py:156-159`) y existen **3 vistas SUPERADMIN
  tenant-scoped por URL**. Y 5 anclas corridas, dos graves (`TenantMixin` 58→**94**, claim JWT
  26→**69**).
- [[riesgo-deps-duplicadas-y-escpos]] + [[INIT-AGENTS]] — **`Pillow` NO es dependencia muerta**: la usa
  `el_vuelto_desktop/tools/make-ico.py:11`, cuyo docstring declara que corre con el venv del backend.
  Borrarla rompe ese script. Y no es "cola del escpos": tiene marcador `REQUESTED` en su `dist-info`.
  La cola real de escpos son **6** huérfanos, no 8 (`PyYAML` lo pide drf-spectacular y `six` cloudinary).
- [[BACKEND-20260830-login-publico-500-tenant-id-no-uuid]] — **reescrita**: su tesis era falsa (Hallazgo 4).
- [[DOCS-20260813-claudemd-drift-post-features]] — tabla maestra re-anclada punto por punto contra
  `89d3f41`. **12 vivas, 4 cerradas** (el punto 7 lo cerró el commit de rebote). Y hay que borrar del
  PASO 0 del 08-30 la afirmación de que back `:308` *"no se movió ni un renglón"*: se movió a `:320`.
- [[BACKEND-20260805-residuos-del-triaje]] — el callout del 08-30 decía *"las 15 anclas correctas al
  byte"*; **`generateReceipt.ts:56` ya estaba corrida a `:65` en `abee9d8`** (hoy `:76`). El sesgo era
  de método: se verificó el backend y no el frontend. El punto 4 además **perdió su premisa**:
  `tenant.logoUrl` salió del recibo en `abee9d8`, así que ya no hay dato de usuario en contexto de
  atributo.
- [[auditoria-adversarial-20260805]] — estaba `status: abierto` con severidad alta **en un repo
  público**, y sus dos hallazgos peores están cerrados. Su ancla no estaba corrida: estaba
  **INVERTIDA** — `tenants/serializers.py:87` hoy dice literalmente `# NO is_staff`.
- [[ADR-TENANCY-20260830-factura-electronica-por-tenant]] + su ficha + [[FRONT-20260830-flag-factura-no-llega-en-caliente]]
  — la feature está **bien implementada y desplegada** (6/6 preguntas a favor del ADR), pero: ancla
  `models.py:20`→**`:29`** (nació mal), `authSlice.ts:56-64`→**`:61-69`** (escrita contra el archivo
  pre-commit), y la descripción de la decisión estaba incompleta: la condición vieja
  `(tenant.email || tenant.supportPhone)` **sigue viva** como segundo término del `&&`
  (`generateReceipt.ts:129`), a propósito y documentada.

## Deuda de gobernanza que este PASO 0 deja anotada
- **Sin nota de sesión** ([[GOBERNANZA]] §7) para todo el trabajo del 08-30 por la tarde/noche: la guía
  de Azure, la feature de factura electrónica **y el deploy real**.
- **Sin RUN** ([[GOBERNANZA]] §9): no existe ningún `RUN-20260830-*`. La fila de factura electrónica en
  `00-registro-tenancy` está 🟢 corrido-ok con la columna Reporte apuntando al **ADR**, así que los 7
  casos HTTP que menciona **son inauditables**. El deploy no tiene RUN de ninguna clase.
- **Sin revisión adversarial** (§10.2) del pase de Azure — y ese código hoy está **expuesto a internet**.
- **Módulos congelados:** `sales`, `inventory` y `reports` siguen en `updated: 2026-08-02` (**42 días**),
  igual que `00-modulos` y `00-conexiones`. `sales` no sabe nada de `IdleScreensaver`, `ClearCartModal`
  ni `generateReceiptHTML`. Ya estaba anotado el 08-27 y el 08-30; sigue igual. Es un resync de módulo
  completo, no un parche: merece su propia sesión.

## Preguntas abiertas
- **P-1 [pos] ¿El escaneo sobre el `SuccessModal` es un hábito de caja?** Sin respuesta desde el 08-26;
  bloquea [[POS-20260827-escaner-activo-con-modales]]. *(tercera sesión que la arrastra)*
- ~~**P-2 [infra] ¿El deploy a Azure ya corrió?**~~ → **CONTESTADA: sí** (Hallazgo 2).
- **P-3 [infra] ¿Caddy corre en contenedor (perfil `edge`) o en el host?** El comentario sin commitear
  de `docker-compose.prod.yml:82-84` sugiere **host**, y `docs/azure-deploy.md` §9 solo documenta el
  contenedor. Impacto: **medio** — decide qué dice la guía y si el perfil `edge` sirve o estorba.
- **P-4 [gobernanza] ¿El repo sigue público?** Ver [[GLOBAL-20260913-el-cerebro-se-publica-solo]].
  Impacto: **alto**, y condiciona cómo se redacta toda ficha futura.

## Por dónde retomar en frío
1. **Sacar la clave del repo.** Un minuto, y es lo único del tablero cuyo costo de demora es
   catastrófico e irreversible. [[INFRA-20260913-clave-ssh-de-la-vm-sin-ignorar]].
2. **Borrar el registro A del parking.** Hoy la mitad de los clientes que teclean el dominio no llegan
   a la caja. [[INFRA-20260913-dominio-apunta-tambien-al-parking]].
3. **Cerrar `/admin/`** en el borde. [[AUTH-20260913-admin-django-sin-rate-limit]].
4. **Commitear `docker-compose.prod.yml`** (corrigiendo antes `.env.example:96`): en HEAD, cualquier
   comando `manage-docker.sh * prod` revienta sin `DOMAIN`, aunque el perfil `edge` esté apagado.
5. Después: el tragador del reposo (el `.exe` ya apunta a una caja real) y el 500 del `cedula`.
6. Sigue esperando el ojo del owner: el `.exe` en Windows con la térmica, las tres features del
   08-15/08-16 (**veintiocho días**) y **prender el toggle de factura de BambiPan** (verificado hoy:
   sigue en `False` en la BD local).

## Enlaces
[[00-INDEX]] · [[GOBERNANZA]] · [[2026-08-30-planner-paso0-resync]] ·
[[ADR-INFRA-20260830-deploy-azure-tls-en-el-borde]] · [[INFRA-20260830-deploy-azure-sin-registro]]
