---
tags: [tarea, tenancy, bug]
status: 🔴
prioridad: baja
updated: 2026-08-09
---

# TENANCY-20260809-race-slug-integrity-error — Crear dos tenants con el mismo nombre a la vez puede dar 500 en vez de 400

**Tipo:** robustez · **Encontrado en:** review adversarial de [[PROMPT-FIX-TENANCY-20260809-slug-persistido]] (workflow, confirmado por 2 refutadores independientes) · **No verificado con ejecución real** (es una condición de carrera; se aceptó el análisis estático + trazado de código)

## El problema
`Tenant.save()` (`apps/tenants/models.py`) genera el `slug` con `unique_slug(nombre, is_taken)`, donde `is_taken` es un `SELECT ... EXISTS()` sin `select_for_update()` ni lock alguno. Dos `POST /api/tenants/` concurrentes con el mismo `nombre` pueden ambos calcular el mismo slug candidato antes de que ninguno haga commit (MVCC de Postgres), y el segundo `INSERT` choca contra el `unique=True` de la columna. `TenantCreateSerializer.create()` no atrapa `IntegrityError`, así que sale del `transaction.atomic()` sin capturar — el rollback es limpio (no queda tenant/admin huérfano) pero DRF no mapea `IntegrityError` a 400, así que el request termina en un **500** sin explicación en vez de un 400 legible.

## Por qué es baja prioridad
- Sin corrupción de datos, sin fuga cross-tenant — el `unique=True` hace su trabajo, solo que el error que produce no es amigable.
- El endpoint es `IsSuperAdmin`, de altísima fricción y bajísima frecuencia (dar de alta un negocio nuevo no es una operación que ocurra en paralelo en la práctica).
- Ya existe la misma clase de carrera en `admin_correo` en el mismo serializer (según el propio análisis del reviewer) — no es un patrón nuevo introducido por este cambio, es consistente con la tolerancia a riesgo ya aceptada en este endpoint.

## Criterio de aceptación
`POST /api/tenants/` que colisiona con un `slug` recién generado por una request concurrente responde **400** con un mensaje de campo, no 500.

## Notas para el Dev (para cuando se tome, no ahora)
- Vía directa: atrapar `IntegrityError` en `TenantCreateSerializer.create()` (o en la vista) y traducirlo a `serializers.ValidationError`. Cuidado con distinguir cuál constraint fue la que falló (`nit`, `correo`, `slug`) si el mensaje debe ser específico por campo.
- Alternativa: `select_for_update()` no aplica aquí (la fila del "otro" tenant todavía no existe al momento del chequeo) — un advisory lock por `slug` candidato sería la vía para prevenirlo en vez de solo traducir el error.
- Este ítem es **media/baja a propósito** — no bloquea la señal de cierre de estabilización ([[CRITERIO-CIERRE-ESTABILIZACION]]).
