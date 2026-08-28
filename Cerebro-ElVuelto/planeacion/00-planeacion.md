---
tags: [indice, planeacion]
status: activo
updated: 2026-08-27
---

# 00-planeacion — Índice de planeación

> [!decision] ✅ Estabilización cerrada — 2026-08-09
> El owner pidió avisar cuando termine la estabilización para pasar a features. **Las 4 condiciones de [[CRITERIO-CIERRE-ESTABILIZACION]] se cumplieron el 2026-08-09.** Handoff: [[2026-08-09-planner-cierre-estabilizacion]]. A partir de acá, nuevo trabajo = features, no hardening.

Índice delgado, append-only. Un ítem = un archivo.

## Épicas
- [[EPIC-20260802-estabilizacion]] — estabilizar + documentar en paralelo (🟢 cerrada 2026-08-09).
- [[EPIC-20260809-superadmin-gestion-tenants]] — primera feature post-estabilización: detalle de negocio con métricas + gestión de usuarios, reemplaza el módulo Usuarios de super-admin (🟢 cerrada 2026-08-09).

## Sprints
- [[Sprint-2026-08-02-estabilizacion-doc]] — cerebro base + 4 arreglos prioritarios (🟢 cerrado 2026-08-03).
- [[Sprint-2026-08-03-correccion-docs]] — corregir los CLAUDE.md que mienten (🟢 cerrado 2026-08-03).
- [[Sprint-2026-08-04-users-hardening]] — cerrar los 3 defectos de users + 1 🔒 ALTA del PASO 0 (🟢 cerrado 2026-08-04, 3/3 corridas ✅).

## Backlog
| ítem | prioridad | estado |
|---|---|---|
| [[SALES-20260802-guard-monto-recibido]] | alta | 🟢 |
| [[AUTH-20260802-exigir-tenant-id-login-cajero]] | alta | 🟢 |
| [[FRONT-20260802-borrar-codigo-muerto]] | alta | 🟢 |
| [[BACKEND-20260802-limpiar-deps]] | alta | 🟢 |
| [[FRONT-20260802-cerrar-ruta-test]] | alta | 🟢 |
| [[DOCS-20260802-corregir-claudemd-tenancy]] | alta | 🟢 |
| [[DOCS-20260802-corregir-claudemd-drift]] | media | 🟢 |
| [[USERS-20260802-unificar-reglas-password]] | media | 🟢 |
| [[GLOBAL-20260802-migracion-rls-postgres]] | media | ⏸️ |

### Descubiertos en la auditoría de módulos (2026-08-02)
| ítem | prioridad | estado |
|---|---|---|
| [[PRODUCTS-20260802-viewsets-sin-permiso]] | 🔒 alta | 🟢 |
| [[TENANCY-20260802-creacion-tenant-atomica]] | alta | 🟢 |
| [[FRONT-20260802-errores-400-silenciados]] | alta | 🟢 |
| [[USERS-20260802-zod-requeridos-por-rol]] | alta | 🟢 |
| [[REPORTS-20260802-invalidar-tag-report]] | alta | 🟢 |
| [[REPORTS-20260802-endpoints-500-tenant-none]] | alta | 🟢 |
| [[USERS-20260802-patch-nulifica-campos]] | media | 🟢 |
| [[TENANCY-20260802-toggle-active-fantasma]] | media | 🟢 |
| [[TENANCY-20260802-slug-divergente]] | media | 🟢 (resuelto como efecto colateral de [[ADR-TENANCY-20260809-slug-persistido]]) |
| [[REPORTS-20260802-hardening-params]] | media | 🟢 (queda el float del dinero → [[dinero-como-float]]) |

### Features / decisiones del owner (2026-08-02)
| ítem | prioridad | estado |
|---|---|---|
| [[SUPERADMIN-20260802-impersonar-tenant]] | media | 🔴 |

### Descubiertos en reviews (2026-08-03)
| ítem | prioridad | estado |
|---|---|---|
| [[BACKEND-20260803-guard-tenant-none-viewsets-restantes]] | **alta** (subida 2026-08-04: es 500, no queryset vacío) | 🟢 |

