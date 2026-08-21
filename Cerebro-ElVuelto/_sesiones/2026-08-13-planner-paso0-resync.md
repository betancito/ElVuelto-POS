---
tags: [sesion, planner, paso0, resync]
status: activo
updated: 2026-08-13
---

# Sesión 2026-08-13 — planner — PASO 0 en frío (re-sincronización completa)

Sesión nueva: el owner arrancó el Planner desde cero con [[INIT-AGENTS]]. Esta nota cubre **solo el
PASO 0**; lo que se haga después se agrega abajo.

## Qué se leyó
[[00-INDEX]] + [[GOBERNANZA]] (§10 incluida) + [[estado-tenancy]] + las dos notas de sesión del 08-12
([[2026-08-12-planner-logo-en-modales-crear-editar]] y
[[2026-08-12-planner-logo-tenant-y-pedidos-directos]]) + [[00-planeacion]] + [[00-global]] +
[[00-modulos]] + los 7 `00-registro-<mod>`.

## Hallazgo 1 — el cerebro estaba desfasado en el estado de git
Las dos notas del 08-12 cierran diciendo *"HEAD sigue en `a15f6cc`, 5 features post-estabilización en el
working tree sin commitear"*. **Falso hoy:**

- HEAD real = **`9727c03`** — *"feat(tenants): added tenant logo management from admin and super admin
  dashboards"*, 2026-08-12 22:21:10 -0500.
- `git status` → **working tree limpio**, `main` al día con `origin/main`.
- El commit trae **69 archivos**: las 5 features post-estabilización + el cerebro entero (263 archivos
  del vault están versionados).
- El owner hizo lo que el handoff sugería preguntarle (opción a: commitear lo acumulado). Ya no hay nada
  que preguntar ahí.

Corregido en: [[00-INDEX]] (sección nueva), [[00-planeacion]] (fila de la tarea de a11y),
[[estado-tenancy]] y [[FRONT-20260812-role-button-en-tr-rompe-tabla]] — las cuatro decían o implicaban
"sin commitear".

## Hallazgo 2 — los 12 ítems 🔴 del backlog siguen los 12 abiertos
Se verificó **uno por uno contra el código real** (un agente por ítem, leyendo los archivos citados, no
la nota). Resultado: `SIGUE-ABIERTO` en los 12. Ninguno se resolvió solo, ninguno estaba mal clasificado.

| ítem | severidad re-evaluada |
|---|---|
| [[BACKEND-20260811-manage-py-settings-fallback-inseguro]] | media |
| [[BACKEND-20260811-falta-https-enforcement-produccion]] | media |
| [[BACKEND-20260805-residuos-del-triaje]] | media |
| [[FRONT-20260812-role-button-en-tr-rompe-tabla]] | baja |
| [[BACKEND-20260812-upload-optimized-image-valueerror-500]] | baja |
| [[BACKEND-20260812-n1-logo-url-listado-tenants]] | baja |
| [[BACKEND-20260812-borrar-tenant-deja-asset-cloudinary]] | baja |
| [[FRONT-20260812-passwordbanner-codigo-muerto]] | baja |
| [[TENANCY-20260809-race-slug-integrity-error]] | baja |
| [[FRONT-20260805-falta-capa-compartida-de-errores]] | baja |
| [[TENANCY-20260804-password-admin-inicial-fuera-de-politica]] | baja |
| [[SUPERADMIN-20260802-impersonar-tenant]] | n/a (feature no empezada) |

**8 de las 12 notas tenían drift de referencias** (números de línea corridos por el trabajo posterior, o
datos que la propia evolución del código volvió falsos). Todas corregidas. Las tres correcciones que no
son cosméticas:

1. **[[BACKEND-20260811-falta-https-enforcement-produccion]]** decía que `DOCS_API_KEY` viaja como
   `?key=`. **Ese modo ya no existe** — hoy es formulario (`docs_views.py:114`) o header
   `X-Docs-Api-Key`. El cambio *refuerza* el ítem: el secreto de docs ahora vive en una **cookie de
   sesión** (`docs_views.py:115`) que necesita el flag `Secure`. Se agregó además que
   `SESSION_COOKIE_SECURE`/`CSRF_COOKIE_SECURE` se pueden fijar **ya**, sin consultar la topología del
   deploy; solo `SECURE_SSL_REDIRECT`/`SECURE_PROXY_SSL_HEADER` quedan bloqueados por esa pregunta.
2. **[[BACKEND-20260812-borrar-tenant-deja-asset-cloudinary]]** tenía un ❓ sobre si productos y
   categorías sufrían lo mismo. **Auditado: sí, y peor** — `apps/products/views.py` nunca importa ni
   llama `destroy_image` (solo sube, `:7-12`), así que esos assets no se destruyen nunca y, a diferencia
   del logo, no se auto-sanan.
