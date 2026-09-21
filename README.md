# Beer Tracker

Self-hosted веб-приложение для планирования спринтов (свимлейны, бэклог, burndown, цели) поверх **Яндекс Трекера** или **Jira** (Cloud / Data Center). Историческое имя UI — Sprint Manager.

Одна кодовая база под [Apache License 2.0](./LICENSE). Провайдер трекера — один на инстанс: [docs/ISSUE_TRACKERS.md](./docs/ISSUE_TRACKERS.md).

## Возможности

- **Планирование спринтов** — визуальное распределение задач по дням и разработчикам
- **Управление бэклогом** — просмотр и управление задачами, не включенными в спринт
- **Burndown chart** — визуализация прогресса спринта
- **Цели спринта** — управление целями через чеклисты
- **Пользовательские учётные данные трекера** — каждый пользователь работает под своим токеном (OAuth / PAT / API token)

Планировщик эпиков и квартальное планирование сняты с навигации и не развиваются. См. [product steering](./docs/steering/product.md).

## Технологический стек

- **Frontend**: Next.js 16, React 19, TypeScript
- **Backend**: Next.js API Routes
- **База данных**: PostgreSQL приложения (планер, снимки задач `issue_snapshots`, мультиарендность, staff/teams)
- **Очередь (опционально)**: Redis + BullMQ — фоновая синхронизация с трекером (`pnpm sync-worker`)
- **Внешний issue tracker**: Yandex Tracker **или** Jira (`ISSUE_TRACKER_PROVIDER` + `TRACKER_API_URL`)
- **UI**: Tailwind CSS, Radix UI, dnd-kit (drag-and-drop)

## Установка

```bash
pnpm install
cp env.example .env
# Заполните POSTGRES_PASSWORD и при необходимости AUTH_SESSION_SECRET, ORG_SECRETS_ENCRYPTION_KEY, REDIS_URL — см. env.example
# Для фотокарточек и схем планера задайте S3_* (MinIO или любой S3 API), S3_KEY_PREFIX=local/
```

### Локально: PostgreSQL и Redis через Docker

```bash
docker compose up -d db redis
# В .env: POSTGRES_HOST=localhost, POSTGRES_PORT=5433, REDIS_URL=redis://localhost:6379
pnpm dev
```

Сервис `app` в `docker-compose.yml` поднимает приложение в production-режиме вместе с БД и Redis (порт приложения 3000, БД на хосте 5433).

### Без Docker (свой Postgres)

Задайте `POSTGRES_*` в `.env` и убедитесь, что выполнен `database/init.sql` на чистой БД. Если БД уже была развёрнута без `staff`/`teams`: `psql ... -f database/add-staff-teams.sql` (см. [COMMERCIAL_DB_CONTRACT.md](./docs/COMMERCIAL_DB_CONTRACT.md)).

```bash
pnpm dev
```

### S3 (фотокарточки и схемы планера)

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

Для уже существующей БД с BYTEA: `psql ... -f database/migrate-planner-files-to-s3.sql` (сносит текущие фото и схемы, без переливки).

## Настройка трекера и токенов

На инстанс — **один** провайдер. Дальше идите по своей ветке в **[ISSUE_TRACKERS.md](./docs/ISSUE_TRACKERS.md)** (там развилка A / B / C).