### Descubiertos en el PASO 0 (2026-08-04)
| ítem | prioridad | estado |
|---|---|---|
| [[USERS-20260804-perfil-nulifica-correo-admin]] | 🔒 alta | 🟢 |
| [[DOCS-20260804-claudemd-garantia-falsa]] | 🔒 alta | 🟢 |
| [[SALES-20260804-items-duplicados-sobreventa]] | alta | 🟢 |
| [[TENANCY-20260804-slug-tres-implementaciones]] | alta | 🟢 |
| [[USERS-20260804-error-400-campo-no-montado]] | media | 🟢 (vía [[FRONT-20260805-cuatro-400-invisibles]]) |
| [[BACKEND-20260804-params-fecha-sin-validar]] | media | 🟢 |
| [[TENANCY-20260804-password-admin-inicial-fuera-de-politica]] | baja | 🔴 |
| [[BACKEND-20260804-guard-tenant-usercreateserializer]] | media | 🟢 |

### Descubiertos el 2026-08-05
| ítem | prioridad | estado |
|---|---|---|
| [[FRONT-20260805-cuatro-400-invisibles]] | media | 🟢 |
| [[FRONT-20260805-falta-capa-compartida-de-errores]] | baja | 🔴 |
| [[BACKEND-20260805-seed-cajero-sin-cedula]] | media | 🟢 |
| [[BACKEND-20260805-escrituras-que-evaden-serializers]] | 🔒 alta | 🟢 |
| [[BACKEND-20260805-cerrar-residuos-users-auth]] | 🔒 alta | 🟢 |
| [[AUTH-20260805-sin-throttling-en-login]] | 🔒 alta | 🟢 |
| [[PRODUCTS-20260805-valores-negativos-dinero-y-stock]] | 🔒 alta | 🟢 |
| [[USERS-20260805-promocion-no-rota-credencial]] | 🔒 alta | 🟢 |
| [[BACKEND-20260805-residuos-del-triaje]] | media | 🔴 |
| [[BACKEND-20260805-sin-revocacion-de-sesiones]] | 🔒 alta | 🟢 |

### Descubiertos en review 2026-08-09
| ítem | prioridad | estado |
|---|---|---|
| [[USERS-20260809-promocion-no-muestra-password-rotado]] | 🔒 alta | 🟢 |
| [[TENANCY-20260809-race-slug-integrity-error]] | baja | 🔴 |

### Features (2026-08-09) — post-estabilización
| ítem | prioridad | estado |
|---|---|---|
| [[SUPERADMIN-20260809-pagina-detalle-negocio]] | feature | 🟢 (ambas fases corridas) |
| [[BACKEND-20260809-compresion-estandar-imagenes]] | feature | 🟢 (corrida y verificada) |
| [[BACKEND-20260811-docs-swagger-api-key]] | feature | 🟢 (corrida y verificada; pedida directo al Planner, sin prompt previo) |
| [[SUPERADMIN-20260812-logo-tenant-desde-panel]] | feature | 🟢 (corrida y verificada; pedida directo al Planner, con análisis/planeación primero) |
| [[SUPERADMIN-20260812-logo-en-modales-crear-editar]] | feature | 🟢 (corrida y verificada; agrega también quitar el logo — endpoint backend nuevo) |
| [[SUPERADMIN-20260815-pegar-logo-portapapeles]] | feature | 🟢 (corrida; pedido directo con modo plan. Contrato verificado contra servidor real; revisión adversarial de 19 agentes → 1 arreglo propio. ⚠️ el ⌘V real **no** se pudo ejecutar: sin navegador. Falta confirmación visual del owner) |
| [[SALES-20260816-stock-negativo-permitido]] | feature | 🟢 (corrida; pedido directo con modo plan. **Cambio de regla de negocio en dinero/stock.** 14/14 casos contra servidor real incluida la trampa de la entrada parcial; **dos** rondas adversariales, 45 agentes → 19 hallazgos + **2 arreglos míos que estaban mal**, todo corregido. ⚠️ falta confirmación visual del owner) |
| [[AUTH-20260816-teclado-numerico-staff-login]] | feature | 🟢 (corrida; pedido directo con modo plan. Login de cajero verificado contra servidor real; **dos** rondas adversariales, 39 agentes → 15 hallazgos + **2 regresiones de mis propios arreglos**, todo corregido. ⚠️ el gesto táctil **no** se pudo ejecutar: sin navegador. Falta confirmación visual del owner) |

