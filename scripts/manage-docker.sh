#!/usr/bin/env bash
# ═════════════════════════════════════════════════════════════════════════════
# ElVuelto — Docker stack wrapper
#
#   ./scripts/manage-docker.sh <command> [env] [service] [extra args]
#
# env defaults to "dev". See the usage block at the bottom for examples.
# ═════════════════════════════════════════════════════════════════════════════

set -euo pipefail

# BuildKit: parallel stages, better cache, and the heredoc COPY syntax the
# Dockerfiles use. Without it the backend image fails to build.
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1

# Always operate from the repo root, whatever directory the script is called from.
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

# ── colours ──────────────────────────────────────────────────────────────────
if [[ -t 1 ]]; then
    RED=$'\033[0;31m'; GREEN=$'\033[0;32m'; YELLOW=$'\033[0;33m'
    BLUE=$'\033[0;34m'; BOLD=$'\033[1m'; NC=$'\033[0m'
else
    RED=''; GREEN=''; YELLOW=''; BLUE=''; BOLD=''; NC=''
fi

info()  { echo "${BLUE}▸${NC} $*"; }
ok()    { echo "${GREEN}✓${NC} $*"; }
warn()  { echo "${YELLOW}!${NC} $*"; }
die()   { echo "${RED}✗${NC} $*" >&2; exit 1; }

# ── compose v2 vs v1 ─────────────────────────────────────────────────────────
# Detected once. v2 ("docker compose", a subcommand) is preferred; v1
# ("docker-compose", a separate binary) is the fallback.
if docker compose version >/dev/null 2>&1; then
    DC=(docker compose)
elif command -v docker-compose >/dev/null 2>&1; then
    DC=(docker-compose)
    warn "Using legacy docker-compose v1. v2 is recommended."
else
    die "Neither 'docker compose' nor 'docker-compose' is available. Is Docker Desktop running?"
fi

docker info >/dev/null 2>&1 || die "The Docker daemon is not responding. Start Docker Desktop and retry."

# ── arguments ────────────────────────────────────────────────────────────────
CMD="${1:-help}"
ENVIRONMENT="${2:-dev}"
SERVICE="${3:-}"
EXTRA="${4:-}"

COMPOSE_FILE="docker-compose.yml"
ENV_FILE="docker-compose.${ENVIRONMENT}.yml"

# ── helpers ──────────────────────────────────────────────────────────────────

# Read a key out of .env without sourcing it (sourcing executes whatever is in
# there, and a stray backtick in a password is enough to ruin the day).
read_env() {
    local key="$1" default="$2" value=""
    if [[ -f .env ]]; then
        value="$(grep -E "^[[:space:]]*${key}=" .env | tail -1 | cut -d= -f2- | tr -d '"'\''' | xargs || true)"
    fi
    echo "${value:-$default}"
}

# en0 is Ethernet/primary on most Macs, en1 is Wi-Fi on others — try both.
lan_ip() {
    local ip=""
    if command -v ipconfig >/dev/null 2>&1; then
        ip="$(ipconfig getifaddr en0 2>/dev/null || true)"
        [[ -z "$ip" ]] && ip="$(ipconfig getifaddr en1 2>/dev/null || true)"
    fi
    # Linux fallback, so the script is not macOS-only.
    if [[ -z "$ip" ]] && command -v hostname >/dev/null 2>&1; then
        ip="$(hostname -I 2>/dev/null | awk '{print $1}' || true)"
    fi
    echo "$ip"
}

require_env_file() {
    [[ -f "$ENV_FILE" ]] || die "No such environment: '${ENVIRONMENT}' (expected ${ENV_FILE}).
   Available: $(ls docker-compose.*.yml 2>/dev/null | sed 's/docker-compose\.//;s/\.yml//' | tr '\n' ' ')"
}

compose() {
    require_env_file
    "${DC[@]}" -f "$COMPOSE_FILE" -f "$ENV_FILE" "$@"
}

# Default to the backend for the Django-side commands, so
# `manage-docker.sh migrate dev` works with no third argument.
default_service() {
    echo "${SERVICE:-$1}"
}

# Use a running container when there is one, otherwise spin up a throwaway.
# Saves the "service not running" dance for migrate/shell on a stopped stack.
run_in() {
    local svc="$1"; shift
    if compose ps --status running --services 2>/dev/null | grep -qx "$svc"; then
        compose exec "$svc" "$@"
    else
        info "'${svc}' is not running — using a one-off container."
        compose run --rm "$svc" "$@"
    fi
}

print_urls() {
    local app_port api_port ip
    app_port="$(read_env APP_PORT 5173)"
    api_port="$(read_env API_PORT 8000)"
    ip="$(lan_ip)"

    echo
    echo "${BOLD}The app (SPA + API, one origin — no CORS):${NC}"
    echo "   http://localhost:${app_port}"
    if [[ -n "$ip" ]]; then
        echo "   http://${ip}:${app_port}   ${GREEN}← from the phone / another laptop${NC}"
    else
        warn "  LAN IP not detected. Find it with: ipconfig getifaddr en0"
    fi
    echo
    echo "${BOLD}The backend, straight through:${NC}"
    echo "   http://localhost:${api_port}/admin/"
    [[ -n "$ip" ]] && echo "   http://${ip}:${api_port}/admin/"
    echo
    echo "   Logs:   ./scripts/manage-docker.sh logs ${ENVIRONMENT}"
    echo "   Stop:   ./scripts/manage-docker.sh down ${ENVIRONMENT}"
    echo
}

