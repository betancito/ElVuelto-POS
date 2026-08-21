---
tags: [sesion, planner, paso0, resync]
status: activo
updated: 2026-08-20
---

# Sesión 2026-08-20 — planner — PASO 0 en frío

Arranque nuevo del Planner con [[INIT-AGENTS]]. Esta nota cubre el PASO 0; lo que se haga después se
agrega abajo.

## Qué se leyó
[[00-INDEX]] + [[GOBERNANZA]] + la última nota de sesión ([[2026-08-15-planner-paso0-resync]], que
incluye la feature del 08-16 anexada) + [[00-planeacion]] + las fichas de los 5 ítems de más peso.

## Método
Igual que las dos veces anteriores: la nota del 08-15 se tomó como **hipótesis**, no como hecho. Se
contrastó contra `git log`, `git status`, `mtime` de cada archivo y lectura directa del código. Esta vez
había una razón concreta para desconfiar: **entre el PASO 0 del 08-15 y hoy se escribieron tres
features**, y dos de ellas tocaron archivos citados por el backlog.

## Hallazgo 1 — el árbol de app YA NO está limpio (la nota del 08-15 dice que sí)
La sección *"Por dónde retomar en frío"* de [[2026-08-15-planner-paso0-resync]] dice *"Árbol de app
limpio"*. **Es falso desde ese mismo día**: se escribió durante el PASO 0, antes de las tres features que
vinieron después en esa misma sesión y en la del 08-16.

Estado real hoy:
- HEAD sigue en **`9727c03`** (2026-08-12 22:21). `main` al día con `origin/main`. **Ocho días sin
  commit.**
- **19 archivos de app modificados + 3 sin trackear**, todos de las features 6, 7 y 8:
  - `super-admin/tenants/index.tsx`, `TenantLogoField.tsx` (08-15 — pegar logo con ⌘V)
  - `StaffLoginPage.tsx`, `StaffLoginPage.module.css`, `components/NumericKeypad.tsx` (nuevo),
    `NumericKeypad.module.css` (nuevo) (08-16 — teclado numérico)
  - `products/models.py`, `products/serializers.py`, `sales/serializers.py`, `sales/views.py`,
    `inventory/serializers.py`, `migrations/0004_alter_product_stock_actual.py` (nuevo),
    `InventoryPage.tsx`, `ProductsPage.tsx`, `salesApi.ts`, `InventoryEntryPanel.tsx`, `SuccessModal.tsx`
    (08-16 — stock negativo)
  - `el_vuelto_backend/CLAUDE.md`, `el_vuelto_frontend/CLAUDE.md` (la doble actualización de esas features)
- **Nada se tocó desde el 2026-08-16 17:50.** Cuatro días de silencio.

> [!warning] Lo más riesgoso del estado actual: la migración sin commitear
> `products/migrations/0004_alter_product_stock_actual.py` está **aplicada en la BD local**
> (`showmigrations products` → `[X] 0004`) pero **no existe en git**. El cambio de regla de negocio de
> [[ADR-SALES-20260816-stock-negativo-permitido]] —`stock_actual` sin piso— vive hoy **solo en esta
> máquina**. Un `git clone` del repo hoy no lo tiene; un `migrate` en otra máquina deja la BD con el
> `PositiveIntegerField` viejo y el código nuevo asumiendo que puede ir a negativo.
> **Acción para el owner: commitear.** No es algo que el Planner pueda hacer ([[GOBERNANZA]] §0).

## Hallazgo 2 — el entorno sigue verde
- `makemigrations --check --dry-run` → **No changes detected** (exit 0). La 0004 cubre el cambio de
  modelo; no falta ninguna otra.
- `npx tsc --noEmit` → **exit 0**, cero errores, con el keypad y los cambios de stock adentro.
- **Ningún prompt 🟡 en curso** en los 7 `00-registro-<mod>`. Sin trabajo a medias.

## Hallazgo 3 — los 5 ítems de peso siguen abiertos (verificados hoy, no heredados)
| ítem | estado | evidencia de hoy |
|---|---|---|
| [[BACKEND-20260813-docstring-tenancy-miente-aislamiento]] | 🔴 SIGUE-ABIERTO | `tenants/viewsets.py:20-21` sigue diciendo *"automatically adds `.filter(tenant=...)`"* + *"cross-tenant data leakage is impossible"*; `products/views.py:58-60` sigue siendo el contraejemplo (override que **tumba** ese guard); `inventory/views.py:9` sigue importando `TenantModelViewSet` sin usarlo |
| [[DOCS-20260813-claudemd-drift-post-features]] | 🔴 SIGUE-ABIERTO (14/14) | ver Hallazgo 4 — **las líneas se corrieron** |
| [[BACKEND-20260811-manage-py-settings-fallback-inseguro]] | 🔴 SIGUE-ABIERTO | `manage.py:8` sigue con `setdefault(..., "elvuelto.settings.local")`; `wsgi.py:5` con `production` |
| [[BACKEND-20260811-falta-https-enforcement-produccion]] | 🔴 SIGUE-ABIERTO | `grep SECURE_` sobre `settings/production.py` → **cero hits**. Ni `SECURE_SSL_REDIRECT`, ni HSTS, ni cookies seguras |
| [[BACKEND-20260805-residuos-del-triaje]] | 🔴 SIGUE-ABIERTO (4/4) | ver Hallazgo 4 — **dos anclas se corrieron** |