### Descubiertos en la revisión adversarial de la feature de docs (2026-08-11)
| ítem | prioridad | estado |
|---|---|---|
| [[BACKEND-20260811-manage-py-settings-fallback-inseguro]] | alta | 🔴 |
| [[BACKEND-20260811-falta-https-enforcement-produccion]] | media | 🔴 |

### Descubiertos en la feature de logo en modales (2026-08-12)
| ítem | prioridad | estado |
|---|---|---|
| [[FRONT-20260812-role-button-en-tr-rompe-tabla]] | media | 🔴 (a11y; viene del trabajo del 08-09, **ya commiteada** en `9727c03` — deuda en `main`) |
| [[BACKEND-20260812-upload-optimized-image-valueerror-500]] | baja | 🔴 (mismo agujero que sí se arregló en `destroy_image`) |
| [[BACKEND-20260812-n1-logo-url-listado-tenants]] | baja | 🔴 (preexistente) |
| [[BACKEND-20260812-borrar-tenant-deja-asset-cloudinary]] | baja | 🔴 (preexistente) |
| [[FRONT-20260812-passwordbanner-codigo-muerto]] | baja | 🔴 (preexistente) |

### Descubiertos en el PASO 0 (2026-08-13)
Los 12 ítems 🔴 de arriba se re-verificaron uno por uno contra el código: **los 12 siguen abiertos**,
ninguno se resolvió solo. 8 tenían referencias de línea desfasadas, ya corregidas. Detalle:
[[2026-08-13-planner-paso0-resync]].

| ítem | prioridad | estado |
|---|---|---|
| [[BACKEND-20260813-docstring-tenancy-miente-aislamiento]] | alta | 🔴 (la mentira del aislamiento automático volvió, en un docstring) |
| [[DOCS-20260813-claudemd-drift-post-features]] | media → **alta** (2026-08-15, ver abajo) | 🔴 (14 afirmaciones falsas en los 3 `CLAUDE.md`) |

### PASO 0 (2026-08-15) — re-verificación y sinceramientos
Los 5 ítems 🔴 de más peso se re-verificaron contra el código real: **los 5 siguen abiertos y esta vez
sin una sola línea corrida** (el código no se tocó desde `9727c03`). Los 7 de prioridad baja **no** se
re-verificaron a propósito. Detalle: [[2026-08-15-planner-paso0-resync]].

> [!decision] Los dos ítems de doc se toman como UN bloque, severidad alta
> [[BACKEND-20260813-docstring-tenancy-miente-aislamiento]] + [[DOCS-20260813-claudemd-drift-post-features]]
> = **"la doc miente"**, un solo trabajo. El argumento para bajar el docstring a media era circular: se
> apoyaba en que los `CLAUDE.md` dicen la verdad, y el ítem vecino prueba que mienten en renglones
> contiguos (`CLAUDE.md:49` verdadera / `:51` falsa; `:92` falsa / `:93` verdadera).

> [!warning] `GLOBAL-20260802-migracion-rls-postgres` ya NO está bloqueado
> Su prerrequisito literal era "que la épica de estabilización esté cerrada". **Se cerró el 2026-08-09**
> y la nota arrastró ⏸️ seis días. Sigue en ⏸️ **por decisión pendiente del owner**, no por bloqueo. Es
> además el arreglo estructural del ítem del docstring.

| ítem | prioridad | estado |
|---|---|---|
| [[BACKEND-20260815-docs-login-key-en-traceback-debug]] | baja | 🔴 (la `DOCS_API_KEY` no se censura en la página de error con `DEBUG=True`; salió de verificar el ítem de `manage.py`, no de buscar) |

