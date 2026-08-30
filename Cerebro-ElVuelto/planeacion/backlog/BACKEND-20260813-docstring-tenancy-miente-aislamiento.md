---
tags: [tarea, backend, tenancy, docs, seguridad]
status: 🔴
prioridad: alta
updated: 2026-08-30
---

# BACKEND-20260813-docstring-tenancy-miente-aislamiento — la mentira del aislamiento automático volvió, ahora en un docstring

**Tipo:** doc que miente (dentro del código) · **Encontrado en:** PASO 0 del 2026-08-13, agente de drift
de `CLAUDE.md` · **Relacionado:** [[DOCS-20260802-corregir-claudemd-tenancy]] ·
[[ADR-G-20260802-tenancy-isolation]] · [[patron-tenancy]] · [[riesgo-tenancy-sin-red-de-seguridad]]

## El problema
`el_vuelto_backend/apps/tenants/viewsets.py:20-21` — el docstring de `TenantModelViewSet` afirma que
automáticamente agrega `.filter(tenant=request.tenant)` **"so that cross-tenant data leakage is
impossible at the API layer"**.

Es **falsa**, y es exactamente la mentira que este proyecto ya cazó y corrigió una vez en los
`CLAUDE.md` (ver [[DOCS-20260802-corregir-claudemd-tenancy]]). Sobrevivió reubicada en un docstring, que
es el lugar donde un agente la va a leer justo antes de escribir una vista nueva.

Por qué es falsa, con el contraejemplo en el mismo repo:
- Heredar el ViewSet **no basta**: si una subclase pisa `get_queryset()`, el filtro del padre no corre.
  `apps/products/views.py:57-60` hace exactamente eso — `ProductViewSet` pisa `get_queryset()` y tiene
  que volver a llamar `self._get_tenant()` a mano.
- Hoy solo **dos** ViewSets extienden `TenantModelViewSet` (`CategoryViewSet`, `apps/products/views.py:18`
  y `ProductViewSet`, `:53`). `SaleViewSet`, `InventoryMovementViewSet`, `StockView`, `UserViewSet` y los
  5 `APIView` de reports filtran **a mano** vía `require_tenant`. "Impossible at the API layer" describe
  una app que no existe.
