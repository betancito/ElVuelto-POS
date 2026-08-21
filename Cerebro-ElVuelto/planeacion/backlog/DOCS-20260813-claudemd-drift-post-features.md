---
tags: [tarea, docs, frontend, backend]
status: 🔴
prioridad: alta
updated: 2026-08-20
---

# DOCS-20260813-claudemd-drift-post-features — 14 afirmaciones falsas en los tres `CLAUDE.md`

> [!info] Re-verificado el 2026-08-15 — sube de media a **alta** y se fusiona con el ítem del docstring
> Se re-comprobaron contra código las **5 más peligrosas** (recibos, `loginSuperAdmin`/`loginWorker`,
> "`password_policy` is the only place", la tabla del refresh, y la cita de línea de la regla
> CAJERO/ADMIN): **las 5 siguen falsas, con los números de línea exactos**. Ningún `CLAUDE.md` se tocó
> después de la nota (último commit que los modifica: `9727c03`).
> - **Sube a alta** porque un agente que lea esto va a buscar/escribir jsPDF en el módulo de ventas y va
>   a asumir que el tenant admin usa `loginWorker` — lo contrario de lo que hace
>   `TenantLoginPage.tsx:5`.
> - **El título decía "13"** pero la nota numera 14 puntos y el criterio de aceptación exige 14.
>   Corregido: son **14**.
> - Se toma como **un solo bloque** con [[BACKEND-20260813-docstring-tenancy-miente-aislamiento]].
> - Imprecisión menor de §A.3: `:367` no es `doc.save('credenciales-<slug>.pdf')` sino
>   `credenciales-<usuario>-<slug>.pdf`. No cambia el hecho (es PDF, no `.txt`).

> [!info] Re-verificado el 2026-08-20 — los 14 siguen falsos, pero **5 anclas se corrieron**
> La doble actualización de las features del 08-16 (teclado numérico + stock negativo) agregó **+42
> líneas** a `el_vuelto_frontend/CLAUDE.md` (hunks en `:83`, `:118`, `:152`, `:227`) y **+9** a
> `el_vuelto_backend/CLAUDE.md` (hunks en `:446`, `:518`, `:522`, `:528`). Los números de línea de esta
> ficha ya están **actualizados al código de hoy**:
> `front :292→:330` · `:293→:331` · `:145→:172` · `:135→:162` · `back :573-586→:578-592`.
> **Sin corrimiento** (re-verificados uno por uno): front `:15`, `:68`, `:72`; back `:308`, `:333`,
> `:340`, `:158`; y los 5 puntos del `CLAUDE.md` **raíz** (1, 4, 6, 11, 12) — ese archivo no se tocó.
> Ninguna de las 14 afirmaciones se corrigió de paso: quien documentó el 08-16 documentó lo suyo y no
> revisó el resto. Siguen siendo **14**. Detalle: [[2026-08-20-planner-paso0-resync]].

**Tipo:** doc drift · **Encontrado en:** PASO 0 del 2026-08-13 (agente de verificación con lectura del
código real, no del doc) · **Precedentes:** [[DOCS-20260802-corregir-claudemd-drift]] ·
[[DOCS-20260804-claudemd-garantia-falsa]]

El Planner **no puede** editar los `CLAUDE.md` ([[GOBERNANZA]] §0) — de ahí esta tarea. Cada punto se
confirmó abriendo el archivo de código citado.

## A. Recibos — falso en dos docs (lo más grave de la lista)
1. `CLAUDE.md:51` — *"`printReceipt.ts` — 80mm thermal layout; `generateReceipt.ts` — jsPDF download"*.
   → `src/utils/generateReceipt.ts:10` exporta solo `generateReceiptHTML(sale, tenant): string` y
   **no importa jsPDF** (`grep -rn jspdf src/` solo pega en `src/utils/downloadCredentials.ts:1`). El
   layout 80mm está en `generateReceipt.ts:89` (`@page { size: 80mm auto }`), no en `printReceipt.ts`
   (16 líneas de `window.open` + `print()`, `:5-16`). **No existe descarga PDF de recibo**: los únicos
   consumidores son `SalesHistoryPage.tsx:69` y `components/SuccessModal.tsx:157`, ambos con `printReceipt`.
2. `el_vuelto_frontend/CLAUDE.md:330` — *"`generateReceipt.ts` — jsPDF receipt for download"*. Misma mentira.
3. `el_vuelto_frontend/CLAUDE.md:331` — *"`downloadCredentials.ts` — exports credentials as `.txt`"*.
   → `downloadCredentials.ts:1` importa jsPDF; `:130` y `:254` construyen `new jsPDF({orientation:
   'landscape', format: 'a5'})`; `:239` y `:367` hacen `doc.save('credenciales-<slug>.pdf')`. Es **PDF A5
   apaisado**, nunca `.txt`. Los dos archivos están descritos al revés.

## B. Comandos
4. `CLAUDE.md:36` y `:39` — ponen `npm run commit` en el bloque de `el_vuelto_frontend/` y lo llaman
   "the safe path". → `el_vuelto_frontend/package.json:6-11` solo define `dev`, `build`, `preview`,
   `typecheck`. `"commit": "cz"` vive en el `package.json:11` de la **raíz**. Corrido dentro de
   `el_vuelto_frontend/` **falla**. (`el_vuelto_frontend/CLAUDE.md:15` ya lo corrige; el root nunca se actualizó.)
5. `el_vuelto_frontend/CLAUDE.md:15` — *"only defines the four above"* pero el bloque de `:10-12` lista
   **tres**; falta `preview` (`package.json:9`).

