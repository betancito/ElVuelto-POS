---
tags: [plantilla]
status: activo
updated: 2026-08-02
---

# Plantilla — Auditoría de formulario

Máximo detalle. Un bloque por formulario. Todo anclado a `archivo:línea` de **ambos lados** (front y back).

---

## <Nombre del formulario> — <pantalla>

- **Componente:** `features/<x>/<Page>.tsx:<línea>` · **Modo:** crear / editar / ambos
- **Schema Zod:** archivo:línea · ¿estático o construido en runtime? (¿de qué depende: rol, tenant, tipo?) · `zodResolver` · `mode`/`reValidateMode`. **Si NO hay Zod, dilo explícito** y documenta qué valida en su lugar (o si no valida nada).
- **`defaultValues`:** de dónde salen · ¿quién hace `reset()` al cargar datos, o queda stale?
- **Estructura dinámica:** `useFieldArray`, campos condicionales (`watch` de qué dispara qué), discriminated unions, wizards, campos que aparecen según rol (SUPERADMIN/ADMIN/CAJERO).
- **Submit:** handler → mutation RTK Query → endpoint. Transformaciones antes de enviar (decimales, fechas, `null` vs `""`, `FormData` para Cloudinary). Qué se hace con la respuesta (invalidación de tags, refetch, navegación, toast).
- **Errores del servidor:** ¿el 400 con errores por campo se mapea a `setError`? ¿o se pierde en un toast genérico? ¿dónde caen los `non_field_errors`?

### Matriz de paridad por campo

| campo | Zod (tipo/regla) | RHF (control, requerido) | tipo TS | serializer DRF | modelo Django | constraint BD | ⚠️ divergencia |
|---|---|---|---|---|---|---|---|
| ... | | | | | | | |

Caza explícitamente: requerido en Zod pero `blank=True` en Django (y viceversa) · `max_length` distintos · **precisión de dinero** (`number` de TS ↔ `DecimalField` ⚠️ crítico en POS) · `null` vs `undefined` vs `""` · fechas y zona horaria (`America/Bogota`) · `choices`/enums desincronizados · campos `read_only` que el form manda igual · campos que el back exige y el form no expone · validaciones duplicadas ya divergidas · unicidad validada solo en el back (⇒ tiene que haber manejo del 400).

## ⚠️ Divergencias detectadas
(priorizadas, con `archivo:línea` de AMBOS lados) — NO se arreglan aquí: se vuelven ítems de `planeacion/backlog/`.

## ❓ Por confirmar
...
