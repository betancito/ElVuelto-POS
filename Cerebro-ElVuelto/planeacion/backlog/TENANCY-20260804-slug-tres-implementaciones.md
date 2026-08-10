---
tags: [tarea, tenancy, bug]
status: 🟢
prioridad: alta
updated: 2026-08-09
---

> [!info] Cerrada 2026-08-09
> [[ADR-TENANCY-20260809-slug-persistido]] implementada y verificada: ejecución real en backend (transliteración, colisión con sufijo, inmutabilidad ante rename, `check-by-slug` resuelve por el slug persistido, login de cajero real trae `tenant_slug`) + workflow adversarial de 7 agentes (0 regresiones en todo el repo). Ver [[RUN-20260809-slug-persistido]]. Un hallazgo menor no bloqueante quedó en [[TENANCY-20260809-race-slug-integrity-error]].

# TENANCY-20260804-slug-tres-implementaciones — El cajero de un negocio con tilde no puede volver a entrar

**Tipo:** bug · **Descubierto:** PASO 0 del 2026-08-04 · **Verificado a mano por el Planner**
**Reemplaza/concreta:** [[TENANCY-20260802-slug-divergente]] (aquel decía "divergen"; este dice *cuáles* y *qué se rompe*).

## Problema
Hay **tres** implementaciones incompatibles de "nombre → slug":

| # | Dónde | Qué hace con los acentos | `"Café Bogotá"` → |
|---|---|---|---|
| 1 | `apps/tenants/views.py:16-17` `_nombre_to_slug` | los **borra** (`[^a-z0-9-]` sobre el string crudo) | `caf-bogot` |
| 2 | `el_vuelto_frontend/src/utils/slugify.ts:1-8` | los **translitera** (NFD + quita diacríticos) | `cafe-bogota` |
| 3 | `el_vuelto_frontend/src/features/users/UsersPage.tsx:31-33` `toSlug` | los **borra** (igual que #1) | `caf-bogot` |

El backend resuelve el tenant con **#1**. Pero al cerrar turno, el POS redirige usando **#2** (`PosPage.tsx:319`):

```ts
const slug = user?.tenantNombre ? slugify(user.tenantNombre) : null
navigate(slug ? `/login/${slug}` : '/login')
```

Para cualquier negocio con tilde o `ñ`, `#2 ≠ #1` ⇒ el cajero aterriza en `/login/cafe-bogota`, que el backend no resuelve ⇒ **"Sucursal no encontrada"**. En un POS colombiano los nombres con tilde son la norma, no la excepción.

La URL que el ADMIN copia y le entrega al cajero se genera con **#3**, que sí coincide con el backend — o sea el enlace inicial funciona y el fallo aparece **después**, al cerrar turno. Por eso nadie lo había visto.

## Defecto acompañante
No hay unicidad de `slug`: `TenantBySlugView` (`apps/tenants/views.py:30-44`) **recorre la tabla completa** comparando `_nombre_to_slug(t.nombre)` en Python y se queda con el primero. Dos negocios cuyo nombre colapse al mismo slug se pisan en silencio, y el escaneo es O(n) por request público.

## Criterio de aceptación
1. **Una sola** definición de slug, compartida, y el mismo resultado en los 3 puntos. Decidir explícitamente cuál gana (recomendado: transliterar, `"Café Bogotá"` → `cafe-bogota`, que es lo que un humano espera en una URL).
2. Cerrar turno desde el POS en un tenant con tilde aterriza en un `/login/{slug}` que **resuelve**.
3. Si se cambia la regla del backend, contemplar los tenants ya existentes (¿los enlaces viejos siguen sirviendo?).

## Notas para el Dev
- ⚠️ Esto **cambia URLs que ya se le entregaron a cajeros reales**. Antes de tocarlo, pregúntale al owner qué pasa con los enlaces vigentes — puede ameritar un ADR y/o un campo `slug` persistido y único en `Tenant` en vez de derivarlo del nombre en cada request.
- Doble actualización: `el_vuelto_backend/CLAUDE.md` + `el_vuelto_frontend/CLAUDE.md`.
