---
tags: [tarea, feature, auth, frontend, tactil]
status: 🟢
prioridad: feature
updated: 2026-08-16
---

# AUTH-20260816-teclado-numerico-staff-login — teclado numérico en pantalla para el cajero

**Tipo:** feature · **Pedido:** directo del owner en el chat el 2026-08-16 ("como esta web app está
pensada para dispositivos táctiles (solo la pantalla de ventas o del cajero), en `/login/<tenant_name>`:
cuando hago clic en los fields que piden cédula y 4 dígitos, mostremos un teclado virtual en pantalla;
de igual manera los usuarios pueden usar teclado, y si usan teclado este va a desaparecer") ·
**Estado:** 🟢 implementada y verificada ·
**Decisión:** [[ADR-AUTH-20260816-teclado-numerico-staff-login]] ·
**Corrida:** [[RUN-20260816-teclado-numerico-staff-login]]

## Qué se entregó
Un keypad numérico propio en `/login/<tenantSlug>`, en panel fijo abajo, que se abre al **tocar**
cualquiera de los dos campos y se cierra en cuanto aparece un teclado físico. Tecla **"Siguiente"** para
saltar de la cédula al PIN (elección del owner). Los dos campos son numéricos, así que es un keypad, no
un QWERTY. Alcance: **solo esta ruta** — `/login` del tenant admin y el POS no se tocaron.

2 archivos nuevos + 3 modificados, todo frontend. Cero backend, cero dependencias.

## Estado de la verificación
✅ typecheck y build en 0 · ✅ login de cajero real (cédula + PIN + `tenant_id` → 200 `rol=CAJERO`) y los
tres caminos de rechazo, contra servidor real, con limpieza completa · ✅ **dos** rondas de revisión
adversarial (39 agentes) que encontraron 15 hallazgos reales y después **2 regresiones introducidas por
los propios arreglos**; todo corregido.

⚠️ **Pendiente:** el gesto táctil no se pudo ejecutar (sin navegador en el entorno; no se instaló nada).
Falta que el owner lo confirme a ojo.

## Cómo confirmarlo a ojo (30 segundos)
El Vite del owner ya tiene el cambio por HMR.
1. Abrir `/login/bambipan` (o el slug que exista).
2. **Tocar/clickear** el campo de identificación → debe subir el teclado desde abajo, y la tarjeta debe
   moverse para que nada quede tapado.
3. Marcar la cédula con las teclas → tocar **"Siguiente"** → el foco salta al PIN y la tecla desaparece.
4. Marcar 4 dígitos → debe entrar solo (auto-envío).
5. **Escribir con el teclado físico** en cualquier momento → el panel debe desaparecer.
6. Volver a tocar el campo → debe volver a aparecer (esto es lo que falló en la primera versión).
