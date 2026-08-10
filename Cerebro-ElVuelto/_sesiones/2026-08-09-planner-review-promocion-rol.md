---
tags: [sesion, planner]
status: activo
updated: 2026-08-09
---

# Sesión 2026-08-09 — planner — PASO 0 + review de la promoción de rol

Continuación de [[2026-08-05-planner-hardening-y-auditoria]]. Sesión corta: re-sincronización en frío + un review real.

## PASO 0
- Leí [[00-INDEX]] + [[GOBERNANZA]] + [[00-planeacion]] + [[CRITERIO-CIERRE-ESTABILIZACION]] + el handoff del 08-05.
- Contrasté `git log` contra el cerebro: el HEAD real (`ca5db4d`, 2026-08-03) y los commits previos de "mobile"/"tenant-db" (abril–mayo 2026) son trabajo de UI responsive de meses atrás, sin relación con la estabilización — no hay módulo mobile nuevo, descartado como preocupación.
- Confirmé que **todo sigue sin commitear** (33 archivos de app + el cerebro entero), consistente con lo que dice el último handoff.
- **Encontré el registro desfasado del disco otra vez** (la trampa que [[00-INDEX]] ya advierte): [[PROMPT-FIX-20260805-desactivar-de-punta-a-punta]] estaba con corrida y veredicto ✅ en [[00-registro-transversal]] aunque el handoff del 08-05 lo dejó como "en la mano del Dev" sin cerrar — el registro es la fuente correcta, no hacía falta re-revisarlo. Y [[PROMPT-FIX-USERS-20260805-promocion-no-rota-credencial]] figuraba 🔴 "escrito (pendiente)" en `00-registro-users.md` cuando el código ya estaba implementado (`mtime` de `serializers.py`: 2026-08-06 00:06).

## Review real de la promoción de rol
Verifiqué **ejecutando** (no solo leyendo) el escenario completo en `manage.py shell` contra la BD de dev, con `transaction.atomic()` + rollback — mismo método que las sesiones anteriores. Backend ✅: la promoción CAJERO→ADMIN rota la contraseña, la democión y los PATCH que no tocan `rol` no rotan nada, `makemigrations --check` limpio.

**Hallazgo nuevo:** el front (`UsersPage.tsx:onEditSubmit`) descarta el `new_password` que el backend ya devuelve — la cuenta promovida queda con una contraseña que nadie ve. Es 🔒 alta por impacto en **acceso** (regla anti-scope-creep de [[CRITERIO-CIERRE-ESTABILIZACION]]), así que se registra y se avisa en vez de dejarlo pasar.

## Qué se escribió en el cerebro
- [[RUN-20260806-promocion-no-rota-credencial]] — reporte del review con la verificación ejecutada.
- [[USERS-20260805-promocion-no-rota-credencial]] cerrada 🟢 (su criterio de aceptación sí se cumple).
- [[USERS-20260809-promocion-no-muestra-password-rotado]] — tarea nueva, 🔒 alta.
- [[PROMPT-FIX-USERS-20260809-mostrar-password-rotado-en-edicion]] — prompt listo para el Dev.
- Actualicé `00-registro-users.md`, `00-planeacion.md`, `estado-users.md`, [[CRITERIO-CIERRE-ESTABILIZACION]] y [[00-INDEX]].

## Estado del criterio de cierre
Condición 1 (cero alta abiertos) sigue 🔴 — ahora son **3**, no 2: los dos bloqueados por el owner más este nuevo, que **no** está bloqueado (tiene prompt listo). Condición 3 (prompt en curso) se resuelve con el nuevo prompt de arriba.

## Por dónde retomar en frío
1. `mtime` antes que código, siempre — el registro se desfasa seguido en este proyecto.
2. Correr y revisar [[PROMPT-FIX-USERS-20260809-mostrar-password-rotado-en-edicion]].
3. Con el owner siguen pendientes: P-1 slug con tildes y revocación de sesiones (sin novedad).
4. Sin decisiones nuevas del owner, lo siguiente por valor sigue siendo el triaje de los ❓ de [[auditoria-adversarial-20260805]] (condición 2 del cierre, ~10 pendientes) — no se auditó proactivamente nada más esta sesión, por la regla anti-scope-creep.
