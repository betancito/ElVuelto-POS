---
tags: [sesion, planner, feature, tenancy, superadmin]
status: activo
updated: 2026-08-12
---

# Sesión 2026-08-12 (2) — planner — Logo del tenant en los modales de crear/editar

Segunda sesión del mismo día. La anterior ([[2026-08-12-planner-logo-tenant-y-pedidos-directos]])
cerró porque el owner iba a reiniciar Claude Code.

## PASO 0 al abrir
Leí `00-INDEX` + `GOBERNANZA` (§10 incluida) + `estado-tenancy` + la última nota de sesión, y contrasté
contra `git log` y los archivos reales: HEAD seguía en `a15f6cc`, las 4 features post-estabilización
seguían sin commitear, y **sin drift** — el archivo de app más reciente (21:02) era anterior al cierre
de la sesión previa (21:13). Sin prompt en curso. Le pregunté al owner por dónde arrancar; eligió
"feature nueva".

## Qué se hizo
El owner primero confirmó que la subida de logo ya existía (se lo verifiqué contra el código, no de
memoria) y después pidió: **poder agregarlo y cambiarlo desde el modal de creación y actualización**.

1. **Investigación** — 2 agentes Explore en paralelo (front + back). Encontraron dos cosas que
   cambiaron el plan:
   - El control **ya vivió** en esos modales y se borró en `e6eaac6`; su CSS muerto seguía en el repo.
   - El `CLAUDE.md` del front y el ADR del 08-12 decían que estaba fuera **a propósito**. Se lo dije al
     owner antes de tocar nada — el pedido revierte una decisión existente, y eso se documenta, no se
     contradice en silencio.
2. **Dos preguntas al owner** (modo plan): subida inmediata o al guardar → **al guardar**; ¿incluir
   quitar el logo? → **sí** (eso agregó trabajo de backend que no existía).
3. **Plan aprobado** (`ExitPlanMode`) → implementación directa.
4. **Verificación real**: 15/15 casos contra servidor propio en :8001 con Cloudinary real (el server del
   owner en :8000 nunca se tocó). Ambiente devuelto como estaba (0 tenants, assets destruidos).
5. **Revisión adversarial**: workflow de 24 agentes, 4 lentes + refutador por hallazgo. 2 confirmados,
   18 refutados.

Detalle: [[ADR-TENANCY-20260812-logo-tenant-modales-crear-editar]] ·
[[RUN-20260812-logo-tenant-modales-crear-editar]].

## Lo más importante de la sesión: la revisión encontró un bug mío real
`destroy_image` prometía "never raises" y **no lo cumplía**. `except cloudinary.exceptions.Error` no
atrapa el `ValueError` que el SDK levanta cuando faltan credenciales (`sign_request` corre *antes* del
`try:` interno). Con un `.env` perdido —escenario que arranca la app normal, porque `settings/base.py`
usa `default=""`— el `DELETE` daba **500 y la fila del logo sobrevivía**: el logo quedaba imposible de
quitar. Lo reproduje yo antes de arreglarlo, y verifiqué el fix levantando un server con las
credenciales vacías (204 + fila borrada + warning en el log).

Y peor: **mi propio docstring y el `CLAUDE.md` que yo había escrito afirmaban como verificado que ese
`except` era total.** Era falso. Los dos corregidos, con el contraejemplo anotado.

**Lección para el cerebro:** la frase "verificado contra el paquete instalado" no vale si lo que se
verificó fue la jerarquía de excepciones y no *dónde empieza el `try`*. Leer el orden de las llamadas,
no solo el árbol de clases.

## Segundo aprendizaje: una prueba mal planteada no es un bug
La primera corrida dio 14/15. El caso que "falló" era mío: comprobé el borrado pidiendo la URL de
entrega del CDN, que seguía cacheada. El origen ya estaba borrado (`cloudinary.api.resource` →
`NotFound`). Regla que quedó en el `CLAUDE.md`: un borrado se comprueba contra la Admin API, nunca
contra la URL de entrega.

## Estado al cerrar
- 🟢 [[SUPERADMIN-20260812-logo-en-modales-crear-editar]] — cerrado, verificado, revisado.
- 🟡 Verificación visual en navegador — **sigue pendiente del humano**; no hay Chrome conectado en este
  entorno (arrastrado desde el 08-09). Lo que sí se comprobó: Vite transforma los 3 módulos nuevos sin
  error y el build de producción pasa.
- 5 ítems nuevos al backlog, ninguno tocado (fuera del alcance pedido). El que más pesa:
  [[FRONT-20260812-role-button-en-tr-rompe-tabla]] — deuda de a11y **real y confirmada**, que viene del
  trabajo del 08-09 y viaja sin commitear en el mismo working tree.
- Todo sigue **sin commitear**: esta feature + las 4 anteriores + el cerebro. El humano versiona a mano.

## Por dónde retomar en frío (PASO 0)
1. Leer `00-INDEX` + `GOBERNANZA` + `estado-tenancy` + esta nota.
2. Contrastar contra `git log`: al cierre el HEAD real seguía siendo `a15f6cc`, con **5** features
   post-estabilización en el working tree sin commitear.
3. No hay prompt en curso. Preguntarle al owner: (a) si quiere commitear lo acumulado —ya son 5
   features—, (b) si quiere que se arregle [[FRONT-20260812-role-button-en-tr-rompe-tabla]] antes de
   commitear, o (c) qué feature sigue.
