---
tags: [corrida, run, tenancy, frontend]
status: cerrada
module: tenancy
updated: 2026-08-15
---

# RUN-20260815-pegar-logo-portapapeles — pegar el logo con ⌘V / Ctrl+V

**Decisión:** [[ADR-TENANCY-20260815-pegar-logo-portapapeles]] · **Ejecutó:** el **Planner** (pedido
directo del owner en el chat, [[GOBERNANZA]] §10), con modo plan aprobado antes de tocar código ·
**Sin prompt para el Dev.**

## Qué se cambió (2 archivos, +109/-8 antes del arreglo del review)
- `el_vuelto_frontend/src/features/super-admin/tenants/components/TenantLogoField.tsx`
  — `draftFromFile()` compartido por el picker y el pegado · `usePastedLogo(active, onPick)` con el
  listener en `document` · `isTextEntry()` + `PASTE_SHORTCUT` · el hint anuncia el atajo.
- `el_vuelto_frontend/src/features/super-admin/tenants/index.tsx` — dos llamadas al hook, una por modal.
- `el_vuelto_frontend/CLAUDE.md` — doble actualización.

Cero backend. Cero cambios en la subida diferida ni en las invariantes de fallo parcial.

## Verificación — salida real

| # | Qué | Resultado |
|---|---|---|
| 1 | `npm run typecheck` | **exit 0**, sin errores (corrido dos veces: antes y después del arreglo del review) |
| 2 | `npm run build` | ✅ *built in 4.62s* / *5.09s*. El warning de chunk >500 kB es preexistente |
| 3 | `POST /api/auth/login/` superadmin | 200, token de 443 chars |
| 4 | `POST /api/tenants/` **en JSON** (lo que manda `onCreateSubmit`) | 201 · `activo: true` — **el motivo de mantener JSON sigue vigente**: no nació inactivo |
| 5 | `POST /tenants/{id}/upload_logo/` multipart campo `logo` (lo que manda `applyLogoDraft`) | **200** + `logo_url` de Cloudinary con `f_auto,q_auto:good` y `v<timestamp>` |
| 6 | `GET /tenants/{id}/` | el `logo_url` quedó pegado al negocio |
| 7 | **Invariante del espejo** — no-imagen | `{"error":"El archivo debe ser una imagen."}` 400 — **verbatim** igual a `validateImageFile` |
| 8 | **Invariante del espejo** — archivo de 11.6 MB | `{"error":"La imagen no puede superar los 10 MB."}` 400 — **verbatim** igual |
| 9 | Limpieza: `DELETE /logo/` → `DELETE /tenants/{id}/` | 204 / 204 · `GET` → 404 · **0 negocios**, como estaba antes. El asset se destruyó **antes** de borrar el negocio, para no dejar el huérfano de [[BACKEND-20260812-borrar-tenant-deja-asset-cloudinary]] |

Servidores: los que el owner ya tenía corriendo (`:8000` backend, `:5173` Vite). No se levantó nada
duplicado; el Vite propio que arrancó en `:5174` se apagó (CORS solo permite `:5173`).

## ⚠️ Límite honesto de esta verificación
**El ⌘V real del sistema operativo NO se ejecutó.** No hay extensión de Chrome conectada en este
entorno, no hay navegador headless (ni Playwright ni Puppeteer ni binario de Chromium) y el repo no
tiene jsdom ni framework de tests. **No se instaló nada** en el proyecto del owner para conseguirlo.

Lo que **sí** está probado ejecutando: que el contrato al que el borrador pegado alimenta funciona
end-to-end (casos 4-8), y que el código compila y typechequea. Lo que queda **sin ejecutar**: el
handler `usePastedLogo` en sí. Su lógica pasó por 5 lentes adversariales + 14 refutaciones, pero eso es
lectura, no ejecución. **El gesto queda pendiente de que el owner lo confirme a ojo** — igual que pasó
con [[RUN-20260809-frontend-tenant-detail-page]].

## Revisión adversarial — 19 agentes, 14 hallazgos, 11 refutados
5 lentes (React/hooks · el gesto y sus conflictos · seguridad · consistencia con las invariantes del
proyecto · a11y/UX), cada hallazgo pasado por un escéptico con sesgo a refutar.

**3 sobrevivieron, los 3 en baja, y los 3 con la misma raíz: el pegado exitoso era silencioso.**

1. **(seguridad)** El pegado **se come la tecla**. Con un pantallazo en el portapapeles (`hasText=false`)
   el foco deja de importar: quien apuntaba a pegar un NIT en su campo no ve nada aparecer ahí, puede no
   mirar el avatar, y terminar guardando el pantallazo como **logo público** — `logo_url` lo sirve
   `TenantBySlugView` sin autenticación (`apps/tenants/views.py:37-38`) y se pinta en el login de los
   cajeros (`StaffLoginPage.tsx:147-151`). Además el upload pisa el logo anterior (`overwrite=True`,
   `public_id` determinístico), sin deshacer.
2. **(a11y)** Un lector de pantalla **no se entera**: el `<span>` del hint no tiene `aria-live` y el
   único feedback del hook era el `toast.error` del camino de falla.
3. **(a11y, preexistente)** El nombre accesible en el modal de crear es *"Seleccionar logo de el
   negocio"* — la prop `nombre` nunca se pasó ahí. **No es regresión de este cambio.**

**Arreglo aplicado (1 línea, cierra 1 y 2):** `toast.success('Imagen pegada como logo. Se subirá al
guardar.')` después de consumir. `react-toastify` 11.1.0 renderiza con `role="alert"` — verificado en el
paquete instalado — así que el mismo toast es el anuncio para el lector de pantalla. Typecheck y build
re-corridos después: limpios.

El hallazgo 3 va al backlog sin tocarse: [[FRONT-20260815-logo-field-nombre-accesible]].

### Los 11 refutados (para que no se re-descubran)
Fueron, entre otros: que la stale closure del `onPickRef` fallaba · que los dos modales podían quedar
abiertos por teclado y el paste iba al tapado · que el veto por presencia de `text/plain` (sin mirar su
contenido) era un bug · que el hint se cortaba por el `maxWidth: 18rem` · que `iPhone` en la rama Mac
era un defecto · que `PASTE_SHORTCUT` exportado y usado en un solo lugar era código muerto. Todos
cayeron contra el código: o eran preexistentes, o el escenario no era demostrable, o el remedio
propuesto rompía otro caso.

## Deuda registrada, no tocada (sin scope creep)
- [[FRONT-20260815-productspage-paste-sin-validar-y-en-form]] — los dos huecos del patrón viejo.
- [[FRONT-20260815-logo-field-nombre-accesible]] — el hallazgo 3.

## Veredicto
✅ **Pasó.** Contrato verificado contra servidor real, entorno devuelto exactamente como estaba,
revisión adversarial corrida con 1 arreglo propio aplicado. Pendiente: la confirmación visual del
gesto por el owner.
