# Установка и запуск

Развёртывание Beer Tracker: Docker Hub, разработка из исходников, трекер, sync и команды.

Провайдер issue tracker выбирается на организацию — детали в [ISSUE_TRACKERS.md](./ISSUE_TRACKERS.md).

## Готовый образ (Docker Hub)

Образы: [`dinkimom/beer-tracker`](https://hub.docker.com/r/dinkimom/beer-tracker) и воркер [`dinkimom/beer-tracker-sync-worker`](https://hub.docker.com/r/dinkimom/beer-tracker-sync-worker). Тег [`latest`](https://hub.docker.com/r/dinkimom/beer-tracker/tags) — последняя публикация; в каждом теге есть `linux/amd64` и `linux/arm64`.

```bash
cp env.example .env
# POSTGRES_PASSWORD, AUTH_SESSION_SECRET (≥32), ORG_SECRETS_ENCRYPTION_KEY (64 hex)
docker compose -f docker-compose.yml -f docker-compose.hub.yml up -d
```

Приложение: [http://localhost:3000](http://localhost:3000). Postgres на хосте — порт 5433. Воркер синхронизации: добавьте `--profile exporter` (и при необходимости `--profile cron`). Другой тег: `BEER_TRACKER_TAG=latest`.

`database/init.sql` выполняется только на пустом томе. При переходе на новый тег существующую БД нужно догнать файлами из `database/`: порядок и даты — в [DATABASE.md](./DATABASE.md#обновление-живой-бд).

`YANDEX_OAUTH_CLIENT_ID` и `YANDEX_OAUTH_CLIENT_SECRET` — runtime env контейнера app (как `ATLASSIAN_OAUTH_*`), не Docker build ARG. Задайте в `.env` и перезапустите: пользователи входят кнопкой «Войти с Яндекс ID» (`/api/auth/yandex/start`). Для Jira эти переменные не нужны.

## Разработка из исходников

```bash
pnpm install
cp env.example .env
# Заполните POSTGRES_PASSWORD и при необходимости AUTH_SESSION_SECRET,
# ORG_SECRETS_ENCRYPTION_KEY, REDIS_URL — см. env.example
# Для фотокарточек и схем планера задайте S3_* (MinIO или любой S3 API),
# S3_KEY_PREFIX=local/
```

### PostgreSQL и Redis через Docker

```bash
docker compose up -d db redis
# В .env: POSTGRES_HOST=localhost, POSTGRES_PORT=5433, REDIS_URL=redis://localhost:6379
pnpm dev
```

Сервис `app` в `docker-compose.yml` поднимает приложение в production-режиме вместе с БД и Redis (порт приложения 3000, БД на хосте 5433).

### Без Docker (свой Postgres)

Задайте `POSTGRES_*` и `BEER_TRACKER_SCHEMA` (по умолчанию `public`) в `.env` и выполните `database/init.sql` на чистой БД (`psql -v ON_ERROR_STOP=1 -f database/init.sql`). `init.sql` всегда создаёт таблицы в `public`. Живую БД обновляют файлами из `database/` через `./scripts/db/psql-with-schema.sh` (или `pnpm db:psql`). Порядок, идемпотентность и известные проблемы описаны в [DATABASE.md](./DATABASE.md), каталог `staff`/`teams` и права — в [COMMERCIAL_DB_CONTRACT.md](./COMMERCIAL_DB_CONTRACT.md).

```bash
pnpm dev
```

## S3 (фотокарточки и схемы планера)

Байты файлов лежат в S3-совместимом хранилище, в Postgres только `planner_files.storage_key`. Браузер ходит в `/api/sprints/.../image` и `/diagram` (Next проксирует в S3).

Пример для локального MinIO в `.env` / `.env.local`:

```
S3_ENDPOINT_URL=http://localhost:9000
S3_REGION=us-east-1
S3_FORCE_PATH_STYLE=true
S3_BUCKET=beer-tracker-storage
S3_ACCESS_KEY=...
S3_SECRET_KEY=...
S3_KEY_PREFIX=local/
```

Бакет нужно создать заранее. Проверка: загрузить фотокарточки в планере → объект `local/orgs/<orgId>/planner/<fileId>` в бакете.

Для уже существующей БД с BYTEA: `./scripts/db/psql-with-schema.sh ... -f database/migrate-planner-files-to-s3.sql`. Скрипт сносит текущие фото и схемы без переливки, и так при **каждом** запуске: применяйте его один раз. Приложение само делает тот же переход при первом обращении к файлам планера (`lib/sprints/ensurePlannerCommentImages.ts`).

## Настройка трекера и токенов

Провайдер выбирается **на организацию** (онбординг и админка «Трекер»). Дальше — своя ветка в **[ISSUE_TRACKERS.md](./ISSUE_TRACKERS.md)** (развилка A / B / C).

| Провайдер | Документация |
|-----------|----------------|
| Яндекс Трекер (`tracker`) | [Ветка A](./ISSUE_TRACKERS.md#ветка-a--яндекс-трекер) — OAuth-приложение на oauth.yandex.ru + `YANDEX_OAUTH_CLIENT_ID` / `YANDEX_OAUTH_CLIENT_SECRET` |
| Jira Cloud (`jira-cloud`) | [Ветка B](./ISSUE_TRACKERS.md#ветка-b--jira-cloud) — Atlassian OAuth (пользователи) + email/API-токен (орг) |
| Jira DC/Server (`jira-onprem`) | [Ветка C](./ISSUE_TRACKERS.md#ветка-c--jira-data-center--server) — PAT |

```bash
# Тип трекера и URL API задаются на /register и в админке «Трекер».
# Только для Яндекс Трекера — приложение Яндекс ID с https://oauth.yandex.ru/
# (scopes tracker:read + tracker:write). Runtime env, рестарт после смены:
YANDEX_OAUTH_CLIENT_ID=
YANDEX_OAUTH_CLIENT_SECRET=

# Только для Jira Cloud — OAuth-приложение Atlassian (вход пользователей):
# ATLASSIAN_OAUTH_CLIENT_ID=
# ATLASSIAN_OAUTH_CLIENT_SECRET=
```

### Поля в админке организации

Тип трекера и URL API (до первой синхронизации их можно поменять), дальше — по провайдеру: для **Yandex Tracker** — Cloud Organization ID; для **Jira Cloud** — email + API-токен (Basic для sync); для **Jira on-prem** — PAT/учётка сайта. В запросах планера — `X-Organization-Id`.

Токен организации хранится в БД в зашифрованном виде. Отдельной переменной окружения для него нет.

### Пользовательская учётка (обязательно)

1. Откройте приложение → `/auth-setup` (или `/register` при первом on-prem setup)
2. По **своей** ветке: Yandex OAuth / **«Продолжить с Atlassian»** (Jira Cloud) / Jira PAT (on-prem)
3. Продолжите вход

Без учётных данных трекера доступ к планеру невозможен. Детали: [ISSUE_TRACKERS.md](./ISSUE_TRACKERS.md), API — [API_DOCUMENTATION.md](./API_DOCUMENTATION.md).

## Плановый инкрементальный sync (multi-tenant)

Подробно — режимы, env, блокировки, диагностика — в [SYNC.md](./SYNC.md). Ручной запуск и статус — `/admin/sync`.

Внешний cron может вызывать:

- `POST /api/internal/sync/tick` — плановый **incremental** по org’ам, у которых `sync_next_run_at` наступил (нужны Redis + `pnpm sync-worker`);
- `POST /api/internal/sync/full-rescan` с телом `{ "organizationId": "<uuid>" }` — **полный** rescan одной организации **inline в HTTP-запросе** (без Redis/воркера; те же cooldown и блокировка по `sync_runs`). Подходит для Google Cloud Scheduler: увеличьте HTTP timeout цели (до ~30 мин) под длительность выгрузки.

Заголовок: `X-Sync-Cron-Secret: <SYNC_CRON_SECRET>` (или `Authorization: Bearer <secret>`). Для incremental tick: Redis (`REDIS_URL`) и воркер `pnpm sync-worker`. В Docker Compose: `docker compose --profile exporter up` — сервис `sync-worker` собирается отдельным slim-образом (без Next.js), а сервис `sync-cron` вызывает тик раз в `SYNC_CRON_LOOP_SECONDS` секунд. Без Redis ответ тика будет `200` с `reason: redis_not_configured` и без постановки job — удобно для CI.

## Основные команды

```bash
pnpm dev                 # разработка (сначала прогоняет eslint .)
pnpm dev:skip-lint       # то же без eslint
pnpm build               # production-сборка Next.js
pnpm start               # запуск production-сборки
pnpm sync-worker         # BullMQ-воркер (нужен REDIS_URL)
pnpm sync-worker:build   # бандл в dist/sync-worker (Docker target sync-worker)
pnpm db:psql -f database/<файл>.sql   # psql с -v schema=$BEER_TRACKER_SCHEMA
pnpm lint
pnpm typecheck
pnpm test
pnpm lint:unused         # knip
pnpm version:bump -- patch   # только package.json
pnpm release -- patch        # bump + commit + tag vX.Y.Z
pnpm release -- patch --push # то же и push (remote public или origin)
```

Версия в UI = `package.json` (= тег `vX.Y.Z` без `v`). Git SHA показывается отдельно. Push тега запускает workflow **Release** → GitHub Release.

## CI (GitHub Actions)

- **CI** (`.github/workflows/ci.yml`): `pnpm lint`, `pnpm typecheck`, `pnpm test` на `push`/`pull_request` в `main` / `master`.
- **Release** (`.github/workflows/release.yml`): GitHub Release при push тега `v*.*.*`, если версия в `package.json` совпадает с тегом.
- **Docker Hub** (`.github/workflows/docker-hub.yml`): на тот же тег собирает и публикует `dinkimom/beer-tracker` (target `runner`) и `dinkimom/beer-tracker-sync-worker` (target `sync-worker`) для amd64 и arm64; есть ручной запуск для уже существующей версии.

## Структура репозитория

```
├── apps/
│   ├── sync-worker/          # процесс синхронизации (BullMQ), см. SYNC.md
│   ├── mcp-sprint-context/   # stdio MCP для отладки sprint-context
│   └── agent-bridge/         # локальный мост к claude -p (SPRINT_CONTEXT.md)
├── app/                 # Next.js App Router (страницы и app/api/*)
├── components/          # Общие UI
├── contexts/
├── features/            # Домены (sprint, backlog, burndown, …)
├── hooks/
├── lib/                 # DB, snapshots, tracker API, sync, tenant, …
├── types/
├── database/            # init.sql + ручные миграции, см. DATABASE.md
├── scripts/             # db/, release/, i18n/, knip/, …
└── docs/
```

## Безопасность

- Пользовательские токены трекера хранятся только в браузере (localStorage)
- Токены передаются через HTTPS
- Поддержка fallback на серверный токен организации
- Приоритет: пользовательский токен > серверный токен
- Сообщения об уязвимостях — [SECURITY.md](../SECURITY.md)
