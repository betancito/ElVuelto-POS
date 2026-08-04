---
tags: [modulo, formularios]
status: vivo
module: reports
updated: 2026-08-02
---

# Reports — Formularios

## N.A. — este módulo NO tiene formularios

Reports es un módulo **de solo lectura / derivado**. No crea ni edita entidades: no hay `POST`/`PATCH`/`DELETE`, no hay modelos, no hay serializers de escritura, **no hay React Hook Form ni schemas Zod** en ninguna de sus páginas.

Lo único parecido a "entrada de usuario" son **filtros de fecha / selección de período** (no formularios):

- `ReportsPage.tsx:451-491` — estado local (`useState`) para `periodo` (`diario|semanal|mensual|personalizado`), fecha, semana, mes y rango custom. Se traduce a query params `fecha` / `fecha_inicio` / `fecha_fin` (`ReportsPage.tsx:469-474`) y se pasa a las queries RTK. **Sin validación de esquema**; los rangos se calculan con helpers puros (`weekToRange`, `monthToRange`, `DateRangeCalendar` con clamps min 2 / max 365 días en `ReportsPage.tsx:370-376`).
- `DashboardPage.tsx:82-85` — sin entrada: fija "hoy" (`todayBogota()`) automáticamente.

No hay matriz de paridad campo-por-campo que auditar aquí, porque no se envían campos de un modelo: solo parámetros de consulta. La forma exacta de cada request/response está en **[[contratos-reports]]**; el mapeo español↔inglés y snake↔camel de esos params/campos se documenta allí y en **[[datos-reports]]**.

### Nota de costura (para el próximo agente)
Si en el futuro se agrega un formulario a reports (p.ej. "programar reporte", "guardar filtro"), este archivo deja de ser N.A.: usar entonces `[[plantilla-formulario]]` y crear la matriz de paridad.