## C. Auth
6. `CLAUDE.md:92` — *"`loginSuperAdmin` vs `loginWorker`"* como corte super-admin vs tenant-admin/cajero.
   → `src/features/auth/TenantLoginPage.tsx:5,11` — el **tenant admin también** usa
   `useLoginSuperAdminMutation`. El corte real es **correo** (`/auth/login/`, superadmin *y* tenant admin)
   vs **cédula** (`/auth/login/cashier/`).
7. `el_vuelto_frontend/CLAUDE.md:72` — la lista de `AuthUser` omite `tenantEmail` y `tenantSupportPhone`
   (`src/features/auth/authSlice.ts:17-18`, poblados en `authApi.ts:59-60` desde `_user_payload`,
   `apps/users/serializers.py:50-51`). No es cosmético: los usa el recibo (`ReceiptTenantInfo`,
   `generateReceipt.ts:3-8`). El backend `CLAUDE.md:95` sí los lista.
8. `el_vuelto_frontend/CLAUDE.md:172` — cita `apps/users/serializers.py:192-194` para la regla
   "CAJERO requiere `cedula`, ADMIN requiere `correo`". → esas líneas hoy son entradas de
   `UserSerializer.Meta.fields`. La regla vive en `:253-256` (`UserCreateSerializer.validate`).

## D. Backend — endpoints y política
9. `el_vuelto_backend/CLAUDE.md:308` — tabla: *"`POST /api/auth/refresh/` → `TokenRefreshView` AllowAny"*.
   → `apps/users/urls.py:19` enruta a `ThrottledTokenRefreshView` (`apps/users/views.py:44-52`), con
   `ActiveUserTokenRefreshSerializer` + `TokenRefreshIPThrottle`. La misma doc lo dice bien en `:103` y
   `:151`; la tabla quedó vieja.
10. `el_vuelto_backend/CLAUDE.md:333,340` — *"`password_policy.py` is the **only** place the policy lives"*
    + lista de consumidores. → `apps/tenants/serializers.py:77` genera la credencial real del ADMIN
    inicial con `secrets.token_urlsafe(12)`, **sin pasar** por `password_policy.generate_password`, y no
    está en la lista. Es el mismo hecho que [[TENANCY-20260804-password-admin-inicial-fuera-de-politica]];
    acá lo que hay que arreglar es la palabra "only".

## E. Media y `.env` (menores, confirmados)
11. `CLAUDE.md:50` — *"Cloudinary for tenant logos and document uploads"*. → hay **tres** subidas de
    imagen (logo de tenant `apps/tenants/views.py:88`, producto `apps/products/views.py:66`, categoría
    `:29`) y **no existen "document uploads"**: `TenantDocument.DocumentType`
    (`apps/tenants/models.py:55-56`) tiene una sola opción, `LOGO`. Las imágenes de catálogo —el uso
    principal— ni se mencionan.
12. Bloques `.env` incompletos: `CLAUDE.md:71-83` omite `DOCS_API_KEY` (`settings/base.py:203`, y sí está
    en `.env.example`) y `REDIS_URL` (`:135`). `el_vuelto_backend/CLAUDE.md:578-592` omite `REDIS_URL`
    pese a exigirlo en `:158`. `CLAUDE.md:86-88` omite `VITE_APP_NAME` (`el_vuelto_frontend/.env.example:2`,
    `src/vite-env.d.ts:5`).
13. Listas de exports desactualizadas: `el_vuelto_frontend/CLAUDE.md:68` omite `updateUser`
    (`authSlice.ts:56,74`); `:162` omite `updateMe` (`usersApi.ts:56-58`, lo usa `ProfilePage`).

## Bonus — docstring que apunta mal (no es `CLAUDE.md`, pero es la misma tarea)
14. `elvuelto/docs_auth.py:5-6` — dice que la extensión se registra *"importing
    `drf_spectacular.contrib.rest_framework_simplejwt` in `settings/base.py`"*. → se registra en
    `elvuelto/docs_views.py:34`; `settings/base.py:189-200` **prohíbe explícitamente** hacerlo ahí.

## Lo que se verificó y SÍ está bien (no tocar)
Tenancy (ninguna de las tres docs afirma aislamiento automático — el problema está en un docstring, ver
[[BACKEND-20260813-docstring-tenancy-miente-aislamiento]]) · las tablas de endpoints de
`el_vuelto_backend/CLAUDE.md:306-474` salvo el punto 9 · las versiones de `requirements.txt` contra el
`.venv` · toda la sección Cloudinary (`:633-676`) · las ~100 clases `ta-*` citadas existen todas en
`tenant-admin.css` (0 faltantes).

## Criterio de aceptación
Los 14 puntos corregidos en el archivo que corresponde, cada uno verificado contra el código antes de
escribir. Reporte con la salida real de los `grep`/lecturas que lo confirman.

## Notas para el Dev
- **Es doc, no código.** No cambies comportamiento para que la doc quede cierta: la doc se adapta al
  código, no al revés.
- ❓ Aparte, sin acción: el `.venv` local tiene instalados `python_escpos 3.1`, `python_barcode 0.16.1` y
  `qrcode 8.2`, que **no** están en `requirements.txt` ni se importan en ningún `.py`. La afirmación de
  `el_vuelto_backend/CLAUDE.md:605` ("there is no ESC/POS printing dependency") es cierta respecto al
  repo; lo que está sucio es el entorno local. Ver [[riesgo-deps-duplicadas-y-escpos]].
