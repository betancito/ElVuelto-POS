---
tags: [corrida, auth, seguridad, backend]
status: 🟢 corrido-ok
module: auth
updated: 2026-08-05
---

# 🔒 RUN 2026-08-05 — Throttling en los endpoints de autenticación

**Prompt:** [[PROMPT-FIX-AUTH-20260805-throttling-login]] · **Tarea:** [[AUTH-20260805-sin-throttling-en-login]]
**Veredicto:** ✅ PASÓ — **9/9** (6 del criterio + 3 pruebas de evasión mías), verificado ejecutando.

## Diff entregado
Nuevo: `apps/users/throttles.py`. Modificados: `settings/base.py`, `apps/users/{views,urls}.py`, `apps/tenants/views.py`. **Sin dependencias nuevas**, sin migraciones, front intacto.

## El diseño: dos capas
- **Por identidad** (`correo` + `cedula` + `tenant_id` del body), ajustado: `10/min` y **`50/day`**. Es la credencial que está bajo ataque, y keyear por ahí evita que un compañero con dedos torpes bloquee a todo el local — que es justo lo que haría un límite puro por IP detrás de la NAT compartida de un negocio.
- **Por IP**, techo generoso (`60/min`): sin esto, el límite por identidad dejaría a un atacante rotar identidades desde la misma máquina sin chocar nunca contra nada.

El `50/day` es el que mata la fuerza bruta: 10.000 PINs / 50 por día ≈ **200 días** en vez de 18 minutos.

Tres decisiones que resolvió bien y que yo había dejado abiertas:
1. **Scope de identidad compartido** entre `/auth/login/` y `/auth/login/cashier/` — porque la rama de cédula existe en ambos, y contadores separados serían "cambiá de endpoint y duplicá tu presupuesto".
2. **`ScopedRateThrottle` no servía** (lee un solo `throttle_scope` de la vista, así que no se puede combinar con un segundo throttle en el mismo endpoint) → escribió `SimpleRateThrottle` propios. Razonamiento correcto.
3. **`CACHES` explícito** con Redis **opcional** por `REDIS_URL`, y `redis` deliberadamente **fuera** de `requirements.txt` para que la app corra sin él. Exactamente lo que pedí: no volver Redis obligatorio sin avisar.

## Verificación (9/9)

| # | Caso | Resultado |
|---|---|---|
| 1 | 13 intentos fallidos a `/login/cashier/` | **429 en el #11** |
| 2 | Ídem `/login/` | **429 en el #11** |
| 3 | 33 GET a `check-by-slug` | **429 en el #31** |
| 4 | Login correcto sin intentos previos | **200** |
| 5 | **POS: 40 `GET /products/pos/` + 40 `POST /sales/`** | **{200}** y **{201}** · **cero 429** |
| 6 | ADMIN: 40 `GET /reports/summary/` | **{200}** · cero 429 |

**Evasión (3/3, pruebas mías):**
| Vía | Resultado |
|---|---|
| Agotar en `/login/cashier/` y seguir con la misma cédula en `/login/` | **429** — el scope compartido funciona |
| Rotar 6 identidades distintas desde la misma IP | **429 en el intento #61** — el techo por IP corta el fan-out |
| 60 intentos contra una sola cédula | solo **10** pasaron — el burst corta antes de que el diario importe |

El caso 5 era el que más me importaba y está limpio: throttling **opt-in por vista**, sin `DEFAULT_THROTTLE_CLASSES` global.

## Doble actualización
`el_vuelto_backend/CLAUDE.md`: las clases, las tasas, el porqué de que sea opt-in, y el **gotcha del cache** — que con `LocMemCache` (el default) el conteo es **por proceso**, así que bajo gunicorn con N workers cada límite se multiplica por N, y que en producción hay que setear `REDIS_URL`.

## Residual
- 🟡 **En producción, sin `REDIS_URL`, los límites se multiplican por el número de workers.** Está documentado en el `CLAUDE.md` y en el propio `settings`, pero es una nota de despliegue que hay que ejecutar, no solo leer.
- 🟡 Sigue sin haber **revocación de sesiones**: aunque detectes el ataque, `reset_password` no saca a quien ya entró → [[BACKEND-20260805-sin-revocacion-de-sesiones]].
