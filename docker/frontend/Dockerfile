# syntax=docker/dockerfile:1

# ═════════════════════════════════════════════════════════════════════════════
# ElVuelto — frontend (React 18 + Vite 5 + Tailwind 4)
#
# Build context is ./el_vuelto_frontend (see docker-compose.yml).
#
# Node 22, not 20: the repo pins no Node version (no `engines`, no .nvmrc), the
# host runs v24, and Node 20 left LTS maintenance in April 2026. 22 is the
# supported line closest to what the developer actually runs.
# ═════════════════════════════════════════════════════════════════════════════

# ── deps ─────────────────────────────────────────────────────────────────────
# Manifests only, before any source. This is what makes layer caching work:
# editing a .tsx must not re-run a two-minute npm ci.
FROM node:22-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# ── dev ──────────────────────────────────────────────────────────────────────
# Source arrives by bind mount from docker-compose.dev.yml. node_modules stays
# in the image and is protected by a volume in the override, so the host's
# darwin-arm64 build never shadows this linux-arm64 one.
FROM node:22-alpine AS dev
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json ./

EXPOSE 5173

# --host 0.0.0.0 is mandatory: Vite's default localhost bind is invisible from
# outside the container, so nginx would answer 502 for every page load.
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]

# ── build ────────────────────────────────────────────────────────────────────
FROM deps AS build
WORKDIR /app

COPY . .

# `npm run build` is `tsc && vite build`, so a type error fails the image build.
RUN npm run build

# ── prod ─────────────────────────────────────────────────────────────────────
# The built dist/ is served by its own nginx. The edge proxy then only has to
# route "/" to this service, which keeps the dev and prod topologies identical
# (same routes, same ports — only the upstream behind "/" changes).
FROM nginx:alpine AS prod

COPY --from=build /app/dist /usr/share/nginx/html

# Written inline: the build context is ./el_vuelto_frontend, so a file under
# ../docker/ cannot be COPYd from here.
COPY <<'SPACONF' /etc/nginx/conf.d/default.conf
server {
    listen 5173;
    server_name _;

    root /usr/share/nginx/html;
    index index.html;

    # Hashed assets are immutable; index.html must never be cached or a deploy
    # keeps serving the old bundle from the browser cache.
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        try_files $uri =404;
    }

    location = /index.html {
        add_header Cache-Control "no-store, must-revalidate";
    }

    # React Router owns the client-side routes (/login/<slug>, /admin/...), so
    # any unknown path has to fall back to the SPA shell instead of 404ing.
    location / {
        try_files $uri $uri/ /index.html;
    }
}
SPACONF

EXPOSE 5173
