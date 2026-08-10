---
tags: [sesion, planner]
status: activo
updated: 2026-08-04
---

# Sesión 2026-08-04 — planner — PASO 0 en frío: re-sincronización cerebro ↔ código

**Contexto:** arranque de sesión como Agente A. La última nota de `_sesiones/` era del 2026-08-02, pero habían pasado dos sprints (08-03 y 08-04) sin handoff. El cerebro venía desfasado.

## Qué hice
Auditoría de re-sincronización con **13 verificadores en paralelo + 1 crítico de completitud** (0 errores), contrastando **cada** ítem del backlog contra los archivos en disco. Después **re-verifiqué a mano** todo lo que iba a escribir aquí: las 3 afirmaciones 🔒 ALTA, la contradicción entre dos agentes, y las anclas de los 4 ítems nuevos.

## Hallazgo de proceso (el más importante)

> [!warning] El prompt del sprint activo ya se había corrido y nadie lo registró
> `PROMPT-FIX-USERS-20260804-zod-requeridos-por-rol` figuraba 🔴 **escrito, sin correr**. En disco estaba **hecho y bien hecho** (`UsersPage.tsx:35-65` + `frontend/CLAUDE.md:132`, mismo mtime 2026-08-04 00:48). El Dev ejecutó y no entregó reporte.
> Es el modo de fallo inverso al de [[Sprint-2026-08-03-correccion-docs]] (allí el Dev dijo "listo" sin tocar nada). **Dos sprints seguidos con desfase en el registro de corridas.** Detectable siempre por mtime + `git diff`; el PASO 0 hay que hacerlo en serio cada arranque.
> → Registrado: [[RUN-20260804-zod-requeridos-por-rol]], veredicto ✅.

## Veredicto de la auditoría: 13 ítems

**Confirmados 🟢 (el cerebro decía la verdad):** products-permisos · sales-guard-monto · auth-tenant-id · reports-invalidar-tag · reports-500-tenant-none · front-cleanup (código muerto + ruta /test + deps; `npx tsc --noEmit` → **EXIT=0**) · front-errores-400 · tenancy-creación-atómica.

**Confirmados 🔴 (siguen rotos, como decía el cerebro):** users-patch-nulifica · users-password · reports-hardening-params · tenancy-toggle-fantasma · tenancy-slug.

**Desfases reales encontrados (4):**
1. `USERS-...-zod-requeridos-por-rol` decía 🔴 y estaba 🟢 (arriba).
2. `BACKEND-20260803-guard-tenant-none` tenía la **premisa falsa**: decía "devuelven vacío, no 500, no urge". Verifiqué ejecutando Django → `filter(tenant=SimpleLazyObject→None)` lanza **`TypeError` → 500**. Prioridad media → **alta**; alcance real 4 viewsets + 3 rutas de escritura, no 3 viewsets.
3. `DOCS-...-claudemd-drift` estaba 🟢 prematuro: quedan **12 afirmaciones falsas** en los `CLAUDE.md`. **Reabierto** 🟡.
4. Drift de líneas en 2 fichas de riesgo de users, y un "escenario de fallo" **mal descrito** en [[patch-nulifica-campos-omitidos]] (ese PATCH da 400 espurio, no borra). Corregidos ambos.

## 🔒 Hallazgo ALTA nuevo (verificado a mano)

**"Mi Perfil" puede dejar a un ADMIN sin login.** `UpdateMeView` (`apps/users/views.py:54,60`) pone `correo = None` si llega `""`, sin mirar el rol; `ProfilePage.tsx:66` manda ese campo en **cada** guardado y su Zod acepta la cadena vacía (`:15`); `correo` es el `USERNAME_FIELD` (`models.py:51`); y `/profile` es **ADMIN-only** (`router.tsx:89,100`) — o sea la única población que alcanza la pantalla es exactamente la que se rompe. Si el tenant tiene un solo ADMIN, no hay recuperación desde la app.

Lo grave conceptual: **es el segundo camino de escritura sobre `User`, y ninguna nota del cerebro lo cubría.** Rompe por detrás la misma invariante que el sprint estaba blindando por delante. → [[perfil-nulifica-correo-admin]] · [[USERS-20260804-perfil-nulifica-correo-admin]]

## ❌ Hallazgo ALTA que DESCARTÉ (por qué importa dejarlo escrito)

Un verificador reportó 🔒 ALTA: *"desactivar un usuario no le impide entrar: el guard chequea `is_active`, que siempre es True"*. **Es falso.** `apps/users/models.py:71-73`:
```python
@property
def is_active(self):
    return self.activo
```
`is_active` **es** `activo`. Los guards de `serializers.py:48-49,107-108` funcionan. Queda anotado para que nadie lo vuelva a levantar.

