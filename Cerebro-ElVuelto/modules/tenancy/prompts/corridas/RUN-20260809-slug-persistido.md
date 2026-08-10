---
tags: [corrida, tenancy, users, front, seguridad]
status: 🟢 corrido-ok
module: tenancy
updated: 2026-08-09
---

# RUN 2026-08-09 — Slug del tenant persistido, end-to-end

**Prompt:** [[PROMPT-FIX-TENANCY-20260809-slug-persistido]]
**Tarea:** [[TENANCY-20260804-slug-tres-implementaciones]] (P-1) + colisión de slug de [[auditoria-adversarial-20260805]]
**Decisión:** [[ADR-TENANCY-20260809-slug-persistido]]
**Veredicto:** ✅ **PASÓ** — verificado con ejecución real en el backend (Django shell, rollback) + workflow de 7 agentes (typecheck+build+migrations-check, búsqueda adversarial de regresiones en todo el repo, trazado crítico de la lógica de colisión/migración, refutación de hallazgos).

## Qué se entregó
- `apps/tenants/slugs.py` (nuevo) — `base_slug()`/`unique_slug()`, transliteración NFD, dependency-free a propósito (para poder inlinearse en la migración).
- `Tenant.slug` (modelo) — `unique=True, editable=False`, generado una sola vez en `save()` cuando está vacío; **nunca se regenera** ante un rename (con manejo correcto de `update_fields`).
- Migración `0004_tenant_slug.py` — `AddField` sin unique → `RunPython` backfill (ordenado por `created_at`, sufijo en colisión) → `AlterField` con `unique=True`. Ya aplicada.
- `TenantBySlugView.get` — de O(n) escaneando en Python a `filter(slug=slug, activo=True).first()` indexado. `_nombre_to_slug` borrada.
- `apps/users/serializers.py` — extraído `_user_payload(user)`, que unifica lo que **eran 3 copias** del dict `user` de login (las 2 ramas de `CustomTokenObtainPairSerializer.validate` **y** `CashierLoginSerializer.validate`, esta última no estaba en el prompt original — el Dev la encontró leyendo el código y la corrigió también). Las 3 ahora incluyen `tenant_slug`.
- Frontend: `AuthUser.tenantSlug`, mapeado en las 2 mutations de login; `PosPage.tsx` (Cerrar Turno) y `UsersPage.tsx` (link de staff) leen `tenantSlug` de Redux en vez de recalcular. `slugify.ts` y el `toSlug` local quedaron sin consumidores (el archivo ya no existe en el working tree).
- `TenantSerializer` expone `slug` de solo lectura (extra, no pedido, sin riesgo).
- Doble actualización: `el_vuelto_backend/CLAUDE.md` (Models + Auth) y `el_vuelto_frontend/CLAUDE.md` (`AuthUser`, `features/tenants/`) — ambos verificados contra el código real, exactos.

## 👏 El hallazgo que el Dev corrigió sin que se lo pidiera
Mi prompt solo mencionaba 2 copias del dict `user` (las de `CustomTokenObtainPairSerializer`). El Dev encontró una **tercera** en `CashierLoginSerializer.validate` — que es, literalmente, el endpoint que el POS usa de verdad (`/auth/login/cashier/`). Si se hubiera seguido el prompt al pie de la letra, el fix habría quedado **incompleto exactamente donde más importaba**: un cajero real, en un negocio real con tilde, habría seguido sin `tenant_slug`. Encontrarlo y resolverlo con un helper compartido (`_user_payload`) en vez de parchar las 3 copias por separado es la respuesta correcta.

## Verificación ejecutada (por el Planner, backend, con rollback)
```
seed "Panadería La Esperanza"           → slug: panaderia-la-esperanza (backfill OK)
crear "Café Bogotá"                     → slug: cafe-bogota
crear otro "Café Bogotá" (colisión)     → slug: cafe-bogota-2
renombrar el primero a "...Centro"      → slug SIGUE siendo cafe-bogota (inmutable)
check-by-slug con el slug original      → resuelve el tenant correcto
CashierLoginSerializer (endpoint real)  → tenant_slug: cafe-bogota en la respuesta
makemigrations --check --dry-run        → "No changes detected"
```

## Verificación del workflow (7 agentes)
- `npm run typecheck` / `npm run build` → limpios. `makemigrations --check` → limpio.
- Búsqueda adversarial (5 puntos: otros dicts de login sin `tenant_slug`, referencias muertas a `slugify`/`toSlug`/`_nombre_to_slug`, consumidores de `AuthUser` que pudieran romperse, routing del endpoint público, edge cases de la migración) → **0 hallazgos reales**.
- Trazado crítico de `unique_slug()` y la migración → el algoritmo de colisión está probado correcto (termina, respeta `SLUG_MAX_LENGTH`). 2 hallazgos menores crudos, 1 refutado (empate de `created_at` en el backfill — técnicamente cierto pero sin ningún path de `bulk_create` real en el código hoy, refutado por ambos revisores), **1 confirmado** (ver abajo).

## Hallazgo confirmado (menor, no bloqueante) → al backlog
**TOCTOU en `Tenant.save()`:** el chequeo `is_taken` es un `SELECT ... EXISTS()` sin lock. Dos `POST /api/tenants/` concurrentes con el mismo `nombre` pueden generar el mismo slug candidato; el segundo `INSERT` choca con el `unique=True` y sale como **500** (DRF no mapea `IntegrityError`) en vez de un 400 limpio. Sin corrupción de datos, sin fuga cross-tenant, endpoint `IsSuperAdmin` de bajísima frecuencia. Por [[CRITERIO-CIERRE-ESTABILIZACION]] (regla anti-scope-creep: solo bloquea si es 🔒 alta con impacto en dinero/acceso/datos — este no lo es), va al backlog sin bloquear la señal: [[TENANCY-20260809-race-slug-integrity-error]].

## Checklist de trampas
**#1 tenancy**: `TenantBySlugView` sigue `AllowAny` (correcto, es público por diseño) pero ahora indexado y sin el "ganador inestable" que encontró la auditoría. **#3 tags RTK**: no aplica. **#9 migraciones**: `makemigrations --check` limpio antes y después; migración aplicada y backfill verificado sobre datos reales del seed. **#10 doble actualización**: ✅ ambos CLAUDE.md. **#11**: sin git, sin scope creep — el único "extra" (slug de solo lectura en `TenantSerializer`) estaba explícitamente ofrecido como opcional en el prompt.

## Cierra
[[TENANCY-20260804-slug-tres-implementaciones]] → 🟢. La condición 1 de [[CRITERIO-CIERRE-ESTABILIZACION]] queda con **un solo** pendiente: la revocación de sesiones.
