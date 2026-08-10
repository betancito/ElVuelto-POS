---
tags: [tarea, backend, users, dev-experience]
status: 🟢
prioridad: media
updated: 2026-08-05
---

> [!done] Cerrado 2026-08-05 — ✅ [[RUN-20260805-seed-cajero-y-3-docs]]
> El cajero sembrado tiene `cedula=12345678` y PIN `1234` (derivado de `password_policy.PIN_LENGTH`); **login real verificado** (`CashierLoginSerializer` → 200 con access token) y el seed sigue siendo idempotente. Extra del Dev: rama de **backfill** que repara filas sembradas antes de la regla. La decisión sobre `admin123` quedó documentada como excepción deliberada.
> ⚠️ Ojo: el tenant sembrado ("Panadería La Esperanza") **reproduce** [[TENANCY-20260804-slug-tres-implementaciones]].

# BACKEND-20260805-seed-cajero-sin-cedula — El cajero del seed no puede entrar al POS

**Tipo:** bug de entorno de desarrollo · **Descubierto:** review de [[RUN-20260805-usercreate-tenant-y-docs]]

## Problema
`seed_dev_data` crea el cajero de prueba con `correo="maria@laesperanza.com"` y **sin `cedula`** (`apps/users/management/commands/seed_dev_data.py:65-77`).

Pero el login del POS exige cédula:
- `CashierLoginSerializer` (`apps/users/serializers.py`) requiere `cedula` + `tenant_id`.
- `StaffLoginPage.tsx` solo manda cédula + PIN.

⇒ **El cajero sembrado no puede iniciar sesión por la UI del POS.** Cualquiera que siga el `CLAUDE.md` para levantar el entorno se topa con esto.

Y el `backend/CLAUDE.md:503` documenta `cedula=12345678 / cajero123`, una credencial que **no existe** — inventa una cédula que el seed nunca asigna.

## Problema de fondo: el seed se salta la validación
Desde [[USERS-20260802-zod-requeridos-por-rol]] y el fix de `UserCreateSerializer`, la regla dura es **CAJERO ⇒ `cedula` obligatoria**. El seed escribe por el manager del modelo (`User.objects.get_or_create`), así que **crea data que la propia API rechazaría con un 400**. El invariante que se blindó en tres capas tiene una puerta trasera en el seed.

## Criterio de aceptación
1. `python manage.py seed_dev_data` crea el cajero **con cédula**, y esa cédula permite entrar al POS por `/login/{slug}` con su PIN.
2. `backend/CLAUDE.md` documenta las credenciales **reales** (cédula, PIN y el slug del tenant de prueba, que es lo que la pantalla de staff necesita).
3. El seed sigue siendo idempotente (`get_or_create`): correrlo dos veces no duplica ni rompe.

## Notas para el Dev
- El PIN del cajero son 4 dígitos ([[reglas-password-divergentes]], `password_policy.PIN_LENGTH`). Si le ponés `cajero123` como password, es incoherente con la política — usá un PIN de 4 dígitos y documentalo.
- Ojo con el `unique(tenant, cedula)` al elegir el valor.
- Revisá de paso si los demás usuarios sembrados cumplen las reglas por rol (el admin necesita `correo`; su password `admin123` tiene 8 chars y la política de ADMIN pide 12 — el seed no la aplica porque no pasa por el serializer; decidí y documentá si se alinea o se deja como está a propósito).
- Doble actualización: `el_vuelto_backend/CLAUDE.md` (sección Dev Seed Data).