| Провайдер | Документация |
|-----------|----------------|
| Яндекс Трекер (`tracker`) | [Ветка A](./docs/ISSUE_TRACKERS.md#ветка-a--яндекс-трекер) — OAuth-приложение на oauth.yandex.ru + `YANDEX_OAUTH_CLIENT_ID` |
| Jira Cloud (`jira-cloud`) | [Ветка B](./docs/ISSUE_TRACKERS.md#ветка-b--jira-cloud) — email + API token |
| Jira DC/Server (`jira-onprem`) | [Ветка C](./docs/ISSUE_TRACKERS.md#ветка-c--jira-data-center--server) — PAT |

```bash
# Выберите один вариант и заполните URL:
ISSUE_TRACKER_PROVIDER=tracker
TRACKER_API_URL=https://api.tracker.yandex.net/v3
# Только для Яндекс Трекера — ClientID приложения с https://oauth.yandex.ru/
# (scopes tracker:read + tracker:write):
YANDEX_OAUTH_CLIENT_ID=

# ISSUE_TRACKER_PROVIDER=jira-cloud
# TRACKER_API_URL=https://your-site.atlassian.net/rest/api/3

# ISSUE_TRACKER_PROVIDER=jira-onprem
# TRACKER_API_URL=https://jira.example.com/rest/api/2
```

### Поля в админке организации

Зависят от провайдера (не из общего env): для **Yandex Tracker** — Cloud Organization ID; для **Jira** — параметры сайта/учётки. В запросах планера — `X-Organization-Id`.

### Серверный токен (опционально, fallback)

```bash
TRACKER_OAUTH_TOKEN=your_token_here
```

### Пользовательский токен (обязательно)

1. Откройте приложение → `/auth-setup` при первом входе
2. Получите токен по **своей** ветке (Yandex OAuth / Atlassian API token / Jira PAT)
3. Введите данные и продолжите

Без учётных данных трекера доступ к планеру невозможен. Детали API: [API_DOCUMENTATION.md](./docs/API_DOCUMENTATION.md).

## Документация

### Основные документы

- **[Обзор проекта](./docs/PROJECT_OVERVIEW.md)** — что это, для кого, функции и возможности
- **[Issue trackers](./docs/ISSUE_TRACKERS.md)** — Yandex Tracker и Jira на одном инстансе
- **[Возможности приложения](./docs/CAPABILITIES.md)** — расширенный список функций
- **[Индекс документации](./docs/DOCUMENTATION_INDEX.md)** — навигация по `docs/`
- **[API Документация](./docs/API_DOCUMENTATION.md)** — описание API
- **[Структура проекта](./docs/STRUCTURE.md)** — архитектура приложения

### Специализированные руководства

- **[Руководство по тестированию](./docs/AGENT_TESTING_GUIDE.md)**
- **[Руководство по иконкам](./docs/ICONS.md)**
- **[Product steering](./docs/steering/product.md)** — что в продукте и что не развивать
## Плановый инкрементальный sync (multi-tenant)

Внешний cron может вызывать `POST /api/internal/sync/tick` с заголовком `X-Sync-Cron-Secret: <SYNC_CRON_SECRET>` (или `Authorization: Bearer <secret>`). Поднимите Redis (`REDIS_URL`) и воркер `pnpm sync-worker`. В Docker Compose: `docker compose --profile exporter up` — сервис `sync-worker` собирается отдельным slim-образом (без Next.js). Без Redis ответ тика будет `200` с `reason: redis_not_configured` и без постановки job — удобно для CI.

## Основные команды

```bash
pnpm dev                 # разработка
pnpm build               # production-сборка Next.js
pnpm start               # запуск production-сборки
pnpm sync-worker         # BullMQ-воркер (нужен REDIS_URL)
pnpm sync-worker:build   # бандл в dist/sync-worker (Docker target sync-worker)
pnpm lint
pnpm typecheck
pnpm test
```

## CI (GitHub Actions)

В этом репозитории настроен workflow **CI** (`.github/workflows/ci.yml`): `pnpm lint`, `pnpm typecheck`, `pnpm test` на `push`/`pull_request` в основную ветку.

## Структура проекта

```
├── apps/sync-worker/    # отдельный процесс синхронизации (BullMQ)
├── app/                 # Next.js App Router (страницы и app/api/*)
├── components/          # Общие UI
├── features/            # Домены (sprint, backlog, burndown, …)
├── lib/                 # DB, snapshots, tracker API, sync, tenant, …
├── hooks/
├── database/            # init.sql (схема beer_tracker)
└── docs/
```

## Безопасность

- Пользовательские токены хранятся только в браузере (localStorage)
- Токены передаются через HTTPS
- Поддержка fallback на серверный токен
- Приоритет: пользовательский токен > серверный токен
- Сообщения об уязвимостях — [SECURITY.md](./SECURITY.md)

## Контрибьюция

1. Коммиты по [DCO](https://developercertificate.org/) — см. [CONTRIBUTING.md](./CONTRIBUTING.md) (`git commit -s`).
2. Изучите [API_DOCUMENTATION.md](./docs/API_DOCUMENTATION.md)
3. Следуйте структуре проекта и используйте TypeScript
4. Тестируйте изменения перед коммитом

## Лицензия

[Apache License 2.0](./LICENSE). Атрибуция — [NOTICE](./NOTICE).

## Поддержка

Начните с [DOCUMENTATION_INDEX.md](./docs/DOCUMENTATION_INDEX.md) и при необходимости с [API_DOCUMENTATION.md](./docs/API_DOCUMENTATION.md).