También se resolvió una **contradicción entre dos agentes**: uno afirmaba que `UserViewSet` con `tenant=None` lista a todos los superadmins. Falso hoy — revienta antes con `TypeError`. Es un riesgo *condicional*: se vuelve real si alguien "arregla" el 500 resolviendo a `None` literal en vez de rechazar con 403. Anotado como advertencia en el ticket.

## Ítems nuevos al backlog (6, todos con anclas verificadas por mí)
| ítem | prioridad |
|---|---|
| [[USERS-20260804-perfil-nulifica-correo-admin]] | 🔒 alta |
| [[DOCS-20260804-claudemd-garantia-falsa]] | 🔒 alta |
| [[SALES-20260804-items-duplicados-sobreventa]] | alta |
| [[TENANCY-20260804-slug-tres-implementaciones]] | alta |
| [[USERS-20260804-error-400-campo-no-montado]] | media |
| [[BACKEND-20260804-params-fecha-sin-validar]] | media |

## Estado al cerrar
- **Sprint activo:** [[Sprint-2026-08-04-users-hardening]] — ítem 1 🟢; alcance ampliado con el ALTA nuevo.
- **Prompt entregado al Dev:** [[PROMPT-FIX-USERS-20260804-invariante-correo-admin]] (🔴 escrito) — cierra el ALTA de perfil **+** `patch-nulifica` en un solo entregable, porque son los dos caminos de escritura de la misma invariante y arreglar uno deja el hueco abierto.
- Todo el vault sigue sin commitear. El humano versiona a mano.

## Preguntas para el owner (ordenadas por impacto)

```
P-1 [tenancy] ¿Qué pasa con los enlaces /login/{slug} que ya se le entregaron a cajeros
     de negocios con tilde?
   Evidencia: tenants/views.py:16-17 vs utils/slugify.ts:1-8 vs UsersPage.tsx:31-33 — tres
     implementaciones; PosPage.tsx:319 usa la que NO matchea el backend.
   Mi hipótesis: hay que persistir un campo `slug` único en Tenant y migrar, no seguir
     derivándolo del nombre en cada request.
   Si no contestas: asumo que se puede cambiar la regla y romper enlaces viejos, y lo marco ❓.
   Impacto: alto (un cajero que cierra turno no puede volver a entrar).

P-2 [users] ¿Un ADMIN debería poder cambiar su propio correo, o solo el superadmin?
   Evidencia: UpdateMeView (views.py:53-60) lo permite sin validar formato ni unicidad de tipo.
   Mi hipótesis: sí puede, pero nunca dejarlo vacío y siempre validando formato server-side.
   Si no contestas: implemento mi hipótesis (es lo que pide el prompt entregado).
   Impacto: alto.

P-3 [global] ¿Cableamos AUTH_PASSWORD_VALIDATORS o lo quitamos de settings?
   Evidencia: settings/base.py:73-78 lo declara; grep confirma que validate_password NO se
     invoca en ningún .py del backend. Hoy no valida nada.
   Mi hipótesis: cablearlo solo para ADMIN/SUPERADMIN; el PIN de 4 dígitos del cajero quedaría
     exento por decisión tuya del 2026-08-02.
   Si no contestas: lo dejo en el ítem de password y marco ❓ — no lo toco sin decisión.
   Impacto: medio (hoy es una falsa sensación de seguridad).

P-4 [users] DELETE /api/users/{id}/ está expuesto y revienta 500 con FK PROTECT
     (Sale.user, InventoryMovement.user). ¿Lo cerramos o lo convertimos en desactivar?
   Evidencia: UserViewSet es ModelViewSet completo (views.py:80-91); el front no lo llama.
   Mi hipótesis: cerrarlo (desactivar en vez de borrar).
   Impacto: medio.
```

## Por dónde retomar en frío
1. PASO 0 otra vez: [[00-INDEX]] + [[GOBERNANZA]] + [[00-planeacion]] + esta nota. **Y revisar mtime/`git diff` antes de creerle a cualquier estado del registro.**
2. Esperar el "review" del [[PROMPT-FIX-USERS-20260804-invariante-correo-admin]].
3. Responder P-1..P-4 con el owner. P-1 y P-3 probablemente ameritan ADR.
4. Después del sprint de users, lo 🔒 alta pendiente es: [[DOCS-20260804-claudemd-garantia-falsa]] (barato, alto valor) y [[BACKEND-20260803-guard-tenant-none-viewsets-restantes]] (ahora alta).
