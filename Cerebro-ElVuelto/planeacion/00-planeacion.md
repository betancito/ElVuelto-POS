---
tags: [indice, planeacion]
status: activo
updated: 2026-08-20
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

> [!warning] Hay trabajo terminado sin commitear desde el 2026-08-12
> HEAD sigue en `9727c03`. Las features 6, 7 y 8 (19 archivos modificados + 3 nuevos) están solo en el
> árbol de trabajo, **incluida la migración `0004_alter_product_stock_actual.py`, que está aplicada en la
> BD local pero no existe en git**. El cambio de regla de negocio de
> [[ADR-SALES-20260816-stock-negativo-permitido]] no es reproducible en otra máquina hasta que se
> commitee. Acción del owner.

> [!info] Anclas corregidas hoy — las features del 08-16 corrieron líneas del backlog
> [[DOCS-20260813-claudemd-drift-post-features]]: front `:292→:330`, `:293→:331`, `:145→:172`,
> `:135→:162`; back `:573-586→:578-592`. Las del `CLAUDE.md` **raíz** no se movieron.
> [[BACKEND-20260805-residuos-del-triaje]]: `sales/views.py:42,51→:43,52`, `products/models.py:78→:87`.
> Un Dev que hubiera tomado esas fichas sin este PASO 0 habría ido a la línea equivocada.

> [!todo] Pendiente que no es código: confirmación visual de 3 features
> [[SUPERADMIN-20260815-pegar-logo-portapapeles]] (⌘V real), [[AUTH-20260816-teclado-numerico-staff-login]]
> (gesto táctil) y [[SALES-20260816-stock-negativo-permitido]] (la venta en negativo en pantalla) están
> 🟢 con ⚠️: ninguna se pudo ejecutar en navegador desde este entorno.