wait_for_health() {
    local app_port attempt
    app_port="$(read_env APP_PORT 5173)"
    info "Waiting for the proxy to answer on :${app_port} ..."
    for attempt in $(seq 1 30); do
        if curl -fsS -o /dev/null "http://localhost:${app_port}/healthz" 2>/dev/null; then
            ok "Stack is up."
            return 0
        fi
        sleep 1
    done
    warn "/healthz did not answer within 30s. The stack may still be booting — check:"
    warn "  ./scripts/manage-docker.sh logs ${ENVIRONMENT}"
    return 0
}

# ── commands ─────────────────────────────────────────────────────────────────
case "$CMD" in

    build)
        require_env_file
        info "Building images for '${ENVIRONMENT}' ${SERVICE:+(service: ${SERVICE})}..."
        # shellcheck disable=SC2086
        compose build ${SERVICE:-} ${EXTRA:-}
        ok "Build finished."
        [[ "$ENVIRONMENT" == "dev" ]] && \
            info "If you changed package.json, run 'clean dev' too — node_modules lives on a volume that is only seeded once."
        ;;

    up)
        require_env_file
        info "Starting the '${ENVIRONMENT}' stack..."
        # shellcheck disable=SC2086
        compose up -d ${SERVICE:-} ${EXTRA:-}
        wait_for_health
        print_urls
        ;;

    down)
        require_env_file
        info "Stopping the '${ENVIRONMENT}' stack..."
        compose down --remove-orphans
        ok "Stopped. Named volumes were kept — use 'clean' to remove them."
        ;;

    restart)
        require_env_file
        info "Restarting ${SERVICE:-all services}..."
        # shellcheck disable=SC2086
        compose restart ${SERVICE:-}
        ok "Restarted."
        ;;

    logs)
        require_env_file
        # shellcheck disable=SC2086
        compose logs -f --tail=200 ${SERVICE:-}
        ;;

    ps)
        require_env_file
        compose ps
        ;;

    migrate)
        svc="$(default_service backend)"
        # shellcheck disable=SC2086
        run_in "$svc" python manage.py migrate ${EXTRA:-}
        ;;

    makemigrations)
        svc="$(default_service backend)"
        # shellcheck disable=SC2086
        run_in "$svc" python manage.py makemigrations ${EXTRA:-}
        warn "Migrations were written inside the container. In dev the source is bind-mounted, so the files are already on your disk — check 'git status'."
        ;;

    shell)
        svc="$(default_service backend)"
        run_in "$svc" python manage.py shell
        ;;

    bash)
        svc="$(default_service backend)"
        # Alpine-based images (frontend, nginx) have no bash.
        run_in "$svc" sh -c 'command -v bash >/dev/null && exec bash || exec sh'
        ;;

    test)
        svc="$(default_service backend)"
        warn "This repo has no test framework configured (no pytest, no vitest) — 'manage.py test' will simply find nothing."
        # shellcheck disable=SC2086
        run_in "$svc" python manage.py test ${EXTRA:-}
        ;;

    createsuperuser)
        svc="$(default_service backend)"
        run_in "$svc" python manage.py createsuperuser
        ;;

    collectstatic)
        svc="$(default_service backend)"
        run_in "$svc" python manage.py collectstatic --noinput
        ;;

    clean)
        require_env_file
        echo "${YELLOW}This removes the '${ENVIRONMENT}' containers, its networks and its NAMED VOLUMES.${NC}"
        echo "Volumes that would be deleted:"
        compose config --volumes 2>/dev/null | sed 's/^/   - /' || true
        echo
        echo "${GREEN}Your Postgres data is NOT affected${NC} — it lives in a container outside this stack."
        read -r -p "Continue? [y/N] " answer
        if [[ "${answer}" =~ ^[Yy]$ ]]; then
            compose down -v --remove-orphans
            ok "Cleaned."
        else
            info "Cancelled. Nothing was removed."
        fi
        ;;

    help|--help|-h|*)
        [[ "$CMD" != "help" && "$CMD" != "--help" && "$CMD" != "-h" ]] && \
            echo "${RED}Unknown command: '${CMD}'${NC}" >&2 && echo
        cat <<USAGE
${BOLD}ElVuelto — Docker stack${NC}

  ./scripts/manage-docker.sh <command> [env] [service] [extra args]

${BOLD}env${NC} is 'dev' (default) or 'prod'.
${BOLD}service${NC} is backend | frontend | nginx. Django commands default to backend.

${BOLD}Stack${NC}
  build [env] [service]        Build the images
  up [env] [service]           Start it, then print the LAN URLs
  down [env]                   Stop and remove containers (keeps volumes)
  restart [env] [service]      Restart without rebuilding
  logs [env] [service]         Follow the logs
  ps [env]                     Show container status
  clean [env]                  down -v --remove-orphans, after confirming

${BOLD}Django${NC}
  migrate [env] [service] [args]
  makemigrations [env] [service] [args]
  shell [env]                  Django shell
  bash [env] [service]         A shell inside the container
  test [env]                   manage.py test (no framework configured yet)
  createsuperuser [env]
  collectstatic [env]

${BOLD}Examples${NC}
  ./scripts/manage-docker.sh build dev
  ./scripts/manage-docker.sh up dev
  ./scripts/manage-docker.sh logs dev backend
  ./scripts/manage-docker.sh migrate dev
  ./scripts/manage-docker.sh makemigrations dev backend products
  ./scripts/manage-docker.sh restart dev nginx
  ./scripts/manage-docker.sh down dev

  TAG=\$(git rev-parse --short HEAD) ./scripts/manage-docker.sh build prod
  ./scripts/manage-docker.sh up prod

${BOLD}Ports${NC} (set in .env)
  APP_PORT (default 5173)   the app, one origin — open this on the phone
  API_PORT (default 8000)   the backend, straight through

USAGE
        [[ "$CMD" =~ ^(help|--help|-h)$ ]] || exit 1
        ;;
esac
