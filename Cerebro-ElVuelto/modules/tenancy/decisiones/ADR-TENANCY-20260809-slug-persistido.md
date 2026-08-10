---
tags: [adr, tenancy, bug]
status: aceptado
updated: 2026-08-09
---

# ADR-TENANCY-20260809 — Slug del tenant: persistido y único en BD, no recalculado

## Contexto

[[TENANCY-20260804-slug-tres-implementaciones]] (descubierto en el PASO 0 del 2026-08-04, con evidencia reproducible en `seed_dev_data`: "Panadería La Esperanza") y [[riesgo-slug-por-nombre]] (2026-08-02) describen el mismo problema de fondo desde ángulos distintos:

- Hay **tres** implementaciones de "nombre → slug" que no coinciden: el backend (`apps/tenants/views.py:16-17`, borra tildes), el POS al cerrar turno (`slugify.ts`, translitera), y el alta de usuario en `UsersPage.tsx:31-33` (borra tildes, igual que el backend).
- El cajero de cualquier negocio con tilde o `ñ` cierra turno y aterriza en un slug que el backend no resuelve → **"Sucursal no encontrada"**. Reproducible hoy.
- `TenantBySlugView` (`views.py:22-46`) recalcula el slug de **todos** los tenants activos en cada request (O(n)) y devuelve el primer match — sin `unique`, dos nombres que colapsen al mismo slug se pisan, y [[auditoria-adversarial-20260805]] confirmó que el "ganador" ni siquiera es estable: un `UPDATE` de rutina (editar la ciudad) puede cambiarlo sin tocar el nombre.
- El slug **no se persiste en ningún lado** — se deriva del nombre en cada punto, con reglas distintas.

## Decisión

Owner: humano (jeronimobeta90), 2026-08-09.

**Se persiste un campo `slug` único e indexado en `Tenant`**, generado una sola vez (transliterando tildes: `"Café Bogotá"` → `cafe-bogota`) y estable de ahí en más — no se recalcula si `nombre` cambia. Colisión resuelta con sufijo numérico (`cafe-bogota-2`) en vez de silenciarse.

Esto resuelve **ambos** problemas de una vez: la divergencia de las tres implementaciones (todas pasan a leer el mismo valor, ninguna vuelve a calcular nada) y la colisión/inestabilidad del "ganador" (la unicidad la garantiza la BD, no el orden de un loop).

**Costo aceptado:** los `/login/{slug}` ya entregados a negocios con tilde van a cambiar (el slug persistido usa la transliteración, no la versión "sin tildes" que tenían antes). Se acepta porque esos enlaces **ya estaban rotos** para el flujo de cierre de turno — no hay compatibilidad real que preservar.

## Estado
Aceptado. Implementación: [[PROMPT-FIX-TENANCY-20260809-slug-persistido]].

## Consecuencias
- **Positivas:** una sola fuente de verdad; cero recálculo; colisión resuelta en el momento de creación, no en cada request; lookup público pasa de O(n) a indexado.
- **Deuda:** migración de datos sobre tenants existentes (backfill determinístico por `created_at`); los enlaces de staff login que ya circulan para negocios con tilde dejan de servir hasta que se les entregue el nuevo (aceptado arriba).
- Reemplaza la recomendación "no aplicar aquí" de [[riesgo-slug-por-nombre]] — ahora sí se aplica.

## Tareas derivadas
- [[PROMPT-FIX-TENANCY-20260809-slug-persistido]] — implementación end-to-end (modelo + migración + endpoint público + claim de login + consumo en front).

## Enlaces
[[TENANCY-20260804-slug-tres-implementaciones]] · [[riesgo-slug-por-nombre]] · [[auditoria-adversarial-20260805]] · `apps/tenants/models.py:6-23` · `apps/tenants/views.py:16-46`