3. **[[SUPERADMIN-20260802-impersonar-tenant]]** partía de "el SUPERADMIN no tendrá acceso directo a los
   datos de un negocio". [[ADR-G-20260809-superadmin-acceso-tenant-scoped]] ya lo matizó: hoy lee
   usuarios y métricas y resetea contraseñas **sin impersonar**. Baja la urgencia de la feature; antes de
   tomarla hay que preguntarle al owner qué le falta que esos 3 endpoints no le den.

## Hallazgo 3 — la mentira del aislamiento automático volvió, en un docstring
🔴 **alta** · [[BACKEND-20260813-docstring-tenancy-miente-aislamiento]]

`apps/tenants/viewsets.py:20-21` promete que `TenantModelViewSet` hace *"cross-tenant data leakage
impossible at the API layer"*. Es la **misma mentira** que este proyecto ya cazó y corrigió en los
`CLAUDE.md` ([[DOCS-20260802-corregir-claudemd-tenancy]]), sobreviviendo reubicada — y en el peor lugar
posible, porque un agente la lee justo antes de escribir una vista nueva.

Contraejemplo en el mismo repo: `ProductViewSet` (`apps/products/views.py:57-60`) pisa `get_queryset()`
y tiene que volver a llamar `self._get_tenant()` a mano. Solo **2** ViewSets extienden
`TenantModelViewSet`; todo lo demás filtra a mano con `require_tenant`. Los tres `CLAUDE.md` hoy dicen la
verdad (`el_vuelto_backend/CLAUDE.md:69` — *"Inheriting it is not enough"*); el docstring los contradice.

## Hallazgo 4 — 14 afirmaciones falsas en los tres `CLAUDE.md`
🔴 **media** · [[DOCS-20260813-claudemd-drift-post-features]]

Lo peor: **recibos**. El root `CLAUDE.md:51` y el `el_vuelto_frontend/CLAUDE.md:292-293` describen
`generateReceipt.ts` y `downloadCredentials.ts` **al revés** — el primero no importa jsPDF (devuelve HTML
puro) y el segundo sí (genera PDF A5 apaisado, no `.txt`). No existe ninguna descarga PDF de recibo.
También: `npm run commit` documentado en el directorio equivocado, el corte de logins mal descrito (el
tenant admin usa `loginSuperAdmin` también), la tabla que aún dice `TokenRefreshView` cuando es
`ThrottledTokenRefreshView`, y `password_policy.py` descrito como *"the only place"* cuando
`apps/tenants/serializers.py:77` lo esquiva.

Lo que **sí** está bien y no hay que tocar: toda la sección de tenancy de los `CLAUDE.md` (el problema es
el docstring, no la doc), las tablas de endpoints salvo un renglón, las versiones de `requirements.txt`
contra el `.venv`, la sección Cloudinary entera, y las ~100 clases `ta-*` citadas (existen las 100).

## Hallazgo 5 — la última feature aguanta la re-verificación
Los 5 puntos que el cerebro afirma de
[[SUPERADMIN-20260812-logo-en-modales-crear-editar]] se re-verificaron contra el código: **5/5
confirmados**, sin divergencias (subida diferida real, ambos modales, `DELETE .../logo/` con
`IsSuperAdmin` idempotente 204, `destroy_image` atrapando `ValueError`, y el create todavía en JSON). El
motivo declarado para mantener JSON se comprobó empíricamente contra DRF 3.15.2: con multipart y `activo`
omitido, `validated_data['activo']` sale **False** y el negocio nacería inactivo; con JSON la clave
queda ausente y gana el default del modelo (`True`).

## Otros datos del entorno
- `makemigrations --check --dry-run` → **No changes detected**. Sin migraciones pendientes.
- Ningún archivo de app modificado después del commit (`find -newermt`), salvo `dist/` (build, ignorado).
- **Ningún prompt en curso** 🟡 en los 7 registros. Los dos ⛔ históricos
  (`PROMPT-FIX-DOCS-20260803-claudemd-tenancy`, `PROMPT-FIX-USERS-20260805-promocion-no-rota-credencial`)
  quedaron cerrados por trabajo posterior.
- ❓ El `.venv` local tiene `python_escpos 3.1`, `python_barcode 0.16.1` y `qrcode 8.2` instalados que
  **no** están en `requirements.txt` ni se importan en ningún `.py`. El repo está limpio; el entorno
  local está sucio. Sin acción por ahora, anotado en [[DOCS-20260813-claudemd-drift-post-features]].

## Estado al cerrar el PASO 0
Sin trabajo en curso, sin prompt pendiente, sin nada sin commitear. El cerebro quedó re-sincronizado.
La pregunta al owner: qué sigue — la deuda 🔴 acumulada (14 ítems, 3 de ellos de peso) o una feature nueva.

## Por dónde retomar en frío
1. Leer [[00-INDEX]] (tiene la sección del PASO 0 del 08-13 arriba del warning de review) + [[GOBERNANZA]]
   + esta nota.
2. HEAD al cierre de este PASO 0: `9727c03`, árbol limpio salvo las ediciones del cerebro de esta sesión.
3. El backlog está verificado al 2026-08-13: se puede confiar en los estados 🔴 sin re-verificarlos.