- Los tres `CLAUDE.md` **sí** dicen la verdad hoy (`el_vuelto_backend/CLAUDE.md:69` — "Inheriting it is
  not enough"). El docstring los contradice de frente.

> [!info] Re-verificado en el PASO 0 del 2026-08-15 — sigue abierto, sin una línea corrida
> El texto mentiroso está textual en `viewsets.py:20-21`, el contraejemplo en `products/views.py:57-60`,
> y `CategoryViewSet`/`ProductViewSet` en `:18` y `:53`: **todas las anclas cuadran exactas**. El
> criterio de aceptación no se cumple (`grep -n "impossible"` sigue devolviendo la línea 21) y
> `viewsets.py` no se toca desde el commit `a15f6cc` (2026-08-09).
>
> **Dos precisiones nuevas:**
> 1. La nota decía "los tres `CLAUDE.md` sí dicen la verdad". Son **dos**: el raíz (`:49`, `:93`) y
>    `el_vuelto_backend/CLAUDE.md` (`:61`, `:69` — literal *"Inheriting it is not enough"*, `:724`).
>    `el_vuelto_frontend/CLAUDE.md:182` no afirma nada del tema, solo remite al backend. Es un silencio,
>    no una confirmación.
> 2. **Hay un import muerto que refuerza justo la lectura errónea:**
>    `apps/inventory/views.py:9` importa `TenantModelViewSet` y **nunca lo usa** —
>    `InventoryMovementViewSet` (`:17`) hereda `mixins` + `GenericViewSet` y filtra a mano. Quien grepee
>    el símbolo va a ver 3 archivos y va a creer que inventory está cubierto por el filtro automático.
>    **Borrar ese import es parte de esta tarea.**
>
> **Severidad: se mantiene alta.** Un verificador propuso bajarla a media porque "los `CLAUDE.md` que un
> agente lee primero son correctos". El argumento es circular:
> [[DOCS-20260813-claudemd-drift-post-features]] prueba que ese mismo archivo miente en renglones
> contiguos (`CLAUDE.md:49` verdadera vs `:51` falsa). Los dos ítems se toman como **un solo bloque**
> ("la doc miente") — ver [[00-planeacion]] y [[2026-08-15-planner-paso0-resync]].

## Criterio de aceptación
El docstring de `viewsets.py:20-21` ya no promete imposibilidad. Dice, como mínimo: que el filtro solo
aplica si la subclase **no** pisa `get_queryset()`, que hoy solo lo usan `CategoryViewSet` y
`ProductViewSet`, y que el resto del backend filtra a mano. Verificable con
`grep -n "impossible" el_vuelto_backend/apps/tenants/viewsets.py` → 0 resultados.

## Notas para el Dev
- **Solo el docstring.** No cambies el comportamiento de `TenantModelViewSet` en esta tarea; hacerlo
  real (una red de seguridad de verdad) es otra discusión, la de [[GLOBAL-20260802-migracion-rls-postgres]]
  y [[riesgo-tenancy-sin-red-de-seguridad]].
- Doble actualización: no hace falta tocar los `CLAUDE.md` por esto — ya son correctos. Sí conviene que
  el docstring apunte al `CLAUDE.md` en vez de repetir la regla.


> [!warning] Re-verificado en el PASO 0 del 2026-08-30 — sigue abierto, y el dato más fuerte no estaba escrito
> `abee9d8` **no tocó ni un archivo bajo `el_vuelto_backend/apps/`**
> (`git diff eacaae0..abee9d8 -- el_vuelto_backend/apps/tenants/viewsets.py` → salida vacía; del backend
> solo se movieron `.dockerignore`, `CLAUDE.md`, `settings/base.py`, `settings/production.py` y
> `requirements.txt`). El archivo no se toca desde `a15f6cc`. Anclas **intactas**: la mentira sigue en
> `apps/tenants/viewsets.py:20-21` — *"cross-tenant data leakage is impossible at the API layer"* — y
> `grep -n "impossible"` la sigue devolviendo, o sea que el criterio de aceptación no se cumple.
>
> **El número que la ficha no tenía:** de **11 vistas tenant-scoped** del backend, solo **2** heredan
> `TenantModelViewSet` (`apps/products/views.py:18` `CategoryViewSet`, `:53` `ProductViewSet`) — y una
> de esas dos, `ProductViewSet`, **pisa `get_queryset()`** (`:57-64`) y tiene que volver a llamar
> `_get_tenant()` a mano. O sea: **`CategoryViewSet` es la única vista del sistema que realmente recibe
> el filtro automático**. "Impossible at the API layer" describe **1 de 11 endpoints**.
>
> Las otras 9 filtran a mano con `require_tenant`: `sales/views.py:35`, `inventory/views.py:47,67`,
> `inventory/views.py:76` (`StockView`), `users/views.py:158`, y los 5 `APIView` de reports
> (`reports/views.py:25,70,123,195,237`).
>
> **El contraejemplo lo escribió el propio equipo, a 35 líneas de distancia:**
> `apps/products/views.py:58-59` dice *"Overriding get_queryset drops TenantModelViewSet's guard"*.
> El repo se contradice a sí mismo dentro del mismo módulo.
>
> **Residuo nuevo, salido de contar:** `apps/inventory/views.py:9` importa `TenantModelViewSet` y
> **ninguna de sus dos clases lo hereda** — import muerto que refuerza la impresión falsa de que el
> módulo está cubierto.
>
> `el_vuelto_backend/CLAUDE.md:61,69` **sí dice la verdad** (*"Inheriting it is not enough"*), lo que
> deja al docstring como el único lugar que miente. Ver [[2026-08-30-planner-paso0-resync]].
