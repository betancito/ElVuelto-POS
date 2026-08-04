---
tags: [gobernanza, meta]
status: activo
updated: 2026-08-02
---

# GOBERNANZA — La ley del vault

> [!warning] Léeme antes de escribir cualquier nota
> Este vault lo editan **varios agentes en ramas paralelas**. Cada regla de abajo existe para que dos ramas no choquen y para que ningún agente escriba una mentira. Si vas a crear o editar una nota, esta es la norma.

## 0. Permisos de los agentes (recordatorio duro)

- El **Planner (Agente A)** SOLO crea/edita dentro de `Cerebro-ElVuelto/` (+ `.gitattributes`/`.gitignore` del vault). **Nunca** toca código de la app ni los `CLAUDE.md`.
- El **Dev (Agente B)** toca código de la app pero **no edita el cerebro** (el planner registra su reporte).
- **Nadie** hace git de escritura (commit/branch/push/merge). El humano versiona a mano.
- Notas del cerebro en **español colombiano**; código, rutas, identificadores y nombres de archivo en **inglés**.

## 1. No inventar — código = verdad

- Toda afirmación técnica va anclada a `ruta/archivo.ext:línea`. Si no abriste el archivo, no lo documentas.
- Lo que no puedas confirmar leyendo código se marca `❓ POR CONFIRMAR` y entra en `preguntas-<mod>.md`.
- Los `CLAUDE.md` **no son fuente de verdad**: son hipótesis a verificar. Ya se detectaron mentiras (ver `_global/decisiones/`).
- El cerebro guarda **intención e historia**; toda "foto de estado" es referencial y se desfasa. Por eso existe el PASO 0 de re-sincronización.

## 2. Reglas anti-merge-conflict (obligatorias)

1. **Un hecho = un archivo.** Un ADR, un riesgo, un prompt, una tarea, un sprint, una sesión: archivo propio. Nada de monolitos que dos ramas editen a la vez.
2. **Índices delgados y append-only.** Un índice (`00-*.md`) es **una línea por ítem** que enlaza al archivo. Los ítems se **agregan al final** de su sección; nunca se reordenan ni reformatean. Un conflicto de índice se resuelve **quedándose con ambas líneas** (`merge=union`, ver `.gitattributes`).
3. **IDs con fecha, no contadores.** `ADR-SALES-20260802-<slug>`, `SALES-20260802-<slug>`. Dos ramas paralelas no chocan por un número.
4. **Propiedad por carpeta.** Una rama escribe en `modules/<su-mod>/` + su línea en los índices + su archivo de sesión. Lo que vea de otro módulo lo registra en `_conexiones/` o en `preguntas-` del otro módulo, siempre en **archivo nuevo**.
5. **Frontmatter estable.** No toques `updated` de una nota que no cambiaste. Nada de reformateos masivos de notas ajenas.

## 3. Convenciones de nota

- **Frontmatter obligatorio:** `tags`, `status`, `updated` (YYYY-MM-DD **absoluta**), y `module: <mod>` en notas de módulo.
- **Basenames únicos en todo el vault.** Por eso `estado-inventory.md`, jamás `estado.md`.
- **Enlaces `[[wikilink]]` generosos.** Un `[[nombre]]` que aún no existe es válido: marca algo por escribir.
- **Callouts:** `> [!warning]`, `> [!decision]`, `> [!todo]`, `> [!question]`, `> [!info]`.
- **Semáforo:** 🟢 hecho · 🟡 en proceso · 🔴 pendiente · ⏸️ pospuesto · ❓ por confirmar.
- **Fechas siempre absolutas.** Hoy = 2026-08-02.
- **Presupuesto de líneas:** nota > ~250 líneas → hay que partirla. `CLAUDE_*.md` propuestos < 400 líneas.

## 4. Regla dura de Obsidian

**Nada de contenido que solo exista renderizado.** Claude Code lee markdown crudo: la información canónica va en **texto plano** (tablas estáticas), no en Dataview/Bases. Obsidian es la UX del humano; el texto plano es el contrato del agente.

## 5. Definition of Done — doble actualización

Todo cambio futuro (del Dev) no está "hecho" hasta tener: **código + tests** (cuando haya framework) **+ el `CLAUDE_*.md` que corresponda + el cerebro** actualizados. El planner registra el reporte del dev; el dev no edita el cerebro.

## 6. Protocolo de preguntas

Se pregunta cuando: hay dos interpretaciones razonables · código muerto/duplicado sin dueño claro · una regla de negocio no se deduce del código · un TODO/HACK sin contexto · el nombre miente · parece bug pero podría ser intencional · no se sabe si algo es legacy o vigente.

Formato (siempre con hipótesis):

```
P-<N> [<módulo>] <pregunta concreta, una sola cosa>
   Evidencia: <archivo:línea> — <qué viste>
   Mi hipótesis: <lo que creo>
   Si no contestas: <qué asumiría y qué marcaría ❓>
   Impacto: alto | medio | bajo
```

Máximo ~7 por tanda, ordenadas por impacto. Toda pregunta vive en `preguntas-<mod>.md` (append-only) con su respuesta y fecha. Una respuesta que cambia el diseño ⇒ **ADR**, no una línea suelta.

## 7. Handoff de sesión

Al final de CADA sesión: `_sesiones/<fecha>-<agente>-<slug>.md` con qué se hizo, qué queda, preguntas abiertas y por dónde retomar en frío. **Archivo nuevo siempre; jamás se edita uno viejo.**

## 8. Autoverificación antes de cerrar una nota

¿Toda afirmación tiene respaldo en código que ABRÍ? ¿Marqué lo no verificado? ¿Cabe en el presupuesto de líneas? ¿Está enlazada desde su índice?

## 9. Prompts para el Dev y registro de corridas

Los prompts que el Planner entrega al Dev (Agente B) viven **dentro del módulo**, separados por tipo, con un registro de ejecución:

```
modules/<mod>/prompts/
  00-registro-<mod>.md      ← índice + log: cada prompt, tipo, tarea, estado y veredicto de corrida
  fixes/     PROMPT-FIX-<MOD>-<YYYYMMDD>-<slug>.md
  features/  PROMPT-FEAT-<MOD>-<YYYYMMDD>-<slug>.md
  corridas/  RUN-<YYYYMMDD>-<slug>.md   ← reporte del Dev cuando la corrida amerita detalle
```

Lo transversal (no pertenece a un módulo) va en `modules/_transversal/prompts/`.

- **Estados de un prompt:** 🔴 escrito (pendiente de correr) · 🟡 en curso · 🟢 corrido-ok · ⛔ corrido-falló.
- **Quién registra la corrida:** el **Planner** (el Dev no edita el cerebro). Al correr un prompt, el Planner actualiza la fila del `00-registro-<mod>` (estado, fecha, veredicto) y, si el reporte es extenso, crea `corridas/RUN-...`.
- Así el cerebro guarda el **historial completo de todo lo que se ha corrido**, por módulo.