### Descubiertos en la feature de pegar el logo (2026-08-15)
| ítem | prioridad | estado |
|---|---|---|
| [[FRONT-20260815-productspage-paste-sin-validar-y-en-form]] | baja | 🔴 (el patrón viejo de `ProductsPage`: pega sin validar y el `onPaste` en el `<form>` no dispara sin foco previo) |
| [[FRONT-20260815-logo-field-nombre-accesible]] | baja | 🔴 (preexistente: el control se anuncia "logo de **el** negocio" en el modal de crear) |

### Descubiertos en la feature de stock negativo (2026-08-16)
| ítem | prioridad | estado |
|---|---|---|
| [[INVENTORY-20260816-recordatorio-activo-stock-negativo]] | media | 🔴 (el owner lo dejó explícito para después: hoy la señal es pasiva, hay que entrar a Inventario) |
| [[BACKEND-20260816-borrar-tenant-con-ventas-da-500]] | media | 🔴 (preexistente: `ProtectedError` sin mapear; salió al limpiar los datos de prueba) |

### PASO 0 (2026-08-20) — re-verificación, sin ítems nuevos
Los 5 ítems 🔴 de más peso se re-verificaron contra el código real: **los 5 siguen abiertos**. Los 7 de
prioridad baja **no** se re-verificaron a propósito. **No se abrió ningún ítem nuevo** — no se salió a
buscar. Detalle: [[2026-08-20-planner-paso0-resync]].

> [!info] ~~Hay trabajo terminado sin commitear desde el 2026-08-12~~ — **RESUELTO el 2026-08-20**
> Este warning ya no aplica y se deja tachado como historia. El owner commiteó: HEAD = **`eacaae0`**
> (2026-08-20 20:43), `products/migrations/0004_alter_product_stock_actual.py` **está en git**, las
> features 6, 7 y 8 quedaron versionadas y `main` está **pusheado** (`main` == `origin/main`, verificado
> el 2026-08-24). El cambio de regla de [[ADR-SALES-20260816-stock-negativo-permitido]] ya es
> reproducible en otra máquina.

> [!info] Anclas corregidas hoy — las features del 08-16 corrieron líneas del backlog
> [[DOCS-20260813-claudemd-drift-post-features]]: front `:292→:330`, `:293→:331`, `:145→:172`,
> `:135→:162`; back `:573-586→:578-592`. Las del `CLAUDE.md` **raíz** no se movieron.
> [[BACKEND-20260805-residuos-del-triaje]]: `sales/views.py:42,51→:43,52`, `products/models.py:78→:87`.
> Un Dev que hubiera tomado esas fichas sin este PASO 0 habría ido a la línea equivocada.

> [!todo] Pendiente que no es código: confirmación visual de 3 features
> [[SUPERADMIN-20260815-pegar-logo-portapapeles]] (⌘V real), [[AUTH-20260816-teclado-numerico-staff-login]]
> (gesto táctil) y [[SALES-20260816-stock-negativo-permitido]] (la venta en negativo en pantalla) están
> 🟢 con ⚠️: ninguna se pudo ejecutar en navegador desde este entorno.

### Features evaluadas, no arrancadas (2026-08-21)
| ítem | prioridad | estado |
|---|---|---|
| [[DESKTOP-20260821-app-escritorio-cajero-exe]] | feature | 🟡 **fase 1 implementada el 2026-08-24** (beta manual: `el_vuelto_desktop/`), ⚠️ sin validar en papel. Falta la fase 2 (módulo de descarga, firma, hosting) |

> [!decision] Lo que decidió la arquitectura fue un motivo que no venía en el pedido
> El owner pidió "un módulo para descargar un `.exe`", pero al preguntarle el dolor de fondo marcó
> **impresión silenciosa del recibo** como motivo #1. Eso descarta la PWA (10× más barata, resolvía los
> otros dos motivos) y descarta Tauri, porque **sólo un wrapper de escritorio puede imprimir sin el
> diálogo del sistema**. Propuesta: **Electron**. No es ADR todavía — se ratifica cuando se apruebe el
> plan de la fase 1.

