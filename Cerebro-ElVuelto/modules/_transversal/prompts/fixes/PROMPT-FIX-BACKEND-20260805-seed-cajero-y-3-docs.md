---
tags: [prompt, backend, users, docs, seed, fix]
status: 🔴
module: _transversal
updated: 2026-08-05
---

# Prompt DEV — Arreglar el cajero del seed y las 3 últimas frases falsas

**Tareas backlog:** [[BACKEND-20260805-seed-cajero-sin-cedula]] + cierre de [[DOCS-20260802-corregir-claudemd-drift]]
**Alcance:** un comando de management + 3 renglones de doc. Chico y acotado. No git. No tocar el front.

> [!info] Por qué existe este prompt
> El prompt anterior ([[RUN-20260805-usercreate-tenant-y-docs]]) pasó ✅, pero **el Planner omitió 3 renglones** de la lista de [[DOCS-20260802-corregir-claudemd-drift]]. Esto los cierra. No es un fix de nada que hayas hecho mal.

---

## Parte A — El cajero sembrado no puede entrar al POS

`apps/users/management/commands/seed_dev_data.py:65-77` crea el cajero así:

```python
cajero_user, created = User.objects.get_or_create(
    correo="maria@laesperanza.com",
    defaults={"nombre": "María López", "tenant": tenant, "rol": UserRole.CAJERO, "activo": True},
)
if created:
    cajero_user.set_password("cajero123")
```

**Sin `cedula`.** Pero el login del POS la exige (`CashierLoginSerializer` pide `cedula` + `tenant_id`; `StaffLoginPage.tsx` solo manda cédula + PIN) ⇒ **el cajero de prueba no puede iniciar sesión por la UI**.

Peor: desde el sprint de users la regla dura es **CAJERO ⇒ `cedula` obligatoria** (`UserCreateSerializer.validate`). El seed escribe por el manager del modelo y **se salta la validación**, o sea siembra data que la propia API rechazaría con un 400.

**Qué hacer:**
1. Asignarle una `cedula` (respetá el `unique(tenant, cedula)`).
2. El password del cajero debe ser un **PIN de 4 dígitos** — hoy es `"cajero123"` (9 chars), incoherente con `password_policy.PIN_LENGTH`. Usá la constante, no un literal suelto.
3. Que el seed siga siendo **idempotente**: correrlo dos veces no debe duplicar ni reventar.
4. Revisá de paso los otros usuarios sembrados: el admin necesita `correo` (lo tiene) y su password `admin123` son 8 chars contra los 12 de `ADMIN_PASSWORD_LENGTH`. **Decidí** si lo alineás o lo dejás a propósito (es data de dev, no de producción) y **decilo en el reporte** — no lo cambies en silencio.

## Parte B — Los 3 renglones que faltan

| # | Archivo | Dice | La verdad (verificada 2026-08-05) |
|---|---|---|---|
| 1 | `el_vuelto_frontend/CLAUDE.md:13` | `npm run commit` en el bloque de comandos del frontend | `el_vuelto_frontend/package.json` **no tiene** ese script — solo `dev`, `build`, `preview`, `typecheck`. `"commit": "cz"` vive **únicamente** en el `package.json` **raíz**. Corrido desde `el_vuelto_frontend/` falla. Aclará que se corre **desde la raíz del repo** |
| 2 | `el_vuelto_backend/CLAUDE.md:503` | `\| Cashier \| cedula=12345678 / cajero123 \|` | Credencial inventada. Poné la **real** tras tu Parte A — y agregá el **slug del tenant** de prueba, que es lo que `/login/{slug}` necesita para que alguien pueda entrar de verdad |
| 3 | `el_vuelto_backend/CLAUDE.md:356` | `ventas-por-hora → [{hora: 0-23, total: float, transacciones: int}, ...]` | Falta **`top_productos`**, que el código sí devuelve (`apps/reports/views.py:104-111`). Documentá también qué trae cada elemento de esa lista |

✅ **No toques el `CLAUDE.md` raíz.** Su bloque de comandos sí es correcto: se corre desde la raíz.

## Restricciones
- Solo `apps/users/management/commands/seed_dev_data.py` + los dos `CLAUDE.md` de subcarpeta. **Nada de front, nada de serializers, nada de vistas.**
- Sin migraciones.
- No rompas nada de lo entregado estos días (invariante del correo, política de password, guards de tenancy, params, los 4 fixes de 400 del front).

## Entregable / verificación
1. `python manage.py makemigrations --check --dry-run` → sin cambios.
2. **Corré el seed de verdad** y pegá su salida:
   - `python manage.py seed_dev_data` (1ª vez)
   - `python manage.py seed_dev_data` (2ª vez → debe decir "already exists", sin errores: prueba de idempotencia)
3. Pegá la verificación de que el cajero **ahora sí puede entrar**: un `POST /api/auth/login/cashier/` con la cédula, el PIN y el `tenant_id` del tenant sembrado → **200** con tokens. (Si preferís `manage.py shell`, pegá la salida igual.)
4. Pegá el `grep` que demuestre que cada una de las 3 frases viejas ya no está.
5. Decí qué decidiste sobre el password del admin sembrado.
6. Veredicto ✅ / 🔴.

> [!warning] Si algo no cuadra
> Pará y reportá con `archivo:línea`. Las anclas son del 2026-08-05, pero el código manda.
