# syntax=docker/dockerfile:1

# ═════════════════════════════════════════════════════════════════════════════
# ElVuelto — backend (Django 5.1 / DRF, WSGI)
#
# Build context is ./el_vuelto_backend (see docker-compose.yml).
# Python 3.12 matches the local .venv (3.12.14) on purpose — do not bump it here
# without checking requirements.txt first.
# ═════════════════════════════════════════════════════════════════════════════

# ── base ─────────────────────────────────────────────────────────────────────
FROM python:3.12-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# libpq5: runtime half of psycopg2. curl: used by the compose healthcheck.
RUN apt-get update \
 && apt-get install -y --no-install-recommends libpq5 curl \
 && rm -rf /var/lib/apt/lists/*

# ── builder ──────────────────────────────────────────────────────────────────
# Every pinned dependency ships a manylinux aarch64 wheel (psycopg2-binary
# 2.9.10 included), so nothing actually compiles on an M1. This stage exists so
# that the day a dependency DOES need gcc, the toolchain stays out of the
# runtime image instead of silently doubling it.
FROM base AS builder

RUN apt-get update \
 && apt-get install -y --no-install-recommends build-essential libpq-dev \
 && rm -rf /var/lib/apt/lists/*

# Manifest first: this layer is the slow one and must stay cached until
# requirements.txt itself changes.
COPY requirements.txt ./
RUN python -m venv /opt/venv \
 && /opt/venv/bin/pip install --upgrade pip \
 && /opt/venv/bin/pip install -r requirements.txt

# ── dev ──────────────────────────────────────────────────────────────────────
# No source is COPYd: docker-compose.dev.yml bind-mounts ./el_vuelto_backend
# over /app so edits to a .py file reload the dev server immediately.
FROM base AS dev

COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH" \
    DJANGO_SETTINGS_MODULE=elvuelto.settings.local

EXPOSE 8000

# 0.0.0.0 is mandatory. Bound to 127.0.0.1 the server is invisible from outside
# the container and nginx answers 502 for every /api/ request.
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]

# ── prod ─────────────────────────────────────────────────────────────────────
FROM base AS prod

COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH" \
    DJANGO_SETTINGS_MODULE=elvuelto.settings.production

RUN groupadd --system --gid 1001 elvuelto \
 && useradd --system --uid 1001 --gid elvuelto --create-home elvuelto

COPY --chown=elvuelto:elvuelto . .

# Written inline (heredoc) rather than COPYd: the build context is
# ./el_vuelto_backend, so a file under ../docker/ is unreachable from here.
COPY <<'ENTRYPOINT' /usr/local/bin/entrypoint.sh
#!/bin/sh
set -e

# Re-run on every boot, not just at build time. STATIC_ROOT is shadowed by a
# named volume at runtime, and Docker only seeds that volume from the image the
# FIRST time it is created — after an image rebuild the volume would keep
# serving yesterday's assets otherwise.
if [ "${RUN_COLLECTSTATIC:-1}" = "1" ]; then
    python manage.py collectstatic --noinput
fi

if [ "${RUN_MIGRATIONS:-0}" = "1" ]; then
    python manage.py migrate --noinput
fi

exec "$@"
ENTRYPOINT
RUN chmod 755 /usr/local/bin/entrypoint.sh

# staticfiles/ and media/ are created and chowned BEFORE dropping privileges,
# because a named volume inherits the ownership of the image directory it
# shadows. Left root-owned, the non-root process cannot write collectstatic
# output into the volume nginx reads.
RUN mkdir -p /app/staticfiles /app/media \
 && chown -R elvuelto:elvuelto /app

USER elvuelto

# collectstatic has to import the settings module, which requires a SECRET_KEY
# (it has no default, by design). This throwaway value exists only for the
# duration of this RUN; the real key arrives at runtime from the environment.
RUN DJANGO_SECRET_KEY=build-time-placeholder-not-a-secret \
    python manage.py collectstatic --noinput --clear

EXPOSE 8000

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["sh", "-c", "gunicorn elvuelto.wsgi:application --bind 0.0.0.0:8000 --workers ${GUNICORN_WORKERS:-3} --timeout ${GUNICORN_TIMEOUT:-60} --access-logfile - --error-logfile -"]
