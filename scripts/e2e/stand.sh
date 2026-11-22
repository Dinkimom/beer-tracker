#!/usr/bin/env bash
# Стенд регресса на встроенном трекере otorva: пустые PostgreSQL и otorva (docker-compose.stand.yml)
# и отдельный dev-сервер планера хоста на порту стенда. Рабочий стек (pnpm docker:dev) не трогается.
#
#   bash scripts/e2e/stand.sh up     # поднять с нуля (старый стенд сносится)
#   bash scripts/e2e/stand.sh down   # опустить и стереть данные
#   bash scripts/e2e/stand.sh run [аргументы playwright]   # up → e2e/stand → down (pnpm e2e:stand)
#
# Порты: планер STAND_PORT (3100), PostgreSQL 55432, Redis 56379, otorva 58090.
# Лог dev-сервера — e2e/.results/stand/next.log. STAND_KEEP=1 — не опускать после run (разбор падений).
set -euo pipefail

cd "$(dirname "$0")/../.."

port="${STAND_PORT:-3100}"
db_port="${STAND_DB_PORT:-55432}"
redis_port="${STAND_REDIS_PORT:-56379}"
otorva_port="${STAND_OTORVA_PORT:-58090}"
state_dir="e2e/.results/stand"
pid_file="$state_dir/next.pid"
compose=(docker compose -f docker-compose.stand.yml)

stop_next() {
  if [[ -f "$pid_file" ]]; then
    # Процесс запущен своей группой (setsid/set -m): гасим всю группу, включая дочерний next-server.
    kill -- "-$(cat "$pid_file")" 2>/dev/null || kill "$(cat "$pid_file")" 2>/dev/null || true
    rm -f "$pid_file"
  fi
}

down() {
  stop_next
  STAND_DB_PORT="$db_port" STAND_REDIS_PORT="$redis_port" STAND_OTORVA_PORT="$otorva_port" \
    "${compose[@]}" down -v --remove-orphans >/dev/null 2>&1 || true
}

wait_url() {
  local url="$1" seconds="$2" i=0
  until curl -s -o /dev/null -f "$url"; do
    i=$((i + 1))
    if (( i > seconds * 2 )); then
      echo "Нет ответа от $url за ${seconds} с" >&2
      return 1
    fi
    sleep 0.5
  done
}

up() {
  down
  if curl -s -o /dev/null "http://localhost:$port"; then
    echo "Порт $port занят — задайте STAND_PORT" >&2
    exit 1
  fi
  mkdir -p "$state_dir"
  STAND_DB_PORT="$db_port" STAND_REDIS_PORT="$redis_port" STAND_OTORVA_PORT="$otorva_port" \
    "${compose[@]}" up -d --build --wait

  # Переменные окружения сильнее .env хоста: стенд не видит рабочую базу, трекер и OAuth.
  set -m
  env \
    POSTGRES_HOST=127.0.0.1 POSTGRES_PORT="$db_port" POSTGRES_DB=beer_tracker \
    POSTGRES_USER=postgres POSTGRES_PASSWORD=stand-only-postgres BEER_TRACKER_SCHEMA=public \
    DB_MIGRATIONS_AUTO=true DB_CONTRACT_MODE=native DB_CONTRACT_PREFLIGHT_STRICT=false \
    REDIS_URL="redis://127.0.0.1:$redis_port" \
    AUTH_SESSION_SECRET=stand-only-auth-session-secret-0123456789 \
    ORG_SECRETS_ENCRYPTION_KEY=5374616e642d6f6e6c792d6f72672d736563726574732d6b65792d3031323334 \
    OTORVA_API_URL="http://127.0.0.1:$otorva_port/api/v1" \
    OTORVA_BOOTSTRAP_TOKEN=stand-only-otorva-bootstrap-0123456789abcdef \
    YANDEX_OAUTH_CLIENT_ID= YANDEX_OAUTH_CLIENT_SECRET= \
    ATLASSIAN_OAUTH_CLIENT_ID= ATLASSIAN_OAUTH_CLIENT_SECRET= \
    S3_ACCESS_KEY= S3_SECRET_KEY= SYNC_CRON_SECRET= \
    pnpm dev:skip-lint --port "$port" >"$state_dir/next.log" 2>&1 &
  echo $! >"$pid_file"
  set +m

  wait_url "http://localhost:$port/register" 240
  echo "Стенд: планер http://localhost:$port, otorva http://127.0.0.1:$otorva_port"
}

case "${1:-}" in
  up) up ;;
  down) down ;;
  run)
    shift
    up
    status=0
    E2E_STAND_PORT="$port" E2E_STAND_OTORVA_URL="http://127.0.0.1:$otorva_port/api/v1" \
      pnpm exec playwright test --config=playwright.stand.config.ts "$@" || status=$?
    [[ -n "${STAND_KEEP:-}" ]] || down
    exit "$status"
    ;;
  *)
    echo "usage: $0 up | down | run [playwright args]" >&2
    exit 2
    ;;
esac
