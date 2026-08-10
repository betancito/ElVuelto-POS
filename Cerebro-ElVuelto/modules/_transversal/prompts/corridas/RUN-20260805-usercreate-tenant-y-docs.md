---
tags: [corrida, backend, users, tenancy, docs]
status: 🟢 corrido-ok
module: _transversal
updated: 2026-08-05
---

# RUN 2026-08-05 — Guard de tenant en `UserCreateSerializer` + 10 correcciones de doc

**Prompt:** [[PROMPT-FIX-BACKEND-20260805-usercreate-tenant-y-docs]]
**Tareas:** [[BACKEND-20260804-guard-tenant-usercreateserializer]] (🟢 cerrada) + [[DOCS-20260802-corregir-claudemd-drift]] (🟡 sigue abierta, ver abajo)
**Veredicto:** ✅ PASÓ — **10/10 de lo pedido**, verificado punto por punto.

## Diff entregado
`apps/users/serializers.py` (21:06) + `el_vuelto_backend/CLAUDE.md` y `el_vuelto_frontend/CLAUDE.md` (21:07). **`CLAUDE.md` raíz sin tocar** (mtime 08-03) — la instrucción explícita, respetada. Ningún otro archivo de código.

## Parte A — el último camino sin guard: 6/6

`makemigrations --check --dry-run` → `No changes detected`

| # | Caso | Resultado |
|---|---|---|
| 1 | `POST /users/` superadmin, CAJERO con cédula | **403** `Tenant context is required…` (era `TypeError` → 500) |
| 2 | `POST /users/` superadmin, ADMIN sin cédula | **403** (era `ValueError` → 500) |
| 3 | `POST /users/` ADMIN, cajero válido | **201** |
| 4 | `POST /users/` ADMIN, cédula duplicada | **400** `Ya existe un cajero con esta cédula…` — la unicidad por tenant sigue viva |
| 5 | `PATCH /users/{admin} {"nombre"}` | **200**, `correo` y `cedula` intactos |
| 6 | `PATCH /users/{cajero} {"nombre"}` | **200**, `cedula` intacta |

Los dos sitios (`:203` unicidad, `:231` `create`) pasan por `require_tenant`. Los casos 5 y 6 confirman que no rompió [[RUN-20260804-invariante-correo-admin]] — `validate()` corre igual en `partial_update`, donde el tenant sí existe.

**Con esto la invariante de tenancy queda cerrada de punta a punta:** no queda ningún camino del backend que dereferencie `request.tenant` sin guard.

## Parte B — las 10 correcciones pedidas: 10/10

Verificadas por `grep` contra el disco:

| # | Quedó |
|---|---|
| 1 | `POST /inventory/movements/ … **IsCajero** (see the lead_cashier rule below)` |
| 2 | `?fecha=YYYY-MM-DD **(optional → today in America/Bogota)**` |
| 3 | `?product` (era `?product_id`) |
| 4 | `?user` (era `?user_id`) |
| 5 | `support_number (nullable — support phone shown to the tenant's staff)` agregado al modelo |
| 6 | La viñeta *"Still NOT guarded"* eliminada (ya no aplica) |
| 7 | `> **DashboardPage.tsx does NOT live here**` — con la explicación de por qué se confunde (consume `reportsApi`) |
| 8 | `--font-headline` → **Noto Serif** (la que usan las `ta-*`) y `--font-serif` → **Playfair Display**, con la advertencia de no confundirlas |
| 9 | Tabla de rutas completa: `/profile`, `/staff`, `/super-admin/history` |
| 10 | `ReportsPage` descrita con sus **4 modos de periodo** + el banner de error nuevo |

El #7 y el #8 los resolvió mejor de lo pedido: en vez de mover o corregir la línea, dejó una advertencia explicando **por qué** es fácil equivocarse. Eso es lo que evita que el drift vuelva.

---

## ⚠️ Cuenta honesta: quedan 3 afirmaciones falsas, y la culpa es del Planner

`DOCS-20260802-corregir-claudemd-drift` **no se puede cerrar**. No porque el Dev fallara —hizo exactamente lo que le pedí, completo— sino porque **el prompt que escribí omitió 3 renglones** que sí estaban en la ficha de la tarea:

| # | Archivo:línea | Dice | La verdad |
|---|---|---|---|
| 1 | `frontend/CLAUDE.md:13` | `npm run commit` como comando del frontend | `el_vuelto_frontend/package.json` **no tiene** ese script (`dev`/`build`/`preview`/`typecheck`); `"commit": "cz"` vive solo en el `package.json` raíz. Corrido desde `el_vuelto_frontend/` **falla** |
| 2 | `backend/CLAUDE.md:503` | `Cashier \| cedula=12345678 / cajero123` | El seed crea el cajero con `correo="maria@laesperanza.com"` y **sin cédula** (`seed_dev_data.py:65-77`). La credencial documentada no existe |
| 3 | `backend/CLAUDE.md:356` | `ventas-por-hora → [{hora, total, transacciones}]` | Falta `top_productos`, que el código sí devuelve (`apps/reports/views.py:109`) |

> [!warning] Error de proceso del Planner (2ª vez con la misma raíz)
> Los 3 renglones estaban en la tabla de [[DOCS-20260802-corregir-claudemd-drift]] pero **no los copié al prompt**. Peor: el #2 sí lo mencioné en el chat al entregar el prompt, y **no quedó en el archivo canónico** — exactamente lo que [[GOBERNANZA]] §9 prohíbe ("lo del chat es copia; el canónico SIEMPRE vive en el cerebro").
> **Regla para mí:** al escribir un prompt que cierra una tarea con una lista, copiar la lista **completa** desde la ficha y contar los renglones contra ella antes de entregar.

## Hallazgo de código derivado del #2
El seed no solo está mal documentado: **el cajero que crea no puede entrar al POS.** `seed_dev_data.py:65-77` lo crea con `correo` y sin `cedula`, pero `CashierLoginSerializer` exige `cedula` + `tenant_id` y `StaffLoginPage` solo manda cédula. Además es data que **la propia API rechazaría** (`UserCreateSerializer` exige cédula para CAJERO desde el 08-04): el seed escribe por el manager del modelo y se salta la validación. → [[BACKEND-20260805-seed-cajero-sin-cedula]]

## Checklist de trampas
**#1 tenancy** ✅ cierra el último hueco · **#4 permisos** ✅ sin cambios · **#9 migraciones** ✅ · **#10 doble actualización** ✅ es el objeto de la Parte B · **#11** ✅ sin git, sin front, raíz intacto.
