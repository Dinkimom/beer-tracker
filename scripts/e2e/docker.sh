#!/usr/bin/env bash
# Запускает Playwright в Linux-образе той же версии, что в package.json, против уже запущенного dev-сервера хоста.
# Визуальные эталоны снимаются и сверяются только так: шрифты и сглаживание macOS дают другие пиксели.
#
#   bash scripts/e2e/docker.sh --project=visual                       # сверить
#   bash scripts/e2e/docker.sh --project=visual --update-snapshots    # обновить эталоны
#
# Сервер: dev-сервер хоста на порту E2E_PORT (по умолчанию 3000).
#
# Браузер в контейнере ходит на http://localhost:<порт>, а не на host.docker.internal: внутри контейнера
# порт пробрасывается на хост. Иначе страница — не secure context (нет crypto.randomUUID) и чужой origin для
# Next dev (allowedDevOrigins) — тест видел бы не то приложение, что на хосте.
set -euo pipefail

cd "$(dirname "$0")/../.."

version="$(node -p "require('./node_modules/@playwright/test/package.json').version")"
port="${E2E_PORT:-3000}"

if ! curl -s -o /dev/null -f "http://localhost:$port/demo/planner"; then
  echo "Нет ответа от http://localhost:$port/demo/planner. Запустите dev-сервер (pnpm docker:dev или pnpm dev)." >&2
  exit 1
fi

forward="require('net').createServer((c) => { const u = require('net').connect($port, 'host.docker.internal'); \
c.pipe(u).pipe(c); c.on('error', () => u.destroy()); u.on('error', () => c.destroy()); }).listen($port, '127.0.0.1')"

# node_modules хоста монтируется как есть: @playwright/test — чистый JS, браузеры берутся из образа.
exec docker run --rm --ipc=host \
  -v "$PWD":/work -w /work \
  -e E2E_PORT="$port" \
  -e CI="${CI:-}" \
  --add-host=host.docker.internal:host-gateway \
  "mcr.microsoft.com/playwright:v${version}-noble" \
  bash -c 'node -e "$1" & sleep 0.5; shift; exec node node_modules/@playwright/test/cli.js test "$@"' _ "$forward" "$@"