> [!warning] El pedido tiene el peso al revés
> El "módulo de descarga" es la pieza **más chica** (una card con el molde de `UsersPage.tsx:235` + un
> endpoint que hace redirect). El trabajo real es el wrapper y el puente de impresión — y **no se puede
> generar un `.exe` por tenant en el servidor**: se compila uno solo y el slug entra por el nombre del
> archivo. Costos que no son código: firma (~USD 200-400/año, sin ella SmartScreen bloquea y contradice
> el motivo "verse profesional"), hosting del binario y un runner Windows en CI.

### PASO 0 (2026-08-24) — re-verificación, sin ítems nuevos
Los 5 ítems 🔴 de más peso se re-verificaron contra el código real: **los 5 siguen abiertos y sin una
sola ancla corrida** (el código no se toca desde el 2026-08-16 17:50). Los 7 de prioridad baja **no** se
re-verificaron a propósito. **No se abrió ningún ítem nuevo.** Entorno verde (`makemigrations --check`
exit 0, `tsc --noEmit` exit 0), árbol de app limpio, sin prompts 🟡 en curso. Detalle:
[[2026-08-24-planner-paso0-resync]].

> [!todo] Sigue pendiente lo mismo que el 2026-08-21, y ya arrastra nueve días
> (a) La **fase 1** de [[DESKTOP-20260821-app-escritorio-cajero-exe]] — nada implementado; el paso
> natural es modo plan sobre el wrapper Electron + puente de impresión, contra `localhost`, en el Mac.
> (b) La **confirmación visual del owner** de [[SUPERADMIN-20260815-pegar-logo-portapapeles]],
> [[AUTH-20260816-teclado-numerico-staff-login]] y [[SALES-20260816-stock-negativo-permitido]]: es abrir
> el navegador y mirar, la deuda más barata del tablero.

### Novena feature, cerrada 2026-08-24 — beta manual del `.exe` de caja
| ítem | prioridad | estado |
|---|---|---|
| [[DESKTOP-20260821-app-escritorio-cajero-exe]] (fase 1) | feature | 🟡 (corrida; pedido directo con modo plan. Generador `build.py` + wrapper Electron + selector de impresora, en `el_vuelto_desktop/`. Generación verificada punta a punta y CLI 11/11 contra tty real; revisión adversarial propia → 5 hallazgos, 5 arreglados. ⚠️ **la impresión NO se pudo probar**: este Mac no tiene impresoras y el owner testea en Windows) |

> [!decision] El supuesto que se cayó: sí se puede hacer un `.exe` desde el Mac
> La ficha decía que desde macOS *"no se genera un `.exe` confiable"* y que hacía falta CI en Windows.
> **Falso**, probado con un binario real: `@electron/packager` + **`resedit`** (JS puro) hacen el trabajo
> sin wine. Lo que exigía wine era `rcedit`. El CI servirá para **firmar**, no para producir.
> Ver [[ADR-DESKTOP-20260824-wrapper-electron-y-generador-manual]].

> [!warning] Deuda que nace con esta beta
> Sin firma de código (SmartScreen avisa — contradice el motivo "verse profesional" y **no** sirve para
> vender) · el `config.json` horneado **adentro** del paquete habrá que sacarlo cuando se firme ·
> `elvuelto:print` queda expuesto a la página remota (mitigado con serialización + tope de 512 KB).

> [!todo] Ahora hay CUATRO cosas esperando el ojo del owner
> Las tres del 08-15/08-16 (⌘V, teclado numérico, stock negativo) **más** la beta del `.exe`: que
> arranque en Windows, que liste impresoras y que el recibo salga en la térmica sin diálogo.

