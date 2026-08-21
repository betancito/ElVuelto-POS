---
tags: [tarea, backend, seguridad, config]
status: 🔴
prioridad: alta
updated: 2026-08-15
---

# BACKEND-20260811-manage-py-settings-fallback-inseguro — `manage.py` cae a settings de dev si falta la env var

**Tipo:** robustez/seguridad · **Encontrado en:** review adversarial de
[[ADR-G-20260811-docs-swagger-key-gate]] (lente config-drift, workflow) · **Reproducido en vivo el
2026-08-15** (ya no es análisis estático).

> [!info] Re-verificado en el PASO 0 del 2026-08-15
> - **Reproducido en proceso:** con `env -u DJANGO_SETTINGS_MODULE`, tras leer el `.env` la variable
>   sigue ausente de `os.environ`, el `setdefault` de `manage.py:8` la fija en `elvuelto.settings.local`
>   y Django arranca con `DEBUG=True` y `ALLOWED_HOSTS=['*']`.
> - **Por qué el `.env` no salva:** `python-decouple 3.8` **solo lee** `os.environ`
>   (`decouple.py:86-87`), nunca lo escribe — grep de `os.environ[...] =` → cero. La línea
>   `DJANGO_SETTINGS_MODULE=elvuelto.settings.local` del `.env` es **inerte** frente al `setdefault`.
> - **`SECRET_KEY` NO difiere** entre `local` y `production`: sale de `base.py:7` y ningún módulo la
>   pisa. Caer a `local` no cambia la llave; lo que cambia es `DEBUG`, `ALLOWED_HOSTS` y el logging de
>   SQL (`local.py:22-25`).
> - **Trampa para el fix:** ni `.env` ni `.env.example` declaran la clave `ALLOWED_HOSTS`, así que la vía
>   sugerida abajo (caer a `production`) hoy arrancaría con `ALLOWED_HOSTS=[]` y rechazaría todo request.
>   Falla ruidoso, no silencioso, pero hay que agregar la clave en el mismo cambio.
> - **No existe `asgi.py`**: los únicos dos lugares del código que tocan la variable son `manage.py:8` y
>   `wsgi.py:5`. `manage.py` no se toca desde el commit `d0cad23` (2026-04-12).
> - **Corrección al texto de abajo:** el trade-off de fuga de `DOCS_API_KEY` que menciona el último
>   párrafo del problema **ya no existe** — la key dejó de viajar en la URL y
>   [[ADR-G-20260811-docs-swagger-key-gate]] lo dice explícito. Lo que sí queda con `DEBUG=True` es la
>   fuga por POST: ver [[BACKEND-20260815-docs-login-key-en-traceback-debug]].
> - Se mantiene en **alta**: el riesgo es latente sólo porque hoy no existe ningún deploy (cero
>   Dockerfile/Procfile/CI en el repo). El día que exista, es bloqueante.

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
