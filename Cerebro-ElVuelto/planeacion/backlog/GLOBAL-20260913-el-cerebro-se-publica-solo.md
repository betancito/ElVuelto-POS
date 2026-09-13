---
tags: [tarea, gobernanza, seguridad, meta, cerebro]
status: 🔴
prioridad: media
updated: 2026-09-13
---

# GLOBAL-20260913-el-cerebro-se-publica-solo — el vault vive dentro de un repo público, y nadie lo decidió

> [!warning] Decisión de exposición que nunca se tomó
> `Cerebro-ElVuelto/` **es** parte del repo, y el repo es **público**
> (`api.github.com/repos/betancito/ElVuelto-POS` → `"private": false`). Todo lo que el Planner escribe
> —backlog, riesgos, auditorías adversariales, preguntas abiertas— se publica en internet con el
> siguiente commit. El cerebro no registra esto en ninguna parte, ni siquiera en [[GOBERNANZA]].

## Los números
| medida | valor |
|---|---|
| `git ls-files Cerebro-ElVuelto \| wc -l` | **305** |
| `git ls-files \| wc -l` | **605** |
| el vault sobre el repo | **50,4 %** |
| archivos del vault que son riesgo o backlog | **105** |

O sea: la mitad del repositorio público de un SaaS con producción viva es su registro interno de
defectos.

## Por qué NO es crítico hoy
No hay que inflarlo. Los dos riesgos de seguridad más graves del vault se verificaron contra el código
en este mismo PASO 0 y **están cerrados**, así que hoy esto no es un mapa de ataque explotable contra
`https://elvuelto.online`. Ver [[BACKEND-20260813-docstring-tenancy-miente-aislamiento]] (el docstring
miente, pero el filtrado está: 0 vistas sin filtrar) y el cierre de `is_staff`.

## Por qué SÍ importa
El riesgo es **de futuro y de gobernanza**, no de hoy:
1. La próxima ficha que se escriba sobre un hueco **sin cerrar** —como
   [[AUTH-20260913-admin-django-sin-rate-limit]] o [[BACKEND-20260830-login-publico-500-tenant-id-no-uuid]],
   escritas hoy mismo— se publica sola, con anclas `archivo:línea` y pasos de reproducción.
2. Ya pasó una vez, en chiquito: las notas de este PASO 0 contienen la **IP pública de la VM**, que hoy
   **no está** en HEAD (`git grep -I '20.36.129.173' HEAD` → 0 resultados). Ver el agravante de
   [[INFRA-20260913-clave-ssh-de-la-vm-sin-ignorar]].
3. Y hay una nota que se anuncia a sí misma como `status: abierto` cuando sus dos hallazgos peores ya
   están cerrados — ver [[auditoria-adversarial-20260805]]. Publicar un informe de vulnerabilidades
   **vencido** es peor que publicar uno al día: exagera la superficie real.

## Las tres salidas (es decisión del owner, no del Planner)
| opción | costo | qué resuelve |
|---|---|---|
| **A. El repo pasa a privado** | un clic; se pierde el portafolio público | todo, de una |
| **B. El vault sale del repo de la app** (repo propio privado, o submódulo) | hay que mover 305 archivos y los `[[wikilinks]]` siguen funcionando igual | separa producto de proceso; el más limpio a largo plazo |
| **C. Se acepta explícitamente** | cero | nada — pero cambia cómo se escribe: toda ficha de hueco abierto se redacta sabiendo que es pública (sin pasos de reproducción, sin IPs, sin nombres de recursos) |

Cualquiera de las tres sirve. La que no sirve es la de hoy: **no haber elegido**, y escribir como si el
vault fuera privado mientras se publica.

## Criterio de aceptación
Existe un ADR que registra cuál de las tres se eligió y por qué. Si es la **C**, [[GOBERNANZA]] gana una
regla explícita sobre cómo se redacta una ficha de hueco abierto.

## Enlaces
[[GOBERNANZA]] · [[INFRA-20260913-clave-ssh-de-la-vm-sin-ignorar]] ·
[[AUTH-20260913-admin-django-sin-rate-limit]] · [[auditoria-adversarial-20260805]] ·
[[2026-09-13-planner-paso0-resync]]
