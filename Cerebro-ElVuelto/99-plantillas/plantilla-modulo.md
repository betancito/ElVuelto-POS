---
tags: [plantilla]
status: activo
updated: 2026-08-02
---

# Plantilla — Notas de módulo

Un módulo tiene **5 notas canónicas** + subcarpetas (`decisiones/`, `riesgos/`, `prompts/`). Cada nota lleva frontmatter con `module: <mod>`. Basenames únicos: `estado-<mod>.md`, etc. Toda afirmación no obvia → `archivo:línea`.

---

## `estado-<mod>.md` — tablero corto (NO ensayo)

```markdown
---
tags: [modulo, estado]
status: vivo
module: <mod>
updated: 2026-08-02
---

# <Mod> — Estado

**Semáforo:** 🟡 documentado / 🔴 pendiente
**App back:** `apps/<x>` (LOC) · **Feature front:** `features/<x>` (LOC) · **Complejidad:** 🟡

## Punteros
- Código: [[mapa-<mod>]] · Endpoints: [[contratos-<mod>]] · Datos: [[datos-<mod>]] · Formularios: [[formularios-<mod>]]
- Preguntas abiertas: [[preguntas-<mod>]]
- Riesgos: enlaces a `riesgos/`
- Conexiones: `[[<mod>--<otro>]]`

## Qué es (3-5 líneas)
...

## Pendientes / drift doc↔código
- 🔴 ...
```

---

## `mapa-<mod>.md` — mapa de código (qué archivo hace qué)

Tabla: `archivo:línea | qué hace | notas`. Separa **Backend** y **Frontend**. Incluye modelos, serializers, views/viewsets, urls, permisos, slice, api RTK Query, páginas, componentes.

---

## `contratos-<mod>.md` — endpoints

Por cada endpoint: `método | ruta | vista (archivo:línea) | permiso | request (campos) | response (forma) | códigos de error`. Marca `AllowAny`, filtros de query param, y si filtra por tenant y dónde.

---

## `datos-<mod>.md` — modelos y BD

Por cada modelo: campos con tipo, `null/blank`, `choices`, `default`, `related_name`, `on_delete`; `UniqueConstraint`/`unique_together`, índices, `db_table`, `ordering`, migraciones clave que expliquen el estado actual. Dónde vive cada validación (`clean()`? serializer? BD? en ninguna parte?).

---

## `formularios-<mod>.md` — auditoría de formularios

Usa **[[plantilla-formulario]]**. Es la nota más detallada: matriz de paridad campo por campo.

---

## `preguntas-<mod>.md` — append-only

Formato del protocolo (GOBERNANZA §6). Cada P-N con hipótesis, respuesta y fecha. Nunca se reordena.
