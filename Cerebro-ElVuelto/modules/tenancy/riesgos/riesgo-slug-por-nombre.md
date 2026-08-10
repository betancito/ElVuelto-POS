---
tags: [modulo, riesgo]
status: resuelto
module: tenancy
severity: media
updated: 2026-08-09
---

# Riesgo — Slug del tenant: divergencia front/back, sin tildes, O(n)

**Ancla:** `el_vuelto_backend/apps/tenants/views.py:16-44` ↔ `el_vuelto_frontend/src/features/users/UsersPage.tsx:30-32`

## Tres problemas en la resolución por slug

### 1. Divergencia front ↔ back
- Back `_nombre_to_slug` (`views.py:17`): `re.sub("[^a-z0-9-]", "", nombre.lower().replace(" ", "-"))` — reemplaza **cada espacio literal** por `-`.
- Front `toSlug` (`UsersPage.tsx:30`): `s.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')` — colapsa **runs de whitespace** a un solo `-`.
- Con nombre "La  Esperanza" (doble espacio): front genera `la-esperanza`, back busca `la--esperanza` ⇒ el link de staff (`/login/{toSlug}`) construido por `UsersPage.tsx:66` **no matchea** ningún tenant en `check-by-slug` ⇒ login de staff imposible. También difieren con tabs/saltos de línea.

### 2. Tildes/ñ se pierden (no se transliteran)
Ambos hacen `[^a-z0-9-] → ""`. "Panadería" → "panadera", "Peña" → "pea". Dos negocios distintos pueden colisionar al mismo slug.

### 3. Colisión + O(n)
`TenantBySlugView.get` (`views.py:31`) itera **todos** los tenants activos y devuelve el **primer** match (`views.py:32`). Con slugs colisionados, el staff de un negocio podría ver el branding (nombre/logo) del otro. Además es O(n) por request (perf baja hoy, crece con nº de tenants).

## Impacto
Login de staff roto o cruzado para nombres con espacios múltiples, tildes o nombres que colapsan al mismo slug. El slug no se persiste: se recalcula en dos lugares con reglas distintas.

## Recomendación (no aplicar aquí)
Unificar una única función de slug (idealmente transliterando tildes, p.ej. `unidecode`/`slugify`), y considerar persistir un `slug` único indexado en `Tenant` en vez de recalcular y escanear. Ver [[preguntas-tenancy]] P-4. Toca también módulo [[users]] (front) — conexión `[[tenancy--users]]`.

> [!info] Resuelto 2026-08-09
> Implementado y verificado — ver [[ADR-TENANCY-20260809-slug-persistido]] y [[RUN-20260809-slug-persistido]]. `slug` ahora es una columna persistida, única, generada una vez; las tres implementaciones divergentes fueron reemplazadas por una sola fuente de verdad que todo el sistema lee.
