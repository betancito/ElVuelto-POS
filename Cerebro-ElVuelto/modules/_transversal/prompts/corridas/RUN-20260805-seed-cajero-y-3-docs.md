---
tags: [corrida, backend, seed, docs]
status: 🟢 corrido-ok
module: _transversal
updated: 2026-08-05
---

# RUN 2026-08-05 — Cajero del seed + las 3 últimas frases falsas

**Prompt:** [[PROMPT-FIX-BACKEND-20260805-seed-cajero-y-3-docs]]
**Tareas:** [[BACKEND-20260805-seed-cajero-sin-cedula]] + cierre de [[DOCS-20260802-corregir-claudemd-drift]]
**Veredicto:** ✅ PASÓ

> [!info] Verificación ejecutada por el Planner
> Corrí el seed **dos veces** vía `call_command` dentro de `transaction.atomic()` + `set_rollback(True)` (la BD de dev quedó intacta), probé el **login real del cajero** y resolví el **slug** del tenant sembrado. Todo verde.

## Diff entregado
`apps/users/management/commands/seed_dev_data.py` (21:19) + los dos `CLAUDE.md` de subcarpeta (21:20). **`CLAUDE.md` raíz sin tocar** (mtime 08-03). Ningún otro archivo.

## Parte A — el seed

| Verificación | Resultado |
|---|---|
| 1ª corrida | crea todo, `=== Done! ===` |
| 2ª corrida (idempotencia) | `already exists` en los 4, **sin errores** |
| Cajero sembrado | `cedula='12345678'`, `rol=CAJERO`, `check_password("1234")` → **True** |
| **Login real** `CashierLoginSerializer` con cédula + PIN + `tenant_id` | `is_valid()` → **True**, devuelve **access token** |

El PIN se deriva de `password_policy.PIN_LENGTH` (`"".join(str((i+1)%10) ...)`) en vez de un literal, así que sigue siendo válido si la política cambia de longitud. Detalle chico, criterio correcto.

**La decisión que le pedí reportar, la reportó en el código:** los ADMIN sembrados conservan `admin123` (8 chars) contra los 12 de `ADMIN_PASSWORD_LENGTH`, con un comentario que explica por qué es una excepción deliberada — es data de dev escrita por el manager, y ningún camino de login exige mínimo; la política gobierna lo que la **API** acepta al crear o cambiar una contraseña. Coincido: alinearla no aporta nada y complicaría el copiar-pegar del entorno.

### 👏 Un extra que no le pedí y es correcto
Agregó una rama de **backfill**: si el cajero ya existía sin `cedula` (filas sembradas antes de que la regla existiera), le asigna la cédula y el PIN en vez de dejar un cajero inutilizable — con chequeo de colisión previo por el `unique(tenant, cedula)` y un `WARNING` si la cédula ya está tomada. Y sigue siendo no-op al repetir, o sea la idempotencia se mantiene. Sin esto, cualquier BD de dev existente se quedaba rota.

## Parte B — los 3 renglones

| # | Cómo quedó |
|---|---|
| 1 | *"`npm run commit` is **NOT** a script of this package"* + explicación de que se corre desde la raíz, donde viven `"commit": "cz"` y los hooks de Husky |
| 2 | Credenciales reales (`cedula=12345678 / PIN 1234`) **+ el slug del tenant** (`panadera-la-esperanza`) **+** una advertencia *"Watch the slug"* explicando que la `í` de "Panadería" desaparece y que la grafía intuitiva devuelve `{"exists": false}` |
| 3 | `top_productos` documentado con su forma (`[{nombre, unidades}]`) y la nota de que siempre vienen 24 entradas |

El #2 va más allá de lo pedido: le pedí las credenciales reales y el slug, y además documentó la trampa de la tilde.

**Con esto [[DOCS-20260802-corregir-claudemd-drift]] queda cerrado de verdad.**

## 🔴 Hallazgo del review: el entorno de dev reproduce el bug del slug

Verificando el slug del tenant sembrado encontré que **"Panadería La Esperanza" es un caso vivo de [[TENANCY-20260804-slug-tres-implementaciones]]**:

| Quién | Resultado |
|---|---|
| Backend `_nombre_to_slug` (el que resuelve) | `panadera-la-esperanza` |
| Front `toSlug` — URL que copia el admin (`UsersPage`) | `panadera-la-esperanza` ✅ coincide |
| Front `slugify` — adonde redirige el POS al cerrar turno (`PosPage.tsx:319`) | **`panaderia-la-esperanza`** ❌ no resuelve |

O sea: en el entorno de dev por defecto, **un cajero que cierra turno aterriza en una URL que devuelve "Sucursal no encontrada"**. El ticket dejó de ser hipotético — se reproduce con `seed_dev_data` y sin tocar nada. Eso sube su urgencia y le da evidencia concreta a la **P-1** pendiente con el owner.

## Checklist de trampas
**#5 naming** ✅ · **#9 migraciones** ✅ no las necesita (no toca modelos) · **#10 doble actualización** ✅ es el objeto de la Parte B · **#11** ✅ sin git, sin front, raíz intacto, sin scope creep.
