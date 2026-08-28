# syntax=docker/dockerfile:1

# ═════════════════════════════════════════════════════════════════════════════
# ElVuelto — edge proxy image (PROD only)
#
# Dev runs plain nginx:alpine with the config bind-mounted, so routing can be
# tweaked and reloaded without a rebuild. Prod must not depend on bind mounts,
# so the config is baked in here instead.
#
# Build context is ./docker/nginx.
# ═════════════════════════════════════════════════════════════════════════════
FROM nginx:alpine

# Replaces the stock server block, which listens on :80 and serves the nginx
# welcome page. ElVuelto listens on :5173 and :8000 instead.
COPY prod.conf         /etc/nginx/conf.d/default.conf
COPY proxy_common.conf /etc/nginx/proxy_common.conf

EXPOSE 5173 8000
