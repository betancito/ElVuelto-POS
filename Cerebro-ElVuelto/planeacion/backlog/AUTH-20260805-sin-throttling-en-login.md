---
tags: [tarea, auth, seguridad, backend]
status: 🟢
prioridad: alta
updated: 2026-08-05
---

> [!done] Cerrado 2026-08-05 — ✅ [[RUN-20260805-throttling-login]]
> Dos capas en `apps/users/throttles.py`: por **identidad** (10/min + **50/day**, scope compartido entre ambos logins) y techo por **IP** (60/min). El 50/day convierte los 10.000 PINs de ~18 minutos en ~200 días. Verificado 9/9, incluidas 3 vías de evasión (cambio de endpoint, fan-out de identidades, ráfaga contra una cédula). El POS no ve un solo 429.
> ⚠️ Nota de despliegue: sin `REDIS_URL`, `LocMemCache` cuenta **por proceso** y los límites se multiplican por el número de workers.

# 🔒 AUTH-20260805-sin-throttling-en-login — El PIN de 4 dígitos se agota en ~18 minutos

**Tipo:** seguridad · **Descubierto:** [[auditoria-adversarial-20260805]] · **Partes verificadas por el Planner**

## La cadena completa, sin ninguna credencial previa

1. **El endpoint público entrega el `tenant_id`.** `TenantBySlugView` (`apps/tenants/views.py:20-46`) es `AllowAny` con `authentication_classes = []` y devuelve `{"exists": true, "id": "<uuid del tenant>", ...}`. Verificado leyendo el código.
2. **La cédula no es secreta.** Va impresa en el documento y la conocen los compañeros de trabajo.
3. **El PIN son 4 dígitos** — 10.000 combinaciones (decisión deliberada del owner: pantalla táctil).
4. **No hay ningún límite de intentos.** Verificado: **cero** `DEFAULT_THROTTLE_CLASSES`/`DEFAULT_THROTTLE_RATES` en `settings/`, y ni `django-axes` ni `django-ratelimit` en `requirements.txt`.

El atacante midió **~9 req/s sin un solo 429**, y extrapoló el espacio completo de PINs en **~18 minutos con un solo hilo** (esa medición es suya, no la repetí).

## Por qué no alcanza con "no devolver el UUID"
El front **necesita** ese `tenant_id`: `StaffLoginPage` resuelve el tenant por slug y se lo manda a `/api/auth/login/cashier/`, que lo exige (por [[AUTH-20260802-exigir-tenant-id-login-cajero]], y con razón: la cédula solo es única por tenant). Quitarlo rompería el login. **El arreglo es limitar los intentos, no esconder el identificador.**

## Agravante
Aunque detectes el ataque, hoy no tenés cómo cortarlo: `reset_password` **no revoca la sesión** ([[BACKEND-20260805-sin-revocacion-de-sesiones]]). Una vez adentro, cambiarle el PIN al cajero no lo saca.

## Criterio de aceptación
1. Los endpoints de autenticación (`/api/auth/login/`, `/api/auth/login/cashier/`, `/api/auth/refresh/`) devuelven **429** tras un número razonable de intentos fallidos desde el mismo origen.
2. `TenantBySlugView` también tiene tope (es público, anónimo y hace un escaneo O(n) de la tabla por request).
3. Un cajero usando el POS normalmente **nunca** ve un 429.

## Notas para el Dev
- ⚠️ **El throttling de DRF necesita cache.** No hay `CACHES` configurado, así que Django usa `LocMemCache`, que es **por proceso**: con varios workers de gunicorn cada uno lleva su propia cuenta y el límite real se multiplica. Decidí y documentá (Redis sería lo correcto para producción; para dev LocMem alcanza).
- Throttlear **solo auth**, no la API entera: el POS es la pantalla que más requests hace.
- Ojo con el throttle por IP cuando varios cajeros comparten la NAT del local — un límite por `cedula+tenant` es más preciso que uno por IP.
- Doble actualización: `el_vuelto_backend/CLAUDE.md` (Authentication).
