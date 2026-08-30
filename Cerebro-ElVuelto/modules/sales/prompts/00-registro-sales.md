---
tags: [registro, prompts, sales]
status: activo
module: sales
updated: 2026-08-30
---

# Registro de prompts y corridas — sales

Log de los prompts entregados al Dev (Agente B) para este módulo. Append-only en la tabla; el Planner actualiza el estado al correr.

**Estados:** 🔴 escrito (pendiente) · 🟡 en curso · 🟢 corrido-ok · ⛔ corrido-falló.

| Prompt | Tipo | Tarea backlog | Estado | Corrida | Veredicto | Reporte |
|---|---|---|---|---|---|---|
| [[PROMPT-FIX-SALES-20260803-guard-monto-recibido]] | fix 💰 | [[SALES-20260802-guard-monto-recibido]] | 🟢 corrido-ok | 2026-08-03 | ✅ 400 si `monto_recibido < total`; NEQUI intacto; verificado en shell | [[RUN-20260803-guard-monto-recibido]] |
| [[PROMPT-FIX-SALES-20260804-items-duplicados-sobreventa]] | fix 📦 | [[SALES-20260804-items-duplicados-sobreventa]] | 🟢 corrido-ok | 2026-08-04 | ✅ pasó (12/12, verificado por el Planner); agrega por producto antes de validar; no consolida líneas (decisión documentada) | [[RUN-20260804-items-duplicados-sobreventa]] |
| _(sin prompt — Planner implementa)_ | feature 💰📦 | [[SALES-20260816-stock-negativo-permitido]] | 🟢 corrido-ok | 2026-08-16 | ✅ pasó — pedido directo con modo plan; **cambio de regla de negocio en dinero/stock**. 14/14 casos contra servidor real (venta en negativo, la trampa de la entrada parcial, agregación por líneas duplicadas, guard de dinero, desborde del total 500→400, y el *lost update* del PATCH reproducido); migración única + `--check` limpio; typecheck/build en 0. **Dos** rondas adversariales (40 + 5 agentes) → 19 hallazgos reales y después **2 de mis 5 arreglos estaban mal** (el `read_only_fields` no cerraba el hueco y mi comentario afirmaba que sí; la justificación del tope de `cantidad` se apoyaba en una cuenta falsa) — todo corregido. ⚠️ falta confirmación visual del owner | [[RUN-20260816-stock-negativo-permitido]] |
| — (pedido directo, sin prompt) | feature/ux 🖨️ | [[POS-20260827-caja-1366x768-y-reposo]] | 🟢 corrido-ok | 2026-08-27 (cierre) · 2026-08-30 (re-verificado) | ✅ 5 tareas entregadas (POS en 1366×768, `.exe` fullscreen, modo reposo, recibo térmico y vaciado con confirmación). La corrida tomó **cuatro pasadas**: la madrugada se quedó sin tokens, la re-verificación de la mañana halló que **3 de 7 arreglos no cerraban**, la tercera pasada cerró 1 y 2, y la cuarta cerró el 3 contra la térmica real del dueño. El PASO 0 del 2026-08-30 verificó los tres contra `abee9d8` con árbol limpio: **están en el código** (`IdleScreensaver.tsx:58,221` · `pos.css:1984` · `main.js:143,175-182`). 🔴 **Pero el arreglo #1 dejó una regresión** → [[POS-20260830-tragador-reposo-puede-trabar-la-caja]]. ⚠️ nada verificado en pantalla (sin navegador) | [[RUN-20260827-caja-adulto-mayor-y-recibo]] |

## Cómo se registra una corrida
El **Planner** actualiza la fila al correr (Estado, Corrida, Veredicto) y guarda el reporte extenso en `corridas/RUN-<fecha>-<slug>.md`. El Dev no edita el cerebro.