### PASO 0 (2026-08-26) — re-verificación, sin ítems nuevos
Los 5 ítems 🔴 de más peso se re-verificaron contra el código real: **los 5 siguen abiertos y sin una
sola ancla corrida**. La edición de `printReceipt.ts` del 08-24 **no movió** las líneas del bloque de
doc: `el_vuelto_frontend/CLAUDE.md:330` y `:331` siguen siendo exactamente las dos afirmaciones falsas
que dice [[DOCS-20260813-claudemd-drift-post-features]]. Los 7 de prioridad baja **no** se
re-verificaron a propósito. **No se abrió ningún ítem nuevo.** Entorno verde (`makemigrations --check`
exit 0, `tsc --noEmit` exit 0), sin prompts 🟡 en curso. Detalle:
[[2026-08-26-planner-paso0-resync]].

> [!warning] La beta del `.exe` lleva dos días sin commitear
> El árbol de app **ya no está limpio**: `el_vuelto_desktop/` (15 archivos que sí entran al commit),
> `printReceipt.ts`, los dos `CLAUDE.md` y `.gitignore`. HEAD sigue en `eacaae0`, pusheado. Commitear es
> acción del owner ([[GOBERNANZA]] §0). El arreglo del `.gitignore` del 08-24 se auditó con
> `git check-ignore` archivo por archivo y **aguanta**: `tools/elvuelto.ico` y `tools/patch-exe.js`
> entran; solo se ignora lo que debe (`dist/`, `node_modules/`, `app/config.json`, `urls.json`).

> [!question] Dos cosas anotadas que NO se convirtieron en ficha
> (a) `.gitignore:16` ignora `package-lock.json` en todo el repo, así que el generador del `.exe` no es
> reproducible al 100% en un clon nuevo (`electron` clavado en `44.0.0`, pero `@electron/packager` y
> `resedit` con `^`). Convención preexistente → **decisión del owner** si la beta merece excepción.
> (b) ❓ `.gitignore` tiene `+temp.md` sin commitear, sin rastro en ningún RUN ni nota. Hipótesis: lo
> agregó el owner. Impacto bajo, se anota para no dejar el cambio sin trazabilidad.

> [!todo] Las cuatro cosas que esperan al owner siguen esperando
> (a) Correr `ElVuelto-<slug>.exe` en **Windows con la térmica** — es lo único que decide si la fase 1 de
> [[DESKTOP-20260821-app-escritorio-cajero-exe]] sirve, y la fase 2 no arranca antes.
> (b) La confirmación visual de [[SUPERADMIN-20260815-pegar-logo-portapapeles]],
> [[AUTH-20260816-teclado-numerico-staff-login]] y [[SALES-20260816-stock-negativo-permitido]]: once días.

### Décima feature, cerrada 2026-08-26 — el stack en Docker
| ítem | prioridad | estado |
|---|---|---|
| [[INFRA-20260826-dockerizacion-stack]] | feature | 🟢 (corrida; pedido directo. Front + back + nginx en contenedores, un solo origen, `scripts/manage-docker.sh`. Dev y prod verificados contra servidor real. Revisión propia → 3 defectos, 3 arreglados. ✅ **la revisión adversarial §10.2 se pagó el 2026-08-27** (2 de las 7 lentes fueron de Docker, ver [[RUN-20260827-caja-adulto-mayor-y-recibo]]). ⚠️ falta que el owner lo abra en el celular) |

> [!decision] Lo que decidió la arquitectura fue el mismo origen, no los contenedores
> El owner pidió front en `:5173` y back en `:8000`, "el mismo puerto adentro y afuera". Eso literalmente
> son **dos orígenes** y devuelve el CORS que la tarea venía a eliminar. Se concilió haciendo que **nginx
> escuche en los dos puertos**: `:5173` sirve la app entera en un origen y `:8000` es passthrough al
> backend. Los números quedaron como los pidió. Ver [[ADR-INFRA-20260826-docker-nginx-mismo-origen]].

