---
tags: [prompt, backend, users, tenancy, docs, fix]
status: 🔴
module: _transversal
updated: 2026-08-05
---

# Prompt DEV — Cerrar el último hueco de tenancy y dejar de mentir en los CLAUDE.md

**Tareas backlog:** [[BACKEND-20260804-guard-tenant-usercreateserializer]] + [[DOCS-20260802-corregir-claudemd-drift]]
**Alcance:** un fix de código chico + 8 correcciones de doc, **todas verificadas contra el código el 2026-08-05**. No git. No tocar el front (salvo su `CLAUDE.md`).

Van juntas porque el fix de código obliga a corregir una de las frases falsas, y el resto vive en los mismos dos archivos.

---

## Parte A — El último camino que lee `request.tenant` crudo

`UserCreateSerializer` quedó fuera del barrido de [[RUN-20260804-guard-tenant-none-y-doc]] y sigue dereferenciando el tenant sin guard:

- `apps/users/serializers.py:203` → `tenant = self.context["request"].tenant` (filtro de unicidad de cédula)
- `apps/users/serializers.py:231` → `validated_data["tenant"] = request.tenant` (en `create`)

**Modo de fallo real, ejecutado por el Planner** — `POST /api/users/` como SUPERADMIN (tenant None):

| Payload | Hoy |
|---|---|
| CAJERO con `cedula` | `TypeError: one of the hex, bytes… must be given` → **500** (en `:203`) |
| ADMIN sin `cedula` | `ValueError: Cannot assign "<SimpleLazyObject: None>": "User.tenant" must be a "Tenant" instance.` → **500** (en `:231`) |

**Qué hacer:** resolver con `require_tenant(...)` → **403**, mismo patrón que el resto. No uses `is None` (es un `SimpleLazyObject`, ver [[patron-tenancy]]).

> [!warning] No rompas el PATCH
> `validate()` corre también en `partial_update`, donde el tenant **sí** existe. El fix de [[RUN-20260804-invariante-correo-admin]] depende de que ese camino siga funcionando: un `PATCH {"nombre": "X"}` sobre un ADMIN debe seguir dando **200** sin borrar `correo` ni `cedula`.

---

## Parte B — Las 8 afirmaciones falsas (todas re-verificadas hoy)

| # | Archivo:línea | Dice | La verdad (código) |
|---|---|---|---|
| 1 | `backend/CLAUDE.md:314` | `POST /api/inventory/movements/ … IsAdmin` | `get_permissions` devuelve `[IsCajero()]` para `create` y exige `lead_cashier` (`apps/inventory/views.py:31,37`) |
| 2 | `backend/CLAUDE.md:352` | `ventas-por-hora … ?fecha=YYYY-MM-DD (required)` | **No es obligatorio**: sin `fecha` toma hoy en `America/Bogota` (`apps/reports/views.py:73-75`) |
| 3 | `backend/CLAUDE.md:313` | `?product_id` | El código lee **`?product`** (`apps/inventory/views.py:50`) |
| 4 | `backend/CLAUDE.md:323` | `?user_id` | El código lee **`?user`** (`apps/sales/views.py:42`) |
| 5 | `backend/CLAUDE.md:128-131` | modelo `Tenant` sin `support_number` | El campo existe (`apps/tenants/models.py:12`) |
| 6 | `backend/CLAUDE.md` (viñeta *"Still NOT guarded"*) | `POST /users/` como superadmin *"creates a user with `tenant=None`"* | **Falso**: lanza `ValueError` y **no crea nada**. Al hacer la Parte A esta viñeta se reemplaza por el 403 |
| 7 | `frontend/CLAUDE.md:150` | `DashboardPage.tsx` bajo `### features/reports/` | Vive en `src/features/dashboard/` |
| 8 | `frontend/CLAUDE.md:230` | `var(--font-serif)` → Noto Serif | `--font-serif` es **Playfair Display** (`globals.css:7`). La Noto Serif de los títulos es **`--font-headline`** (`globals.css:74`), que es la que usan las clases `ta-*` (`tenant-admin.css:29,366`) |

⚠️ **Los #3 y #4 son los más dañinos**: quien use el nombre documentado no obtiene ningún filtrado — el param se ignora **en silencio**, sin error.

✅ **El `CLAUDE.md` raíz sobre las fuentes está BIEN** (dice "Noto Serif headlines" y las tablas `ta-*` dicen Noto Serif, que es correcto vía `--font-headline`). **No lo toques.**

### Además, dos incompletitudes (no mentiras)
- `frontend/CLAUDE.md`: la tabla de rutas **no lista** `/profile`, `/staff` ni `/super-admin/history` (verificado: `grep` no los encuentra). Completala contra `src/app/router.tsx`.
- `frontend/CLAUDE.md:152`: describe `ReportsPage` como *"a date picker"*; hoy tiene **4 modos de periodo** (diario/semanal/mensual/personalizado) más el banner de error nuevo.

---

## Restricciones
- Backend: **solo** `apps/users/serializers.py`. Docs: `el_vuelto_backend/CLAUDE.md` y `el_vuelto_frontend/CLAUDE.md`. **Nada de código del front. No toques el `CLAUDE.md` raíz.**
- Sin migraciones. Claves de error en español.
- **No rompas** nada de lo entregado estos días: invariante del correo, política de password, guards de tenancy, agregación de stock, parseo de params, ni los 4 fixes de 400 del front.
- **Verificá cada línea antes de reescribirla.** Los `CLAUDE.md` se editaron mucho estos días y los números de línea de arriba son del 2026-08-05: si alguno no coincide, buscá el texto, no la línea.

## Entregable / verificación
1. `python manage.py makemigrations --check --dry-run` → sin cambios (pegá la salida).
2. Pegá request/respuesta de:

| # | Caso | Esperado |
|---|---|---|
| 1 | `POST /api/users/` como SUPERADMIN, CAJERO con cédula | **403**, no 500 |
| 2 | `POST /api/users/` como SUPERADMIN, ADMIN sin cédula | **403**, no 500 |
| 3 | **`POST /api/users/` como ADMIN, cajero válido** | **201** (regresión) |
| 4 | **`POST /api/users/` como ADMIN, cédula duplicada en el tenant** | **400** `{"cedula": …}` (regresión: la unicidad por tenant sigue viva) |
| 5 | **`PATCH /api/users/{id_admin}/ {"nombre": "X"}` como ADMIN** | **200**, `correo` y `cedula` intactos (regresión del fix de nulificación) |

3. Para la Parte B, pegá el `grep` que demuestre que cada frase vieja ya no está.
4. Veredicto ✅ / 🔴.

> [!info] Sobre el presupuesto de líneas
> `backend/CLAUDE.md` pasa de 400 líneas (GOBERNANZA §3) y estas correcciones no lo bajan. Partirlo sigue siendo **opcional** por decisión del owner — **no lo hagas en este prompt**.