Los 7 ítems 🔴 de prioridad baja **no** se re-verificaron, por la misma razón de siempre: hacerlo es el
"seguir buscando trabajo" que el owner pidió no hacer ([[elvuelto-cierre-estabilizacion]]).

## Hallazgo 4 — las features del 08-16 corrieron anclas del backlog (esto es lo que justifica el PASO 0)
La doble actualización del 08-16 tocó los dos `CLAUDE.md` y el modelo de productos, y con eso **movió
números de línea que el backlog cita**. Un Dev que hoy tomara esas fichas iría a la línea equivocada.
Corregido en las fichas:

**[[DOCS-20260813-claudemd-drift-post-features]]** — `el_vuelto_frontend/CLAUDE.md` creció +42 líneas
(bloques del keypad y del stock negativo, insertados en `:83`, `:118`, `:152`, `:227`):
| punto | ancla vieja | ancla de hoy |
|---|---|---|
| 2 (recibos jsPDF) | front `:292` | front **`:330`** |
| 3 (credenciales `.txt`) | front `:293` | front **`:331`** |
| 8 (cita `serializers.py:192-194`) | front `:145` | front **`:172`** |
| 13 (`usersApi` omite `updateMe`) | front `:135` | front **`:162`** |
| 12 (bloque `.env` sin `REDIS_URL`) | back `:573-586` | back **`:578-592`** |

Sin corrimiento (verificados igual): front `:15`, `:68`, `:72`; back `:308`, `:333`, `:340`, `:158`; y
**los 5 puntos del `CLAUDE.md` raíz** (1, 4, 6, 11, 12) — ese archivo no se tocó, sus mentiras están
intactas y en la misma línea.

**[[BACKEND-20260805-residuos-del-triaje]]**:
| punto | ancla vieja | ancla de hoy |
|---|---|---|
| 1 (`?user=` → 500) | `sales/views.py:42,51` | **`:43,52`** |
| 2 (`unique_tenant_barcode`) | `products/models.py:78` | **`:87`** |

Sin corrimiento: `inventory/views.py:50,56`, `products/models.py:26` (`unique_together`),
`applyServerErrors.ts:68,73`, `generateReceipt.ts:56`, `ReportsPage.tsx:609,610,773`.

## Hallazgo 5 — tres features cerradas siguen esperando el ojo del owner
No es deuda técnica, es una casilla sin marcar que se arrastra desde el 08-15:
- [[SUPERADMIN-20260815-pegar-logo-portapapeles]] — el ⌘V real nunca se ejecutó (sin navegador).
- [[AUTH-20260816-teclado-numerico-staff-login]] — el gesto táctil nunca se ejecutó (sin navegador).
- [[SALES-20260816-stock-negativo-permitido]] — contrato verificado contra servidor real, pero la
  pantalla del cajero vendiendo en negativo no la vio nadie.

Las tres están 🟢 en el backlog con un ⚠️ al lado. Con ocho días sin commit y cuatro sin actividad, vale
la pena decirlo en voz alta: **son la deuda más barata de saldar de todo el tablero** — abrir el
navegador y mirar.

## Estado al cerrar el PASO 0
Sin trabajo en curso, sin prompt pendiente, entorno verde (migraciones y typecheck). El cerebro quedó
sincronizado en 7 anclas de línea y en un hecho que la nota anterior daba al revés (árbol limpio).

**La pregunta para el owner es la misma de siempre, con un ítem nuevo arriba:**
0. **Commitear lo que hay** (8 días, 22 archivos, una migración aplicada que no está en git) y confirmar
   a ojo las tres features pendientes.
1. El bloque *"la doc miente"* (alta, barato, anclas ya corregidas hoy).
2. La config de deploy (2 ítems; necesita una respuesta suya sobre infraestructura).
3. RLS ([[GLOBAL-20260802-migracion-rls-postgres]], desbloqueado desde el 08-09, mini-proyecto).
4. Una feature nueva.
