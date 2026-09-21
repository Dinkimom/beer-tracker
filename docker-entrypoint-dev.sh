#!/bin/sh
set -e
cd /app

# Не кладём store на bind-mount `.:/app` (.pnpm-store на хосте): app и worker
# иначе гоняются за одними файлами.
export PNPM_STORE_DIR="${PNPM_STORE_DIR:-/root/.local/share/pnpm/store}"

# `.env` для `pnpm dev` часто содержит POSTGRES_HOST=localhost и порт 5433 (проброс compose db)
# и REDIS_URL=redis://localhost:6379. Внутри контейнера localhost — не сервисы db/redis.
postgres_host="${POSTGRES_HOST:-}"
case "$postgres_host" in
  localhost|127.0.0.1|"")
    export POSTGRES_HOST=db
    export POSTGRES_PORT=5432
    echo "[docker-entrypoint-dev] POSTGRES_HOST=${postgres_host:-empty} → db:5432 (compose db)"
    ;;
esac

redis_url="${REDIS_URL:-}"
case "$redis_url" in
  redis://localhost|redis://localhost:*|redis://localhost/*|redis://127.0.0.1|redis://127.0.0.1:*|redis://127.0.0.1/*)
    export REDIS_URL=redis://redis:6379
    echo "[docker-entrypoint-dev] REDIS_URL=${redis_url} → redis://redis:6379 (compose redis)"
    ;;
esac

STAMP=/app/node_modules/.pnpm-lock.stamp

node_modules_ready() {
  [ -d node_modules/next ] && [ -f "$STAMP" ] && cmp -s /app/pnpm-lock.yaml "$STAMP"
}

install_node_modules() {
  if node_modules_ready; then
    return 0
  fi
  echo "[docker-entrypoint-dev] pnpm install (fresh volume or lockfile changed)..."
  # Docker без TTY: иначе pnpm прерывается при пересборке node_modules (remove modules dir).
  CI=true pnpm install --frozen-lockfile
  cp /app/pnpm-lock.yaml "$STAMP"
}

wait_for_node_modules() {
  echo "[docker-entrypoint-dev] waiting for shared node_modules (app install)..."
  n=0
  while ! node_modules_ready; do
    n=$((n + 1))
    if [ "$n" -gt 180 ]; then
      echo "[docker-entrypoint-dev] timed out waiting for node_modules" >&2
      exit 1
    fi
    sleep 2
  done
}

# app: DOCKER_DEV_INSTALL_NODE_MODULES=1 (дефолт). sync-worker=0 — не гоняться за одним томом.
if [ "${DOCKER_DEV_INSTALL_NODE_MODULES:-1}" = "0" ]; then
  wait_for_node_modules
else
  install_node_modules
fi
exec "$@"
