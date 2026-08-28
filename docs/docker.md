# Docker — running ElVuelto in containers

Frontend, backend and an nginx reverse proxy, started with one command. The
point of the setup is that **the app is reachable from another device on the
LAN** (a phone, the cashier's till) with no CORS configuration and no machine's
IP baked into the frontend bundle.

```bash
cp .env.example .env          # then edit CSRF_TRUSTED_ORIGINS, see below
./scripts/manage-docker.sh build dev
./scripts/manage-docker.sh up dev
```

`up` prints the URLs when it finishes, LAN address included.

---

## The two ports

nginx is the **only** container that publishes anything. `backend` and
`frontend` are reachable exclusively over the internal compose network, by
service name. The published numbers deliberately match the internal ones, so
"5173" and "8000" mean the same thing inside Docker and outside.

| Port | What it is | Use it for |
|---|---|---|
| **5173** (`APP_PORT`) | The whole application on **one origin**: `/` is the React app, `/api/` `/admin/` `/docs/` are Django | **This is the URL for the phone.** Everything the app itself does |
| **8000** (`API_PORT`) | The backend, straight through | curl, Postman, Swagger at `/docs/`, Django admin without the SPA in the way |

```
host :5173 ─► nginx :5173 ─┬─ "/"      ─► frontend:5173   (Vite in dev, static dist in prod)
                           └─ "/api/"  ─► backend:8000
host :8000 ─► nginx :8000 ─── everything ─► backend:8000
```

**Why one origin matters.** The frontend calls the API at the relative path
`/api` (`src/app/apiBase.ts`). Browser and API therefore share an origin, so
there is no CORS preflight and nothing in the bundle knows what host it is
being served from. The same build works at `localhost`, at `192.168.1.75`, and
at a real domain later — no rebuild.

### Reaching it from the phone

```bash
ipconfig getifaddr en0      # Wi-Fi/Ethernet address of the Mac, e.g. 192.168.1.75
```

Then open `http://192.168.1.75:5173` on the other device, on the same network.
`up` already prints this line for you.

The **first** time, macOS may pop up *"Do you want the application to accept
incoming network connections?"* — accept it, or the LAN device just times out.

---

## Commands

```
./scripts/manage-docker.sh <command> [env] [service] [extra args]
```

`env` is `dev` (default) or `prod`. Django commands default to the `backend`
service, so the third argument is usually unnecessary.

| Command | Does |
|---|---|
| `build [env]` | Build the images |
| `up [env]` | Start, wait for `/healthz`, print the URLs |
| `down [env]` | Stop and remove containers, **keep** volumes |
| `restart [env] [service]` | Restart without rebuilding |
| `logs [env] [service]` | Follow the logs (Ctrl-C to stop) |
| `ps [env]` | Container status |
| `migrate [env]` | `manage.py migrate` |
| `makemigrations [env] [service] [app]` | `manage.py makemigrations` |
| `shell [env]` | Django shell |
| `bash [env] [service]` | A shell inside a container |
| `createsuperuser [env]` | |
| `collectstatic [env]` | |
| `test [env]` | `manage.py test` — no test framework is configured in this repo yet |
| `clean [env]` | `down -v --remove-orphans`, after confirming |

The script detects `docker compose` (v2) or `docker-compose` (v1) on its own.

### Production variant

```bash
TAG=$(git rev-parse --short HEAD) ./scripts/manage-docker.sh build prod
./scripts/manage-docker.sh up prod
```

| | dev | prod |
|---|---|---|
| Frontend | Vite dev server + HMR, source bind-mounted | built `dist/` inside the image |
| Backend | `runserver`, source bind-mounted | gunicorn, code copied in, non-root |
| `DEBUG` | `True` (`settings.local`) | `False` (`settings.production`) |
| Static files | served by Django | `collectstatic` → volume → nginx |
| Restart policy | none | `unless-stopped` |
| Images | `elvuelto-*:dev` | `elvuelto-*:prod` |

Leave `TAG` unset in `.env`. Each environment supplies its own default; pinning
it applies to **both**, so a `build prod` would overwrite your dev images.

---

## The database

There is deliberately **no `db` service**. Postgres already runs as a container
outside this stack, publishing 5432 on the host, and holds the live `elvuelto`
database. The backend reaches it through `host.docker.internal`, which is how a
container addresses the Mac.

```
DB_HOST=host.docker.internal     # in .env
```

`DB_NAME`, `DB_USER` and `DB_PASSWORD` keep coming from
`el_vuelto_backend/.env`, untouched. For a deployment, point `DB_HOST` at the
managed instance — nothing else changes.

`./scripts/manage-docker.sh clean` never touches it: the data lives in a volume
belonging to another compose project.

---

## ALLOWED_HOSTS and CSRF_TRUSTED_ORIGINS

Two settings decide whether the LAN device can do anything beyond reading.

**`ALLOWED_HOSTS`** — only read by `settings/production.py`. `settings/local.py`
hardcodes `["*"]`, so dev never needs it. For prod on the LAN it must contain
the Mac's IP:

```
ALLOWED_HOSTS=localhost,127.0.0.1,backend,192.168.1.75
```

**`CSRF_TRUSTED_ORIGINS`** — the one everybody forgets. Django compares the
browser's `Origin` header against this list on every POST/PUT/PATCH/DELETE.
Without the LAN origin listed, the Django admin login from another device fails
with **403 CSRF verification failed**, and so does every form POST.

```
CSRF_TRUSTED_ORIGINS=http://localhost:5173,http://192.168.1.75:5173
```

Both the **scheme and the port** are required. `192.168.1.75` alone does not
work; `http://192.168.1.75:5173` does.

There is a second half to this that is easy to miss: the proxy must forward the
`Host` header **with the port**. `docker/nginx/proxy_common.conf` uses
`proxy_set_header Host $http_host` for exactly this reason. The far more common
recipe, `$host`, silently drops the port, `request.get_host()` then never
matches the `Origin`, and no entry in `CSRF_TRUSTED_ORIGINS` can save you.

`django-cors-headers` is still installed and configured, but with one origin it
has nothing left to do. Same-origin proxying is what actually solves the LAN
case — the CORS settings are only there for API clients on a genuinely
different origin.

---

## Troubleshooting

### 1. nginx returns 502 Bad Gateway

nginx is up but the service behind that route is not answering.

```bash
./scripts/manage-docker.sh ps dev
./scripts/manage-docker.sh logs dev backend      # or frontend
```

Usual causes, most common first:

- **The dev server bound to `127.0.0.1` instead of `0.0.0.0`.** Inside a
  container, `127.0.0.1` means *that container*, so nginx cannot reach it.
  Django must run `runserver 0.0.0.0:8000` and Vite `--host 0.0.0.0`. Both are
  already set in the Dockerfiles — a 502 means something overrode them.
- **The backend crashed at boot** — most often a missing `DJANGO_SECRET_KEY`
  (it has no default) or Postgres unreachable. The logs say which.
- **The container is still starting.** Django takes a few seconds; `up` waits
  for `/healthz` but the backend can lag behind nginx.

Check the proxy itself is alive, independently of both apps:

```bash
curl http://localhost:5173/healthz      # nginx answers this on its own → "ok"
```

### 2. Hot reload does nothing / WebSocket errors in the console

Symptom: the page loads, you save a `.tsx`, nothing happens, and the browser
console repeats `WebSocket connection to 'ws://...' failed`.

- **The port the browser dials is wrong.** The HMR client connects *through
  nginx*, not to Vite, so it must use the **published** port.
  `server.hmr.clientPort` in `vite.config.ts` reads `VITE_HMR_CLIENT_PORT`,
  which `docker-compose.dev.yml` sets from `APP_PORT`. Changing `APP_PORT`
  without restarting the frontend container leaves the two out of sync.
- **The upgrade headers are missing.** The `location /` block needs
  `proxy_http_version 1.1`, `Upgrade` and `Connection`. They are in
  `docker/nginx/dev.conf`; if you edited it, `restart dev nginx`.

Symptom instead: the WebSocket connects but a saved file changes nothing.

- **File watching.** Bind-mounted files on Docker Desktop for Mac frequently
  emit no inotify events, so Vite never learns the file changed.
  `server.watch.usePolling: true` handles it; without it the failure is
  completely silent.

Verify the handshake without a browser:

```bash
curl -i --max-time 5 -H "Connection: Upgrade" -H "Upgrade: websocket" \
     -H "Sec-WebSocket-Version: 13" -H "Sec-WebSocket-Key: $(openssl rand -base64 16)" \
     -H "Sec-WebSocket-Protocol: vite-hmr" http://localhost:5173/
# → HTTP/1.1 101 Switching Protocols
```

### 3. 403 CSRF verification failed

Almost always from the LAN device, on the admin login or any POST.

1. Is the exact origin — scheme **and** port — in `CSRF_TRUSTED_ORIGINS`?
2. Did you restart the backend after editing `.env`? The value is read at
   startup: `./scripts/manage-docker.sh restart dev backend`.
3. Is the proxy forwarding the port? `proxy_set_header Host $http_host`, not
   `$host`. This is the cause that survives fixing 1 and 2.

### Other things that bite

**"address already in use" on `up`.** You still have the host's `npm run dev`
or `manage.py runserver` running. The container stack uses the same port
numbers on purpose, so the two cannot run at once — stop the host processes
first:

```bash
lsof -nP -iTCP:5173 -sTCP:LISTEN     # find it, then kill the PID
```

**Changing dependencies does nothing.** `node_modules` lives in a named volume
that is only seeded once. After editing `package.json`:

```bash
./scripts/manage-docker.sh clean dev && ./scripts/manage-docker.sh build dev
```

**A stale frontend in prod.** The built assets are inside the image. Rebuild —
`restart` alone reuses the old bundle.
