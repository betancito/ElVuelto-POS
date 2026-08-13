---
tags: [tarea, backend, seguridad, config]
status: 🔴
prioridad: alta
updated: 2026-08-11
---

# BACKEND-20260811-manage-py-settings-fallback-inseguro — `manage.py` cae a settings de dev si falta la env var

**Tipo:** robustez/seguridad · **Encontrado en:** review adversarial de
[[ADR-G-20260811-docs-swagger-key-gate]] (lente config-drift, workflow), no verificado con un deploy
real — análisis estático de `manage.py`/`wsgi.py` confirmado leyendo ambos archivos.

## El problema
`el_vuelto_backend/manage.py:8` hace `os.environ.setdefault("DJANGO_SETTINGS_MODULE",
"elvuelto.settings.local")`, mientras que `wsgi.py:5` (el entrypoint real de gunicorn en producción)
cae a `elvuelto.settings.production`. `setdefault` solo actúa cuando la variable no está en el entorno
del proceso — el `.env` es un lookup aparte que nunca toca esta variable de entorno del SO. No hay
`Dockerfile`/`Procfile`/config de CI en el repo que fije `DJANGO_SETTINGS_MODULE` explícitamente. Un
`python manage.py migrate` / `create_superadmin` / `shell` corrido en cualquier script de deploy u
operador que no exportó la variable primero, corre bajo `settings/local.py`: `DEBUG=True`,
`ALLOWED_HOSTS=["*"]` — tracebacks completos, SQL, variables locales expuestas a quien vea la salida
de ese comando. Es además la precondición que habilita el trade-off de fuga de `DOCS_API_KEY`
documentado en el ADR de arriba (esa fuga solo aplica con `DEBUG=True`).

## Por qué no se arregló junto con la feature de docs
Es preexistente (no lo tocó ese cambio) y su alcance es todo el proceso de deploy, no una sola
feature — corregirlo bien implica decidir si `manage.py` debe fallar duro (`raise` si falta la env
var) en vez de caer a `local`, y agregar la pieza de infraestructura (Dockerfile/Procfile/CI) que hoy
no existe en el repo.

## Criterio de aceptación
Correr cualquier comando de `manage.py` sin `DJANGO_SETTINGS_MODULE` exportado falla de forma
explícita (o cae a `production`, nunca a `local`) — nunca corre en silencio con `DEBUG=True` fuera de
una máquina de desarrollo real.

## Notas para el Dev (para cuando se tome, no ahora)
- Vía directa: `os.environ.setdefault(..., "elvuelto.settings.production")` en `manage.py` (simétrico
  con `wsgi.py`), o quitar el default y dejar que Django reviente si la variable no está.
- Requiere también decidir dónde vive la pieza de infraestructura (Dockerfile/Procfile/CI) que hoy no
  existe en el repo — pregunta para el owner, no solo un cambio de una línea.
