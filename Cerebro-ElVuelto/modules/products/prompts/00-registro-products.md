---
tags: [registro, prompts, products]
status: activo
module: products
updated: 2026-09-13
---

# Registro de prompts y corridas — products

Log de los prompts entregados al Dev (Agente B) para este módulo. Append-only en la tabla; el Planner actualiza el estado al correr.

**Estados:** 🔴 escrito (pendiente) · 🟡 en curso · 🟢 corrido-ok · ⛔ corrido-falló.

| Prompt | Tipo | Tarea backlog | Estado | Corrida | Veredicto | Reporte |
|---|---|---|---|---|---|---|
| [[PROMPT-FIX-PRODUCTS-20260802-permisos-isadmin]] | fix 🔒 | [[PRODUCTS-20260802-viewsets-sin-permiso]] | ⛔ corrido-falló | 2026-08-02 | 🔴 rompía la lectura de categorías del cajero en el POS | [[RUN-20260802-permisos-isadmin]] |
| [[PROMPT-FIX-PRODUCTS-20260802-categorias-read-cajero]] | fix | [[PRODUCTS-20260802-viewsets-sin-permiso]] | 🟢 corrido-ok | 2026-08-02 | ✅ cajero lee categorías, escritura bloqueada | [[RUN-20260802-categorias-read-cajero]] |
| [[PROMPT-FIX-PRODUCTS-20260805-valores-negativos]] | fix 🔒 | [[PRODUCTS-20260805-valores-negativos-dinero-y-stock]] | 🟢 corrido-ok | 2026-08-05 | ✅ pasó 10/10 — `MinValueValidator` sin constraint + guard de stock con `select_for_update` | [[RUN-20260805-valores-negativos]] |

| _(sin prompt — Planner implementa)_ | fix 🔥 | [[PRODUCTS-20260913-listado-truncado-en-50]] | 🟢 corrido-ok | 2026-09-13 | ✅ pasó — **incidente de producción** con un cliente real: el catálogo del admin servía 50 de 83 (`PAGE_SIZE` global + el front ignora `next`), y como el orden es alfabético cada alta empujaba a otro fuera de la vista, así que parecía pérdida de datos. `pagination_class = None` en `ProductViewSet`/`CategoryViewSet`; frontend sin tocar. Verificado contra el stack real: lista plana en catálogo, ventas e inventario **siguen paginadas**, y prueba de volumen con 120 productos en transacción revertida → 125/125 (antes 50). `makemigrations --check` y `tsc` en 0. ⚠️ sin revisión adversarial (anotado en el RUN); falta que el owner confirme 83 en pantalla tras el redespliegue | [[RUN-20260913-catalogo-sin-paginar]] |

## Cómo se registra una corrida
Cuando el Dev ejecuta el prompt, el **Planner** actualiza la fila (Estado, Corrida=fecha, Veredicto ✅/🔴) y, si el reporte es extenso, lo guarda en `corridas/RUN-<fecha>-<slug>.md`. El Dev no edita el cerebro.