> [!warning] El repo ya tenía el camino de mismo origen, y su propio default lo desandaba
> `vite.config.ts:19-23` tenía el proxy `/api` desde antes, con un comentario que menciona un nginx en
> `192.168.1.9:5173` — pero sin `.env` en el frontend, `VITE_API_URL` quedaba `undefined` y ganaba el
> fallback absoluto de `apiBase.ts:7`. El proxy era código muerto. Salió del Discovery, no de buscar.

> [!todo] Deuda nueva, y una vieja que se volvió blocker
> (a) ✅ **SALDADA el 2026-08-27.** Quedó escrito acá que la revisión adversarial de [[GOBERNANZA]] §10.2
> no se había corrido (solo revisión propia, y el setup toca CSRF y validación de hosts). Se pagó esa
> misma madrugada: **2 de las 7 lentes** del workflow adversarial fueron de Docker. Ver
> [[RUN-20260827-caja-adulto-mayor-y-recibo]].
> (b) La deuda del lockfile que anotó el PASO 0 de esta mañana (Hallazgo 6) **se volvió un blocker real**:
> con `package-lock.json` ignorado, `npm ci` no puede correr en un clon nuevo. Resuelto para el frontend
> con una negación puntual; **`el_vuelto_desktop/package-lock.json` sigue ignorado**.

### Décima primera feature, cerrada 2026-08-27 — la caja, para el cajero real
| ítem | prioridad | estado |
|---|---|---|
| [[POS-20260827-caja-1366x768-y-reposo]] | feature | 🟢 (corrida; pedido directo con ronda de preguntas y ejecución autónoma nocturna. Cinco tareas: POS usable en 1366×768, `.exe` en pantalla completa, modo reposo con salvapantallas, recibo térmico legible y vaciado de carrito con confirmación. ⚠️ **nada se pudo ver en pantalla**: falta el ojo del owner) |
| [[POS-20260827-escaner-activo-con-modales]] | media | 🔴 (preexistente, descubierto al construir el modal de vaciado; no se tocó) |
| [[POS-20260827-tres-arreglos-a-medias]] | **alta** | 🔴 (nace de la re-verificación del 2026-08-27: de los 7 arreglos que la revisión adversarial dio por cerrados, **3 no cierran el caso que decían cerrar**. El peor: el toque que despierta **todavía mete un producto al carrito** con un toque sostenido >400 ms — el gesto exacto del adulto mayor para el que se rediseñó la caja) |

> [!decision] Cinco pedidos, un solo criterio
> Al responder la ronda de preguntas el owner agregó la restricción que ordena todo lo demás: *"esto
> sera manejado por adultos boomers colombianos que muchas veces la tecnologia los confunde"*. Eso
> convierte cinco tareas sueltas en un criterio de diseño, y explica por qué el POS venía fallando:
> está construido con la densidad de una app de escritorio, sobre un equipo de 1366×768 manejado con
> el dedo. Ver [[ADR-POS-20260827-caja-para-adulto-mayor-en-1366x768]].

> [!warning] Lo que estaba roto no era estético
> `.pos-cash-modal` medía **~871px de alto sin `max-height` ni scroll**, y el backdrop lo centra: se
> recortaban ~50px arriba y ~50px abajo. **Abajo vive el botón Confirmar** — el cajero no podía verlo
> ni alcanzarlo. Y el botón que **borraba la venta entera** medía 24px, sin fondo y sin confirmación.
> Las tres media queries que existían eran todas de ANCHO; el problema siempre fue el alto.

> [!info] El workflow de mapeo se pagó solo
> Antes de tocar código, 6 lectores + 1 arquitecto sobre el POS. Encontraron 3 defectos que la lectura
> directa no vio (el carrito vacío empujando el pago fuera; el numpad flotante abriéndose fuera de
> pantalla; el salvapantallas tapando el aviso de stock negativo, que solo viene en la respuesta del
> POST) **y corrigieron un cálculo mío que hacía desaparecer el precio de las tarjetas**.

> [!todo] Sigue sin verificarse en pantalla
> Sin navegador en el entorno. Para el recibo quedó `temp/recibo-antes-y-despues.html`, que se abre y
> se manda a la térmica con Ctrl+P. Para el resto, falta el ojo del owner.
